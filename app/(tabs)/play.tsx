import Ionicons from "@expo/vector-icons/Ionicons";
import { MaterialIcons } from "@expo/vector-icons";
import {
  StyleSheet,
  Button,
  TextInput,
  View,
  TouchableOpacity,
  Text,
  KeyboardAvoidingView,
  Platform,
  ViewStyle,
  TextStyle,
} from "react-native";

import { Feather } from "@expo/vector-icons";

import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { TabBarIcon } from "@/components/navigation/TabBarIcon";
import { supabase } from "@/util/supabase";

import { useSession } from "@/context/SessionContext";
import { useEffect, useState } from "react";
import { QuestionContainer } from "@/components/QuestionContainer";

import { Question } from "@/types/supabase";

export default function TabTwoScreen() {
  const room = "room_1";
  const channel = supabase.channel(room);
  const GAME_STATE_CHANGE = "game_state_change";

  channel
    .on("broadcast", { event: GAME_STATE_CHANGE }, (event) => {
      console.log("game state change received", event);
      const {
        payload: { questions, currentQuestionIndex },
      } = event;
      setQuestions(questions);
      setCurrentQuestionIndex(currentQuestionIndex);
    })
    .subscribe();

  const { sessionId, handle } = useSession();
  const [userInput, setUserInput] = useState("");
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [strikes, setStrikes] = useState(0);

  const nextQuestion = () => {
    if (questions && currentQuestionIndex >= questions?.length - 1) {
      setCurrentQuestionIndex(0);
      channel.send({
        type: "broadcast",
        event: GAME_STATE_CHANGE,
        payload: { questions, currentQuestionIndex: 0 },
      });
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      channel.send({
        type: "broadcast",
        event: GAME_STATE_CHANGE,
        payload: { questions, currentQuestionIndex: currentQuestionIndex + 1 },
      });
    }
    setStrikes(0);
  };

  // Create a function to handle inserts
  // const handleInserts = (payload: any) => {
  //   console.log("Change received!", payload);
  // };

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
        channel.send({
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
    // const { data, error } = await supabase
    //   .from("room")
    //   .select("name, is_active");

    // const { data: insertData, error: insertError } = await supabase
    //   .from("room")
    //   .insert({ name: "Denmark", is_active: true });

    // console.log("INSERT", insertData, insertError);
    setUserInput("");
  };

  // Listen to inserts
  // supabase
  //   .channel("room-1")
  //   .on(
  //     "postgres_changes",
  //     { event: "INSERT", schema: "public", table: "room" },
  //     handleInserts
  //   )
  //   .subscribe();

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
      {/* <ThemedText>
        This app includes example code to help you get started.
      </ThemedText> */}
      {questions && currentQuestionIndex <= questions.length ? (
        <QuestionContainer question={questions[currentQuestionIndex]} />
      ) : (
        <ThemedText type="title">no more questions</ThemedText>
      )}

      {/* <TextInput
        style={styles.input}
        onChangeText={setUserInput}
        value={userInput}
        placeholder="Type here..."
        placeholderTextColor="#999"
      />
      <Button onPress={clickHandler} title="Submit" disabled={strikes > 2} />
      <Button onPress={nextQuestion} title="Next Question" /> */}
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
