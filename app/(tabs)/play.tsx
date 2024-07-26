import { MaterialIcons } from "@expo/vector-icons";
import {
  AppState,
  StyleSheet,
  TextInput,
  View,
  TouchableOpacity,
  Text,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";

import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { supabase } from "@/util/supabase";

import { useSession } from "@/context/SessionContext";
import { useEffect, useState, useRef } from "react";
import { QuestionContainer } from "@/components/QuestionContainer";

import { Question } from "@/types/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useBeforeUnload } from "@/hooks/useBeforeUnload";
import { scores } from "@/constants/Scores";

export default function TabTwoScreen() {
  const { handle } = useSession();
  const [userInput, setUserInput] = useState("");
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const roomName = "game_room";
  const GAME_STATE_CHANGE = "game_state_change";
  const [room, setRoom] = useState<RealtimeChannel | null>(null);
  const [gameStateId, setGameStateId] = useState(0);
  const [shouldCloseRoom, setShouldCloseRoom] = useState(false);
  const shouldCloseRoomRef = useRef(shouldCloseRoom);
  const gameStateIdRef = useRef(gameStateId);
  const [score, setScore] = useState(0);

  console.log("game id", gameStateId);
  const appState = useRef(AppState.currentState);
  console.log("App state", appState);

  useEffect(() => {
    shouldCloseRoomRef.current = shouldCloseRoom;
  }, [shouldCloseRoom]);

  useEffect(() => {
    gameStateIdRef.current = gameStateId;
  }, [gameStateId]);

  useBeforeUnload(async () => {
    console.log("CLOSE?", shouldCloseRoomRef.current);
    if (shouldCloseRoomRef.current) {
      await upsertGameState(questions, currentQuestionIndex, false);
    }
  });

  const upsertGameState = async (
    questions: Question[] | null,
    currentQuestionIndex: number,
    isActive: boolean
  ) => {
    // close the room
    if (!isActive) {
      await supabase
        .from("game_state")
        .update({
          is_active: isActive,
        })
        .eq("id", gameStateIdRef.current);
    }

    if (gameStateId) {
      const resp = await supabase
        .from("game_state")
        .update({
          state: questions,
          current_question_index: currentQuestionIndex,
          is_active: isActive,
        })
        .eq("id", gameStateIdRef.current);
      console.log("RESP", resp);
    } else {
      const resp = await supabase
        .from("game_state")
        .insert({
          state: questions,
          current_question_index: currentQuestionIndex,
          room_name: roomName,
          is_active: isActive,
        })
        .select();

      if (resp.data) {
        setGameStateId(resp.data[0].id);
      }
    }
  };

  useEffect(() => {
    const getExistingState = async () => {
      const gameState = await supabase
        .from("game_state")
        .select("*")
        .eq("room_name", roomName)
        .eq("is_active", true)
        .limit(1);

      if (gameState?.data?.length) {
        const [currentState] = gameState.data;
        setGameStateId(currentState.id);
        setQuestions(currentState.state);
        setCurrentQuestionIndex(currentState.current_question_index);
      } else {
        const questionsWithAnswers = await supabase
          .from("question")
          .select(
            `
      id,
      title,
      dataset_title,
      dataset_link,
      answer (
        id,
        title,
        rank,
        question_id
      )
    `
          )
          .order("id");
        if (questionsWithAnswers.data?.length) {
          setQuestions(
            questionsWithAnswers.data.map((q) => {
              return {
                ...q,
                answer: q.answer.map((a) => {
                  return { ...a, is_revealed: false };
                }),
              };
            })
          );
        }
      }
    };

    getExistingState();
  }, []);

  useEffect(() => {
    if (!room && handle) {
      const newRoom = supabase.channel(roomName);
      setRoom(newRoom);

      newRoom
        .on("broadcast", { event: GAME_STATE_CHANGE }, (event) => {
          const {
            payload: { questions, currentQuestionIndex },
          } = event;
          setQuestions(questions);
          setCurrentQuestionIndex(currentQuestionIndex);
        })
        .on("presence", { event: "join" }, ({ key, newPresences }) => {
          console.log("join", key, newPresences);

          const presenceState = newRoom.presenceState();
          const userCount = Object.keys(presenceState).length;

          if (userCount === 1) {
            setShouldCloseRoom(true);
          } else {
            setShouldCloseRoom(false);
          }

          console.log("Current user count:", userCount);
        })
        .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
          console.log("leave", key, leftPresences);

          const presenceState = newRoom.presenceState();
          const userCount = Object.keys(presenceState).length;

          console.log("Current user count:", userCount);

          if (userCount <= 2) {
            setShouldCloseRoom(true);
          }

          if (userCount === 0) {
            console.log("The room is now empty!");
            upsertGameState(questions, currentQuestionIndex, false);
          }
        })
        .subscribe(async (status) => {
          const userStatus = {
            handle,
            online_at: new Date().toISOString(),
          };
          if (status !== "SUBSCRIBED") {
            return;
          }

          await newRoom.track(userStatus);
        });
    }
  });

  const nextQuestion = () => {
    const nextIndex =
      questions && currentQuestionIndex >= questions?.length - 1
        ? 0
        : currentQuestionIndex + 1;
    setCurrentQuestionIndex(nextIndex);
    room?.send({
      type: "broadcast",
      event: GAME_STATE_CHANGE,
      payload: { questions, currentQuestionIndex: nextIndex },
    });
    setStrikes(0);
    upsertGameState(questions, nextIndex, true);
  };

  const checkResponse = (input: string) => {
    let isCorrect = false;
    if (!questions) return isCorrect;
    questions[currentQuestionIndex]?.answer.forEach((a) => {
      if (a.title.toLowerCase() === input.toLowerCase()) {
        isCorrect = true;
        const updatedQuestions = questions.map((q) => {
          return {
            ...q,
            answer: q.answer.map((innerA) => {
              if (innerA.id === a.id) {
                setScore(score + scores[`${a.rank}`]);
              }
              return {
                ...innerA,
                is_revealed: innerA.id === a.id ? true : innerA.is_revealed,
                reveal_text:
                  innerA.id === a.id
                    ? `Guessed by Anonymous ${handle} (+${scores[`${a.rank}`]})`
                    : innerA.reveal_text,
              };
            }),
          };
        });
        setQuestions(updatedQuestions);
        room?.send({
          type: "broadcast",
          event: GAME_STATE_CHANGE,
          payload: { questions: updatedQuestions, currentQuestionIndex },
        });
      }
    });
    upsertGameState(questions, currentQuestionIndex, true);
    return isCorrect;
  };

  const clickHandler = async () => {
    const isCorrect = checkResponse(userInput);
    if (!isCorrect) {
      setStrikes(strikes + 1);
    }
    setUserInput("");
  };

  if (!questions || !handle) {
    return <ActivityIndicator size="large" style={{ marginTop: 20 }} />;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.headerView}>
        <ThemedText
          type="title"
          style={styles.text}
        >{`Welcome, Anonymous ${handle}.`}</ThemedText>
        <ThemedText
          type="title"
          style={styles.text}
        >{`Score: ${score}`}</ThemedText>
      </View>
      <View style={styles.strikes}>
        <Feather
          name="x-octagon"
          size={40}
          color={strikes > 0 ? "red" : "gray"}
        />
        <Feather
          name="x-octagon"
          size={40}
          color={strikes > 1 ? "red" : "gray"}
        />
        <Feather
          name="x-octagon"
          size={40}
          color={strikes > 2 ? "red" : "gray"}
        />
      </View>
      {questions && currentQuestionIndex <= questions.length ? (
        <QuestionContainer question={questions[currentQuestionIndex]} />
      ) : (
        <ThemedText type="title">no more questions</ThemedText>
      )}
      <View style={styles.toolbar}>
        <TextInput
          style={styles.input}
          value={userInput}
          onChangeText={setUserInput}
          placeholder="Enter guess"
        />
        <TouchableOpacity
          style={styles.button}
          onPress={clickHandler}
          disabled={strikes > 2}
        >
          <Text style={styles.buttonText}>Submit</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={nextQuestion}>
          <MaterialIcons name="navigate-next" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: "#808080",
    bottom: -90,
    left: -35,
    position: "absolute",
  },
  titleContainer: {
    flexDirection: "row",
    gap: 8,
  },
  // input: {
  //   height: 40,
  //   borderColor: "gray",
  //   borderWidth: 1,
  //   borderRadius: 5,
  //   paddingHorizontal: 10,
  //   fontSize: 16,
  // },
  strikes: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-around",
    margin: 5,
  },
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  toolbar: {
    flexDirection: "row",
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#ccc",
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    marginRight: 10,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 10,
    borderRadius: 5,
    justifyContent: "center",
    marginRight: 5,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  text: {
    margin: 10,
    fontSize: 22,
    marginTop: 25,
  },
  nextButton: {
    backgroundColor: "#007AFF",
    padding: 10,
    borderRadius: 5,
    justifyContent: "center",
    marginRight: 5,
  },
  headerView: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
