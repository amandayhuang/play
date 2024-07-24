import { Question, Answer } from "@/types/supabase";
import { ThemedText } from "./ThemedText";
import {
  FlatList,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  Button,
} from "react-native";

type QuestionProps = {
  question: Question;
};

type ItemProps = {
  item: Answer;
  onPress: () => void;
  backgroundColor: string;
  textColor: string;
};

const Item = ({ item, onPress, backgroundColor, textColor }: ItemProps) => (
  <TouchableOpacity style={[styles.item, { backgroundColor }]}>
    <Text style={[styles.title, { color: textColor }]}>
      {item.is_revealed ? item.title : `${item.rank}`}
    </Text>
    <Text style={[styles.subtitle, { marginLeft: 0 }]}>
      {item.is_revealed ? item.reveal_text : ``}
    </Text>
  </TouchableOpacity>
);

export const QuestionContainer = ({ question }: QuestionProps) => {
  // const [selectedId, setSelectedId] = useState<number>();
  const renderItem = ({ item }: { item: Answer }) => {
    const backgroundColor = "#f9c2ff";
    const color = "black";

    return (
      <Item
        item={item}
        onPress={() => console.log("PRESS")}
        backgroundColor={backgroundColor}
        textColor={color}
      />
    );
  };

  return (
    <>
      <ThemedText type="title" style={styles.text}>
        {question.title}
      </ThemedText>
      <Text style={styles.subtitle}>{`(via ${question.dataset_title})`}</Text>
      <SafeAreaView style={styles.container}>
        <FlatList
          data={question.answer}
          renderItem={renderItem}
          keyExtractor={(item) => item.title}
          // extraData={selectedId}
        />
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: StatusBar.currentHeight || 0,
  },
  item: {
    padding: 20,
    marginVertical: 8,
    marginHorizontal: 16,
  },
  title: {
    fontSize: 32,
  },
  text: {
    margin: 10,
    fontSize: 30,
  },
  subtitle: {
    color: "gray",
    fontSize: 13,
    marginLeft: 15,
  },
});
