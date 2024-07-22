import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Button, TextInput, View } from "react-native";
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
  const channel = supabase.channel("room_1");
  const USER_EVENT = "submit";

  channel
    .on("broadcast", { event: USER_EVENT }, (event) => {
      console.log("user event received", event);
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
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
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
        setQuestions(
          questions.map((q) => {
            return {
              ...q,
              answer: q.answer.map((innerA) => {
                return {
                  ...innerA,
                  is_revealed: innerA.id === a.id ? true : innerA.is_revealed,
                };
              }),
            };
          })
        );
        return isCorrect;
      }
    });
    setStrikes(strikes + 1);
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
    checkResponse(userInput);
    channel.send({
      type: "broadcast",
      event: USER_EVENT,
      payload: { sessionId, handle, userInput },
    });
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
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#D0D0D0", dark: "#353636" }}
      headerImage={
        <Ionicons size={310} name="code-slash" style={styles.headerImage} />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">{`Welcome, Anonymous ${handle}.`}</ThemedText>
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

      <TextInput
        style={styles.input}
        onChangeText={setUserInput}
        value={userInput}
        placeholder="Type here..."
        placeholderTextColor="#999"
      />
      <Button onPress={clickHandler} title="Submit" disabled={strikes > 2} />
      <Button onPress={nextQuestion} title="Next Question" />
    </ParallaxScrollView>
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
  input: {
    height: 40,
    borderColor: "gray",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    fontSize: 16,
  },
  strikes: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-around",
  },
});
