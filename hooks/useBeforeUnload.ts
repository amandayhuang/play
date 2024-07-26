import { useEffect } from "react";
import { Platform, AppState } from "react-native";

export const useBeforeUnload = (callback: () => Promise<void> | void) => {
  useEffect(() => {
    if (Platform.OS === "web") {
      // Web browser environment
      const handleBeforeUnload = async (event: BeforeUnloadEvent) => {
        event.preventDefault();
        await callback();
      };

      window.addEventListener("beforeunload", handleBeforeUnload);

      return () => {
        window.removeEventListener("beforeunload", handleBeforeUnload);
      };
    } else {
      // React Native environment
      const handleAppStateChange = async (nextAppState: string) => {
        if (nextAppState === "inactive" || nextAppState === "background") {
          await callback();
        }
      };

      const subscription = AppState.addEventListener(
        "change",
        handleAppStateChange
      );

      return () => {
        subscription.remove();
      };
    }
  }, [callback]);
};
