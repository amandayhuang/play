import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";

type Props = {
  seconds: number;
  setSeconds: React.Dispatch<React.SetStateAction<number>>;
};

export const Countdown = ({ seconds, setSeconds }: Props) => {
  useEffect(() => {
    if (seconds > 0) {
      const timerId = setInterval(() => {
        setSeconds((prevSeconds) => prevSeconds - 1);
      }, 1000);

      return () => clearInterval(timerId);
    }
  }, [seconds]);

  return seconds > 0 ? (
    <View style={styles.container}>
      <Text style={styles.timerText}>{seconds}s</Text>
    </View>
  ) : (
    <View style={styles.container}>
      <Text style={styles.timerTextExpired}>Time's up!</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  timerText: {
    fontSize: 35,
    fontWeight: "bold",
    color: "white",
  },
  timerTextExpired: {
    color: "red",
    fontSize: 20,
  },
});
