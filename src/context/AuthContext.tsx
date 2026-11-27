import { Session, User } from "@supabase/supabase-js";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { translateError } from "../i18n/errors";
import { api } from "../services/api";
import { supabase } from "../services/supabase";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  signup: (input: SignupInput) => Promise<SignupResult>;
  logout: () => Promise<void>;
};

export type SignupInput = { firstName: string; lastName: string; email: string; phone: string; phonePublic: boolean; password: string };
export type SignupResult = { username: string | null; needsConfirmation: boolean };

type Tokens = { access_token: string; refresh_token: string };

const AuthContext = createContext<AuthContextType>(null!);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch((e) => console.warn("getSession failed:", e))
      .finally(() => setLoading(false));
  
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
  
    return () => listener.subscription.unsubscribe();
  }, []);

  const login = async (identifier: string, password: string) => {
    if (identifier.includes("@")) {
      const { error } = await supabase.auth.signInWithPassword({ email: identifier, password });
      if (error) throw new Error(translateError(error.message));
      return;
    }
    const tokens = await api.post<Tokens>("/api/auth/login", { identifier, password });
    const { error } = await supabase.auth.setSession(tokens);
    if (error) throw error;
  };

  const signup = async ({ firstName, lastName, email, phone, phonePublic, password }: SignupInput): Promise<SignupResult> => {
    const res = await api.post<Partial<Tokens> & { username: string | null; needs_confirmation?: boolean }>("/api/auth/signup", {
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      public: phonePublic,
      password,
    });
    if (res.access_token && res.refresh_token) {
      const { error } = await supabase.auth.setSession({ access_token: res.access_token, refresh_token: res.refresh_token });
      if (error) throw error;
    }
    return { username: res.username, needsConfirmation: !!res.needs_confirmation };
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{ user: session?.user ?? null, session, loading, login, signup, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}