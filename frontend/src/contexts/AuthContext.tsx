import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { apiRequest } from "@/lib/apiClient";

type AppRole = "patient" | "medic";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, role: AppRole) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

type AuthContextStore = {
  AuthContext?: ReturnType<typeof createContext<AuthContextType | undefined>>;
  warned?: boolean;
};

const globalStore = globalThis as typeof globalThis & { __EHID_AUTH_CTX__?: AuthContextStore };
globalStore.__EHID_AUTH_CTX__ = globalStore.__EHID_AUTH_CTX__ || {};

const AuthContext =
  globalStore.__EHID_AUTH_CTX__.AuthContext || createContext<AuthContextType | undefined>(undefined);

globalStore.__EHID_AUTH_CTX__.AuthContext = AuthContext;

const FALLBACK_AUTH_CONTEXT: AuthContextType = {
  session: null,
  user: null,
  role: null,
  loading: false,
  signUp: async () => {
    throw new Error("Auth provider not ready");
  },
  signIn: async () => {
    throw new Error("Auth provider not ready");
  },
  signOut: async () => {
    throw new Error("Auth provider not ready");
  },
};

const SIGN_IN_TIMEOUT_MS = 12000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const logAuth = (...args: any[]) => {
    console.log("[AUTH]", ...args);
  };

  const ensureProfileAndRole = async (currentUser: User, preferredRole?: AppRole) => {
    logAuth("ensureProfileAndRole:start", { userId: currentUser.id, preferredRole });
    const fullName = currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || "";
    const email = currentUser.email;
    if (!email) {
      logAuth("ensureProfileAndRole:no-email -> fallback patient");
      setRole("patient");
      return;
    }

    try {
      await apiRequest("/api/profiles", {
        method: "POST",
        body: JSON.stringify({
          authId: currentUser.id,
          email,
          fullName,
        }),
      });
      logAuth("profile ensured");

      if (preferredRole === "medic") {
        await apiRequest(`/api/profiles/${currentUser.id}`, {
          method: "PATCH",
          body: JSON.stringify({ role: "medic" }),
        });
        logAuth("preferred medic role requested");
      }

      let profileResponse: any;
      try {
        profileResponse = await apiRequest(`/api/profiles/${currentUser.id}`);
      } catch (error) {
        logAuth("profile fetch failed -> fallback patient", error);
        setRole("patient");
        return;
      }

      const resolvedRole = (profileResponse?.data?.role || "patient") as AppRole;
      setRole(resolvedRole);
      logAuth("role resolved", resolvedRole);
    } catch (error) {
      // Never leave role unresolved on API failures.
      logAuth("ensureProfileAndRole:error -> fallback patient", error);
      setRole("patient");
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        logAuth("onAuthStateChange", _event, { hasSession: !!session, userId: session?.user?.id });
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Never block UI on backend profile bootstrap; fallback to patient while resolving.
          setRole((prev) => prev || "patient");
          setLoading(false);
          ensureProfileAndRole(session.user).catch((error) => {
            logAuth("onAuthStateChange:background-ensure:error", error);
          });
        } else {
          setRole(null);
          setLoading(false);
        }
      }
    );

    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        logAuth("getSession:init", { hasSession: !!session, userId: session?.user?.id });
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setRole((prev) => prev || "patient");
          setLoading(false);
          ensureProfileAndRole(session.user).catch((error) => {
            logAuth("getSession:background-ensure:error", error);
          });
        } else {
          setRole(null);
          setLoading(false);
        }
      })
      .catch((error) => {
        logAuth("getSession:unexpected-error", error);
        setRole(null);
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string, role: AppRole) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) throw error;

    if (data.user) {
      await ensureProfileAndRole(data.user, role);
    }
  };

  const signIn = async (email: string, password: string) => {
    logAuth("signIn:start", { email });
    const signInPromise = supabase.auth.signInWithPassword({ email, password });
    const timeoutPromise = new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error(`Sign in timeout after ${SIGN_IN_TIMEOUT_MS}ms`)), SIGN_IN_TIMEOUT_MS);
    });

    const { data, error } = await Promise.race([signInPromise, timeoutPromise]);
    if (error) {
      logAuth("signIn:auth-failed", { email, error: error.message });
      throw error;
    }

    logAuth("signIn:supabase-success", { email, userId: data?.user?.id });

    const signInUser = data?.user;
    if (!signInUser?.id) {
      logAuth("signIn:no-user-id-returned");
      throw new Error("No user returned from sign in");
    }

    // Ensure Mongo profile exists (non-blocking)
    try {
      await apiRequest("/api/profiles", {
        method: "POST",
        body: JSON.stringify({
          authId: signInUser.id,
          email: signInUser.email,
          fullName: signInUser.user_metadata?.full_name || signInUser.user_metadata?.name || "User",
        }),
      });
      logAuth("signIn:profile-ensured");
    } catch (err) {
      logAuth("signIn:profile-ensure-warning", err);
    }

    // ALWAYS fetch fresh role data on login (matching old behavior)
    let resolvedRole: AppRole = "patient";
    try {
      const profileResponse = await apiRequest(`/api/profiles/${signInUser.id}`);
      if (profileResponse?.data?.role) {
        resolvedRole = profileResponse.data.role as AppRole;
        logAuth("signIn:fresh-role-fetched", resolvedRole);
      } else {
        logAuth("signIn:no-role-in-profile-defaulting-to-patient");
      }
    } catch (roleErr) {
      logAuth("signIn:role-fetch-failed-defaulting-to-patient", roleErr);
      // Don't throw - default to patient as per old behavior
    }

    setUser(signInUser);
    setSession(data?.session || null);
    setRole(resolvedRole);
    logAuth("signIn:complete", { email, role: resolvedRole });
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, role, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    if (!globalStore.__EHID_AUTH_CTX__?.warned) {
      console.error("[AUTH] useAuth resolved without provider. Returning fallback context.");
      globalStore.__EHID_AUTH_CTX__!.warned = true;
    }
    return FALLBACK_AUTH_CONTEXT;
  }
  return context;
}
