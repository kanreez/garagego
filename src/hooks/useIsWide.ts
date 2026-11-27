import { useWindowDimensions } from "react-native";

const WIDE_MIN_WIDTH = 1024;

export function useIsWide() {
  return useWindowDimensions().width >= WIDE_MIN_WIDTH;
}
