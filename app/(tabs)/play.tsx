import { MaterialIcons } from "@expo/vector-icons";
import {
  StyleSheet,
  TextInput,
  View,
  TouchableOpacity,
  Text,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { TabBarIcon } from "@/components/navigation/TabBarIcon";
import { supabase } from "@/util/supabase";

import { useSession } from "@/context/SessionContext";
import { useEffect, useState } from "react";
import { QuestionContainer } from "@/components/QuestionContainer";

import { Question } from "@/types/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

export default function TabTwoScreen() {
  const { sessionId, handle } = useSession();
  const [userInput, setUserInput] = useState("");
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const roomName = "room_1";
  const GAME_STATE_CHANGE = "game_state_change";
  const [room, setRoom] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!room && sessionId) {
      const newRoom = supabase.channel(roomName);
      setRoom(newRoom);

      newRoom
        .on("broadcast", { event: GAME_STATE_CHANGE }, (event) => {
          console.log("game state change received", event);
          const {
            payload: { questions, currentQuestionIndex },
          } = event;
          setQuestions(questions);
          setCurrentQuestionIndex(currentQuestionIndex);
        })
        .on("presence", { event: "join" }, ({ key, newPresences }) => {
          console.log("join", key, newPresences);
        })
        .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
          console.log("leave", key, leftPresences);
        })
        .subscribe(async (status) => {
          const userStatus = {
            sessionId,
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
    if (questions && currentQuestionIndex >= questions?.length - 1) {
      setCurrentQuestionIndex(0);
      room?.send({
        type: "broadcast",
        event: GAME_STATE_CHANGE,
        payload: { questions, currentQuestionIndex: 0 },
      });
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      room?.send({
        type: "broadcast",
        event: GAME_STATE_CHANGE,
        payload: { questions, currentQuestionIndex: currentQuestionIndex + 1 },
      });
    }
    setStrikes(0);
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
              return {
                ...innerA,
                is_revealed: innerA.id === a.id ? true : innerA.is_revealed,
                reveal_text:
                  innerA.id === a.id
                    ? `Guessed by Anonymous ${handle}`
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
    return isCorrect;
  };

  useEffect(() => {
    const getQuestions = async () => {
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
    };

    if (!questions) {
      getQuestions();
    }
  });

  const clickHandler = async () => {
    const isCorrect = checkResponse(userInput);
    if (!isCorrect) {
      setStrikes(strikes + 1);
    }
    setUserInput("");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText
          type="title"
          style={styles.text}
        >{`Welcome, Anonymous ${handle}.`}</ThemedText>
      </ThemedView>
      <View style={styles.strikes}>
        <Feather
          name="x-octagon"
          size={60}
          color={strikes > 0 ? "red" : "gray"}
        />
        <Feather
          name="x-octagon"
          size={60}
          color={strikes > 1 ? "red" : "gray"}
        />
        <Feather
          name="x-octagon"
          size={60}
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
        <TouchableOpacity style={styles.button} onPress={clickHandler}>
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
    margin: 10,
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
    fontSize: 26,
  },
  nextButton: {
    backgroundColor: "#007AFF",
    padding: 10,
    borderRadius: 5,
    justifyContent: "center",
    marginRight: 5,
  },
});
