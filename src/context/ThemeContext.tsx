import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, Fragment, ReactNode, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import { applyScheme, Scheme } from "../constants/theme";

export type ThemePref = "system" | "light" | "dark";

const STORAGE_KEY = "garagego.theme";

type ThemeContextType = { pref: ThemePref; scheme: Scheme; setPref: (pref: ThemePref) => void };
const ThemeContext = createContext<ThemeContextType>({ pref: "system", scheme: "light", setPref: () => {} });

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme() === "dark" ? "dark" : "light";
  const [pref, setPrefState] = useState<ThemePref | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved): ThemePref => (saved === "light" || saved === "dark" || saved === "system" ? saved : "system"))
      .catch((): ThemePref => "system")
      .then(setPrefState);
  }, []);

  if (!pref) return null;

  const scheme: Scheme = pref === "system" ? system : pref;
  applyScheme(scheme);

  const setPref = (next: ThemePref) => {
    setPrefState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  };

  return (
    <ThemeContext.Provider value={{ pref, scheme, setPref }}>
      <Fragment key={scheme}>{children}</Fragment>
    </ThemeContext.Provider>
  );
}
