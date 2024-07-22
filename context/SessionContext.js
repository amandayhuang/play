// SessionContext.js
import React, { createContext, useState, useContext, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { vegetables } from "@/constants/Vegetables";

const SessionContext = createContext();

export const SessionProvider = ({ children }) => {
  const [sessionId, setSessionId] = useState(null);
  const [handle, setHandle] = useState(null);

  useEffect(() => {
    const initializeSession = async () => {
      try {
        setHandle(vegetables[Math.floor(Math.random() * vegetables.length)]);
        // Try to get existing session ID from storage
        let storedSessionId = await AsyncStorage.getItem("sessionId");

        if (!storedSessionId) {
          // If no existing session, create a new one
          storedSessionId = uuidv4();
          await AsyncStorage.setItem("sessionId", storedSessionId);
        }

        setSessionId(storedSessionId);
      } catch (error) {
        console.error("Failed to initialize session:", error);
      }
    };

    initializeSession();
  }, []);

  return (
    <SessionContext.Provider value={{ sessionId, handle }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => useContext(SessionContext);
