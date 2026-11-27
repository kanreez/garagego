import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { bg } from "./bg";
import { en } from "./en";

export type Lang = "bg" | "en";
export type TKey = keyof typeof en;

export const LANGS: { value: Lang; label: string }[] = [
  { value: "bg", label: "Български" },
  { value: "en", label: "English" },
];

const DICTS: Record<Lang, Record<TKey, string>> = { bg, en };
const STORAGE_KEY = "garagego.lang";
const DEFAULT_LANG: Lang = "bg";

let current: Lang = DEFAULT_LANG;
export const getLang = () => current;

type Params = Record<string, string | number>;

export function t(key: TKey, params?: Params): string {
  let s = DICTS[current][key] ?? en[key] ?? key;
  if (params) for (const [k, v] of Object.entries(params)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

export function tn(base: string, n: number, params?: Params): string {
  return t(`${base}.${n === 1 ? "one" : "other"}` as TKey, { n, ...params });
}

type LanguageContextType = { lang: Lang; setLang: (lang: Lang) => void };
const LanguageContext = createContext<LanguageContextType>({ lang: DEFAULT_LANG, setLang: () => {} });

export const useLanguage = () => useContext(LanguageContext);

export function useT() {
  const { lang } = useLanguage();
  return { t, tn, lang };
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => (saved === "bg" || saved === "en" ? saved : DEFAULT_LANG))
      .catch(() => DEFAULT_LANG)
      .then((l) => {
        current = l;
        setLangState(l);
      });
  }, []);

  const setLang = (l: Lang) => {
    current = l;
    setLangState(l);
    AsyncStorage.setItem(STORAGE_KEY, l).catch(() => {});
  };

  if (!lang) return null;
  return <LanguageContext.Provider value={{ lang, setLang }}>{children}</LanguageContext.Provider>;
}
