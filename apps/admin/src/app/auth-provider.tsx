import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type Dispatch, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import type { AdminPermission, AdminProfile } from "@auto-fb/shared";
import { ApiClientError, api } from "../lib/api-client.js";
import { getSupabaseClient, isSupabaseConfigured, missingSupabaseEnv, setCurrentAuthSession } from "../lib/supabase.js";

type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "unconfigured" | "blocked";

type AuthState = {
  error?: string;
  profile: AdminProfile | null;
  session: Session | null;
  status: AuthStatus;
  user: User | null;
};

type SignInInput = {
  email: string;
  password: string;
};

type AuthContextValue = AuthState & {
  hasPermission: (permission: AdminPermission) => boolean;
  signIn: (input: SignInInput) => Promise<void>;
  signOut: () => Promise<void>;
};

type AuthAction =
  | { session: Session | null; type: "sessionChanged" }
  | { session: Session; type: "sessionLoading" }
  | { profile: AdminProfile; session: Session; type: "profileLoaded" }
  | { message: string; session: Session; type: "accessDenied" }
  | { message: string; type: "authFailed" }
  | { message: string; type: "unconfigured" }
  | { message: string; type: "localError" };

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const initialState: AuthState = {
  profile: null,
  session: null,
  status: "loading",
  user: null
};

function stateFromSession(session: Session | null): AuthState {
  return {
    profile: null,
    session,
    status: session ? "authenticated" : "unauthenticated",
    user: session?.user ?? null
  };
}

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "sessionChanged":
      return stateFromSession(action.session);
    case "sessionLoading":
      return {
        error: undefined,
        profile: null,
        session: action.session,
        status: "loading",
        user: action.session.user
      };
    case "profileLoaded":
      return {
        error: undefined,
        profile: action.profile,
        session: action.session,
        status: "authenticated",
        user: action.session.user
      };
    case "accessDenied":
      return {
        error: action.message,
        profile: null,
        session: action.session,
        status: "blocked",
        user: action.session.user
      };
    case "authFailed":
      return {
        error: action.message,
        profile: null,
        session: null,
        status: "unauthenticated",
        user: null
      };
    case "unconfigured":
      return {
        error: action.message,
        profile: null,
        session: null,
        status: "unconfigured",
        user: null
      };
    case "localError":
      return { ...state, error: action.message };
  }
}

async function applySession(dispatch: Dispatch<AuthAction>, session: Session | null, isActive = () => true) {
  setCurrentAuthSession(session);
  if (!session) {
    if (isActive()) {
      dispatch({ session, type: "sessionChanged" });
    }
    return;
  }

  if (isActive()) {
    dispatch({ session, type: "sessionLoading" });
  }

  try {
    const profile = await api.me();
    if (isActive()) {
      dispatch({ profile, session, type: "profileLoaded" });
    }
  } catch (error) {
    if (!isActive()) {
      return;
    }

    if (error instanceof ApiClientError && error.status === 401) {
      applyAuthFailure(dispatch, error.message);
      return;
    }

    dispatch({
      message: error instanceof Error ? error.message : "Access not granted",
      session,
      type: "accessDenied"
    });
  }
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

        void applySession(dispatch, data.session, () => active);
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
        void applySession(dispatch, session, () => active);
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

    await applySession(dispatch, data.session);
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });

    if (error) {
      dispatch({ message: error.message, type: "localError" });
      throw error;
    }

    await applySession(dispatch, null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...authState,
      hasPermission: (permission) => authState.profile?.permissions.includes(permission) ?? false,
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
