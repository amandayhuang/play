// SessionContext.js
import React, { createContext, useState, useContext, useEffect } from "react";
import { vegetables } from "@/constants/Vegetables";

const SessionContext = createContext();

export const SessionProvider = ({ children }) => {
  const [handle, setHandle] = useState(null);

  useEffect(() => {
    const initializeSession = async () => {
      try {
        setHandle(vegetables[Math.floor(Math.random() * vegetables.length)]);
      } catch (error) {
        console.error("Failed to initialize session:", error);
      }
    };

    initializeSession();
  }, []);

  return (
    <SessionContext.Provider value={{ handle }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => useContext(SessionContext);
