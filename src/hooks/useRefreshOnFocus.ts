import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef } from "react";

export function useRefreshOnFocus(refresh: () => void) {
  const first = useRef(true);
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  });

  useFocusEffect(
    useCallback(() => {
      if (first.current) {
        first.current = false;
        return;
      }
      refreshRef.current();
    }, [])
  );
}
