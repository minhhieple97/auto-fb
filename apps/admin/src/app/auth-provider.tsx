import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type Dispatch, type ReactNode } from "react";
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

type AuthAction =
  | { session: Session | null; type: "sessionChanged" }
  | { message: string; type: "authFailed" }
  | { message: string; type: "unconfigured" }
  | { message: string; type: "localError" };

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const initialState: AuthState = {
  session: null,
  status: "loading",
  user: null
};

function stateFromSession(session: Session | null): AuthState {
  return {
    session,
    status: session ? "authenticated" : "unauthenticated",
    user: session?.user ?? null
  };
}

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "sessionChanged":
      return stateFromSession(action.session);
    case "authFailed":
      return {
        error: action.message,
        session: null,
        status: "unauthenticated",
        user: null
      };
    case "unconfigured":
      return {
        error: action.message,
        session: null,
        status: "unconfigured",
        user: null
      };
    case "localError":
      return { ...state, error: action.message };
  }
}

function applySession(dispatch: Dispatch<AuthAction>, session: Session | null) {
  setCurrentAuthSession(session);
  dispatch({ session, type: "sessionChanged" });
}

function applyAuthFailure(dispatch: Dispatch<AuthAction>, message: string) {
  setCurrentAuthSession(null);
  dispatch({ message, type: "authFailed" });
}

function applyUnconfigured(dispatch: Dispatch<AuthAction>) {
  setCurrentAuthSession(null);
  dispatch({ message: `Missing ${missingSupabaseEnv.join(" and ")}`, type: "unconfigured" });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      applyUnconfigured(dispatch);
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
          applyAuthFailure(dispatch, error.message);
          return;
        }

        applySession(dispatch, data.session);
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        applyAuthFailure(dispatch, error instanceof Error ? error.message : "Unable to load Supabase session");
      });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) {
        applySession(dispatch, session);
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
      applyAuthFailure(dispatch, error.message);
      throw error;
    }

    applySession(dispatch, data.session);
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });

    if (error) {
      dispatch({ message: error.message, type: "localError" });
      throw error;
    }

    applySession(dispatch, null);
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
