import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseClient, isSupabaseConfigured, missingSupabaseEnv, setCurrentAuthSession } from "../lib/supabase.js";

type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "unconfigured";

type AuthState = {
  error?: string;
  session: Session | null;
  status: AuthStatus;
  user: User | null;
};

type SignInInput = {
  email: string;
  password: string;
};

type AuthContextValue = AuthState & {
  signIn: (input: SignInInput) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const initialState: AuthState = {
  session: null,
  status: "loading",
  user: null
};

function stateFromSession(session: Session | null): AuthState {
  setCurrentAuthSession(session);

  return {
    session,
    status: session ? "authenticated" : "unauthenticated",
    user: session?.user ?? null
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(initialState);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setCurrentAuthSession(null);
      setAuthState({
        error: `Missing ${missingSupabaseEnv.join(" and ")}`,
        session: null,
        status: "unconfigured",
        user: null
      });
      return;
    }

    let active = true;
    const supabase = getSupabaseClient();

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) {
          return;
        }

        if (error) {
          setCurrentAuthSession(null);
          setAuthState({
            error: error.message,
            session: null,
            status: "unauthenticated",
            user: null
          });
          return;
        }

        setAuthState(stateFromSession(data.session));
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        setCurrentAuthSession(null);
        setAuthState({
          error: error instanceof Error ? error.message : "Unable to load Supabase session",
          session: null,
          status: "unauthenticated",
          user: null
        });
      });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) {
        setAuthState(stateFromSession(session));
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async ({ email, password }: SignInInput) => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setCurrentAuthSession(null);
      setAuthState({
        error: error.message,
        session: null,
        status: "unauthenticated",
        user: null
      });
      throw error;
    }

    setAuthState(stateFromSession(data.session));
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });

    if (error) {
      setAuthState((state) => ({ ...state, error: error.message }));
      throw error;
    }

    setAuthState(stateFromSession(null));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...authState,
      signIn,
      signOut
    }),
    [authState, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const auth = useContext(AuthContext);

  if (!auth) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return auth;
}
