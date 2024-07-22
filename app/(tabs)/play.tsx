import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Button } from "react-native";

import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { supabase } from "@/util/supabase";

import { useSession } from "@/context/SessionContext";
import { useEffect, useState } from "react";
import { QuestionContainer } from "@/components/QuestionContainer";

export default function TabTwoScreen() {
  const { sessionId, handle } = useSession();
  const [questions, setQuestions] = useState<any[] | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  console.log("Q", questions);

  // Create a function to handle inserts
  const handleInserts = (payload: any) => {
    console.log("Change received!", payload);
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
        rank
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
    const { data, error } = await supabase
      .from("room")
      .select("name, is_active");

    console.log("DATA", data);
    console.log("ERROR", error);

    // const { data: insertData, error: insertError } = await supabase
    //   .from("room")
    //   .insert({ name: "Denmark", is_active: true });

    // console.log("INSERT", insertData, insertError);
  };

  // Listen to inserts
  supabase
    .channel("room-1")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "room" },
      handleInserts
    )
    .subscribe();

  supabase
    .channel("room-1")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "user_session" },
      handleInserts
    )
    .subscribe();

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#D0D0D0", dark: "#353636" }}
      headerImage={
        <Ionicons size={310} name="code-slash" style={styles.headerImage} />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">{`Welcome, Anonymous ${handle}!`}</ThemedText>
      </ThemedView>
      {/* <ThemedText>
        This app includes example code to help you get started.
      </ThemedText> */}
      {questions && currentQuestionIndex <= questions.length ? (
        <QuestionContainer question={questions[currentQuestionIndex]} />
      ) : (
        <ThemedText type="title">no more questions</ThemedText>
      )}
      <Button onPress={() => clickHandler()} title="CLICK ME" />
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
});
