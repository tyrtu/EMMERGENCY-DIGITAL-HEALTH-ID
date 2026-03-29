// src/store/authSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { supabase } from "../utils/supabaseClient";
import apiClient from "../config/apiClient";

// Helper: safe fetch helper to read JSON when available
const safeJson = async (res) => {
  try {
    return await res.json();
  } catch {
    return null;
  }
};

// Fetch Mongo Profile - ALWAYS FRESH DATA
const fetchMongoProfile = async (authId) => {
  if (!authId) {
    console.log("[AUTH] No authId provided, skipping profile fetch");
    return null;
  }

  console.log("[AUTH] GET fresh profile data");

  try {
    const data = await apiClient.get(`/api/profiles/${authId}`, { authId });

    if (!data || !data.success) {
      if (data?.message?.includes('not found')) {
        console.log("[AUTH] Profile not found - new user");
        return null;
      }
      
      if (data?.message?.includes('Access denied') || data?.message?.includes('403')) {
        console.log("[AUTH] Access denied to profile");
        return null;
      }
      const msg = data?.message || 'Profile fetch failed';
      throw new Error(msg);
    }

    console.log("[AUTH] Fresh profile data fetched");
    return data;
  } catch (error) {
    console.warn("[AUTH] fetchMongoProfile error:", error.message);
    return null;
  }
};

// Create Mongo Profile
const createMongoProfile = async ({ authId, email, fullName }) => {
  if (!authId) {
    console.log("[AUTH] No authId provided, skipping profile creation");
    return null;
  }

  try {
    const data = await apiClient.post('/api/profiles', { authId, email, fullName }, { authId });

    if (data && data.success) {
      console.log("[AUTH] Profile created successfully");
      return data;
    }

    if (data?.message?.includes("exists") || data?.message?.includes("already")) {
      console.log("[AUTH] Profile already exists");
      return await fetchMongoProfile(authId);
    }

    const errMsg = data?.message || 'Profile creation failed';
    throw new Error(errMsg);
  } catch (error) {
    console.error("[AUTH] createMongoProfile error:", error);
    throw error;
  }
};


// Refresh User Data - ALWAYS FETCH FRESH
export const refreshUserData = createAsyncThunk(
  "auth/refreshUserData",
  async (_, { rejectWithValue }) => {
    try {
      console.log("[AUTH] refreshUserData(): fetching fresh data");
      
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.warn("[AUTH] getSession error:", error.message);
        return { user: null, session: null, role: null };
      }

      const user = data?.session?.user || null;
      const session = data?.session || null;

      if (!user?.id) {
        return { user: null, session: null, role: null };
      }

      // ALWAYS fetch fresh profile data - never use cached role
      let role = "patient";
      try {
        const profileRes = await fetchMongoProfile(user.id);
        if (profileRes?.data?.role) {
          role = profileRes.data.role;
          console.log("[AUTH] Fresh role fetched:", role);
        } else {
          console.log("[AUTH] No profile found, using default role");
        }
      } catch (err) {
        console.warn("[AUTH] Failed to fetch fresh profile:", err.message);
      }

      return { user, session, role };
    } catch (err) {
      console.error("[AUTH] refreshUserData error:", err.message);
      return rejectWithValue(err.message || "Failed to refresh user data");
    }
  }
);

// Register User - 

export const registerUser = createAsyncThunk(
  "auth/registerUser",
  async ({ email, password, fullName }, { rejectWithValue }) => {
    try {
      console.log("[AUTH] registerUser(): starting signup for", email);

      // Clear any existing sessions first
      await supabase.auth.signOut();

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          // REDIRECT TO LOGIN PAGE AFTER CONFIRMATION - NOT DASHBOARD
          emailRedirectTo: `${window.location.origin}/login?message=email_confirmed_success`,
        },
      });

      if (error) {
        console.error("[AUTH] signUp error:", error.message);
        throw error;
      }

      const user = data?.user || null;

      // Attempt to create profile (non-blocking)
      if (user?.id) {
        try {
          await createMongoProfile({
            authId: user.id,
            email: user.email,
            fullName,
          });
        } catch (errProfile) {
          console.error("[AUTH] Profile creation warning:", errProfile.message);
        }
      }

      // If no session: user must confirm email
      if (!data?.session) {
        console.log("[AUTH] Email confirmation required");
        return {
          user,
          session: null,
          role: "pending",
          message: "Registration successful! Please check your email to confirm your account before logging in.",
          requiresConfirmation: true,
        };
      }

      // If session present (auto-confirmed), fetch fresh role
      let role = "patient";
      try {
        if (data.user?.id) {
          const profileRes = await fetchMongoProfile(data.user.id);
          role = profileRes?.data?.role || "patient";
        }
      } catch (errRole) {
        console.warn("[AUTH] Could not fetch role:", errRole.message);
      }

      return {
        user: data.user,
        session: data.session,
        role,
        message: "Registration successful! You have been automatically logged in.",
        requiresConfirmation: false,
      };
    } catch (err) {
      console.error("[AUTH] registerUser error:", err.message);
      return rejectWithValue(err.message || "Registration failed. Please try again.");
    }
  }
);


// Login User - ALWAYS FRESH DATA
export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async ({ email, password }, { rejectWithValue }) => {
    try {
      console.log("[AUTH] loginUser(): signing in", email);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          throw new Error("Invalid email or password. Please try again.");
        } else if (error.message.includes("Email not confirmed")) {
          throw new Error("Please confirm your email address before logging in.");
        } else {
          throw error;
        }
      }

      const user = data?.user || null;
      
      // Ensure profile exists
      if (user?.id) {
        try {
          await createMongoProfile({
            authId: user.id,
            email: user.email,
            fullName: user.user_metadata?.full_name || "User",
          });
        } catch (err) {
          console.warn("[AUTH] Profile check warning:", err.message);
        }
      }

      // ALWAYS fetch fresh role data on login
      let role = "patient";
      if (user?.id) {
        try {
          const profileRes = await fetchMongoProfile(user.id);
          role = profileRes?.data?.role || "patient";
          console.log("[AUTH] Fresh role on login:", role);
        } catch (err) {
          console.warn("[AUTH] Failed to fetch fresh role:", err.message);
        }
      }

      return { 
        user: data.user, 
        session: data.session, 
        role,
        message: "Login successful! Redirecting to dashboard..."
      };
    } catch (err) {
      console.error("[AUTH] loginUser error:", err.message);
      return rejectWithValue(err.message || "Login failed. Please try again.");
    }
  }
);

// --------------------------------------
// Sign in with Google OAuth
// --------------------------------------
export const signInWithGoogle = createAsyncThunk(
  "auth/signInWithGoogle",
  async (_, { rejectWithValue }) => {
    try {
      console.log("[AUTH] signInWithGoogle(): initiating Google OAuth");
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error("[AUTH] Google OAuth error:", error.message);
        throw error;
      }

      // OAuth redirects to Google, so we return pending state
      return {
        user: null,
        session: null,
        role: "pending",
        message: "Redirecting to Google...",
        isOAuth: true,
      };
    } catch (err) {
      console.error("[AUTH] signInWithGoogle error:", err.message);
      return rejectWithValue(err.message || "Google sign-in failed. Please try again.");
    }
  }
);

// --------------------------------------
// Handle OAuth callback
// --------------------------------------
export const handleOAuthCallback = createAsyncThunk(
  "auth/handleOAuthCallback",
  async (_, { rejectWithValue }) => {
    try {
      console.log("[AUTH] handleOAuthCallback(): processing OAuth callback");
      
      // Get the session from the URL hash
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        throw new Error("Failed to get session from OAuth callback");
      }

      const user = session.user;
      
      // Ensure profile exists for OAuth users
      if (user?.id) {
        try {
          await createMongoProfile({
            authId: user.id,
            email: user.email,
            fullName: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "User",
          });
        } catch (err) {
          console.warn("[AUTH] OAuth profile creation warning:", err.message);
        }
      }

      // Fetch fresh role
      let role = "patient";
      if (user?.id) {
        try {
          const profileRes = await fetchMongoProfile(user.id);
          role = profileRes?.data?.role || "patient";
        } catch (err) {
          console.warn("[AUTH] OAuth role fetch warning:", err.message);
        }
      }

      return {
        user,
        session,
        role,
        message: "Google sign-in successful!",
      };
    } catch (err) {
      console.error("[AUTH] handleOAuthCallback error:", err.message);
      return rejectWithValue(err.message || "Failed to process OAuth callback");
    }
  }
);

// --------------------------------------
// Logout User
// --------------------------------------
export const logoutUser = createAsyncThunk("auth/logoutUser", async (_, { rejectWithValue }) => {
  try {
    console.log("[AUTH] logoutUser(): signing out");
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.warn("[AUTH] signOut error:", error.message);
    }

    // Clear storage
    try {
      localStorage.removeItem("supabase.auth.token");
      localStorage.removeItem("supabase.auth.token#");
      localStorage.clear();
      sessionStorage.clear();
    } catch (storageError) {
      console.warn("[AUTH] Storage clear warning:", storageError);
    }

    return { message: "Logged out successfully" };
  } catch (err) {
    console.error("[AUTH] logoutUser error:", err.message);
    return rejectWithValue(err.message || "Logout failed");
  }
});

// --------------------------------------
// Load user from session - SIMPLIFIED
// --------------------------------------
export const loadUserFromSession = createAsyncThunk(
  "auth/loadUserFromSession",
  async (_, { rejectWithValue }) => {
    try {
      console.log("[AUTH] loadUserFromSession(): checking session");
      
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.warn("[AUTH] getSession error:", error.message);
        return { user: null, session: null, role: null };
      }

      const user = data?.session?.user || null;
      
      if (!user?.id) {
        return { user: null, session: null, role: null };
      }

      // ALWAYS fetch fresh profile data - no caching
      let role = "patient";
      try {
        const profileRes = await fetchMongoProfile(user.id);
        if (profileRes?.data?.role) {
          role = profileRes.data.role;
          console.log("[AUTH] Fresh role from session:", role);
        }
      } catch (err) {
        console.warn("[AUTH] Failed to fetch fresh profile:", err.message);
      }

      return { user, session: data?.session || null, role };
    } catch (err) {
      console.error("[AUTH] loadUserFromSession error:", err.message);
      return { user: null, session: null, role: null };
    }
  }
);

// --------------------------------------
// Force Refresh Role - For when DB role changes
// --------------------------------------
export const forceRefreshRole = createAsyncThunk(
  "auth/forceRefreshRole",
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const authId = state.auth.user?.id;
      
      if (!authId) {
        throw new Error("No user ID available");
      }

      console.log("[AUTH] forceRefreshRole(): forcing role refresh");
      const profileRes = await fetchMongoProfile(authId);
      const newRole = profileRes?.data?.role || "patient";
      
      console.log("[AUTH] Role refreshed to:", newRole);
      return newRole;
    } catch (err) {
      console.error("[AUTH] forceRefreshRole error:", err.message);
      return rejectWithValue(err.message || "Failed to refresh role");
    }
  }
);

// --------------------------------------
// Redux Slice
// --------------------------------------
const initialState = {
  isAuthenticated: false,
  user: null,
  session: null,
  role: null,
  loading: false,
  error: null,
  message: null,
  requiresConfirmation: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuthState: (state, action) => {
      const { user, session, role } = action.payload;
      state.user = user;
      state.session = session;
      state.role = role;
      state.isAuthenticated = !!session;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearMessage: (state) => {
      state.message = null;
    },
    clearAuthState: (state) => {
      Object.assign(state, initialState);
    },
    updateRole: (state, action) => {
      state.role = action.payload;
      console.log("[AUTH] Role updated to:", action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      // Register
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.message = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.session = action.payload.session;
        state.role = action.payload.role;
        state.message = action.payload.message;
        state.requiresConfirmation = action.payload.requiresConfirmation;
        state.isAuthenticated = !!action.payload.session;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Login
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.message = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.session = action.payload.session;
        state.role = action.payload.role;
        state.message = action.payload.message;
        state.isAuthenticated = !!action.payload.session;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Sign in with Google
      .addCase(signInWithGoogle.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.message = null;
      })
      .addCase(signInWithGoogle.fulfilled, (state, action) => {
        state.loading = false;
        state.message = action.payload.message;
        // OAuth redirects, so we don't set user/session yet
      })
      .addCase(signInWithGoogle.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Handle OAuth callback
      .addCase(handleOAuthCallback.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.message = null;
      })
      .addCase(handleOAuthCallback.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.session = action.payload.session;
        state.role = action.payload.role;
        state.message = action.payload.message;
        state.isAuthenticated = !!action.payload.session;
      })
      .addCase(handleOAuthCallback.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Logout
      .addCase(logoutUser.fulfilled, (state) => {
        Object.assign(state, initialState);
        state.message = "Logged out successfully";
      })

      // Load Session
      .addCase(loadUserFromSession.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadUserFromSession.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.session = action.payload.session;
        state.role = action.payload.role;
        state.isAuthenticated = !!action.payload.session;
      })

      // Refresh User Data
      .addCase(refreshUserData.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.session = action.payload.session;
        state.role = action.payload.role;
        state.isAuthenticated = !!action.payload.session;
      })

      // Force Refresh Role
      .addCase(forceRefreshRole.fulfilled, (state, action) => {
        state.role = action.payload;
      });
  },
});

export const { setAuthState, clearError, clearMessage, clearAuthState, updateRole } = authSlice.actions;
export default authSlice.reducer;

// --------------------------------------
// Auth Listener - FIXED EMAIL CONFIRMATION
// --------------------------------------
export const setupAuthListener = (store) => {
  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log("[AUTH] Listener event:", event);
    
    if (event === "SIGNED_OUT" || !session) {
      store.dispatch(setAuthState({ user: null, session: null, role: null }));
      return;
    }

    if (session?.user) {
      // ALWAYS fetch fresh data on auth state change
      let role = "patient";
      try {
        const profileRes = await fetchMongoProfile(session.user.id);
        if (profileRes?.data?.role) {
          role = profileRes.data.role;
        }
      } catch (err) {
        console.warn("[AUTH] Listener profile fetch failed:", err.message);
      }

      store.dispatch(setAuthState({ user: session.user, session, role }));
      
      // Handle email confirmation - redirect to LOGIN not dashboard
      if (event === "SIGNED_IN") {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('message') === 'email_confirmed_success') {
          console.log("[AUTH] Email confirmed - user should login");
          // User is signed in but should go to login page first
          // The session will be available when they login properly
        }
      }
    }
  });
};