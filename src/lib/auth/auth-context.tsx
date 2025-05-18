"use client";
import { createContext, useContext, useEffect, useState, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { Staff, Restaurant } from "@/lib/types";

interface AuthContextType {
  user: User | null;
  staff: Staff | null;
  restaurant: Restaurant | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isStaff: boolean;
  isManager: boolean;
  isAdmin: boolean;
  retryAuthentication: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Core state
  const [user, setUser] = useState<User | null>(null);
  const [staff, setStaff] = useState<Staff | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refs for state management
  const loadingStaffData = useRef(false);
  const currentUserId = useRef<string | null>(null);

  /**
   * Load Staff Data via API Route
   *
   * This new approach uses our API route to fetch staff data, which bypasses
   * RLS issues and provides more reliable performance. Think of it like using
   * the employee entrance instead of the customer entrance - it's a direct
   * path to the data without security checkpoints that might slow things down.
   */
  const loadStaffData = async (session: Session, retryCount = 0) => {
    // Prevent concurrent loading attempts
    if (loadingStaffData.current) {
      console.log("Staff data already loading, skipping...");
      return;
    }

    // Prevent reloading the same user's data unless it's a retry
    const userId = session.user.id;
    if (currentUserId.current === userId && retryCount === 0) {
      console.log("Staff data already loaded for this user, skipping...");
      return;
    }

    loadingStaffData.current = true;
    currentUserId.current = userId;

    try {
      console.log(`Loading staff data via API (attempt ${retryCount + 1})`);
      setError(null);

      // Use the API route with the access token
      const response = await fetch("/api/auth/staff", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();

        if (response.status === 401) {
          throw new Error("Authentication failed - please sign in again");
        } else if (response.status === 404) {
          throw new Error("No staff record found for this account");
        } else {
          throw new Error(errorData.error || `API request failed with status ${response.status}`);
        }
      }

      const result = await response.json();

      if (!result.data) {
        throw new Error("Invalid response from API");
      }

      const { staff: staffData, restaurant: restaurantData } = result.data;

      // Update state atomically
      setStaff(staffData);
      setRestaurant(restaurantData);
      setError(null);

      console.log("Staff data loaded successfully via API:", staffData.name, staffData.role);
      console.log("Restaurant data loaded:", restaurantData.name);
    } catch (error) {
      console.error("Failed to load staff data:", error);

      // Handle different types of errors
      if (error instanceof Error) {
        if (error.message.includes("Failed to fetch") && retryCount < 2) {
          // Network error - retry with delay
          console.log(`Retrying API call (attempt ${retryCount + 1})`);
          await new Promise((resolve) => setTimeout(resolve, (retryCount + 1) * 1000));
          return loadStaffData(session, retryCount + 1);
        }

        setError(error.message);
      } else {
        setError("An unexpected error occurred during authentication");
      }

      // Clear user data on error
      setUser(null);
      setStaff(null);
      setRestaurant(null);
      currentUserId.current = null;

      // Sign out for auth errors
      if (error instanceof Error && error.message.includes("Authentication failed")) {
        await supabase.auth.signOut();
      }
    } finally {
      loadingStaffData.current = false;
      setLoading(false);
    }
  };

  /**
   * Initialize Authentication
   *
   * Gets the initial session and loads staff data if user is signed in.
   * This now uses a simpler approach since we're not doing database queries directly.
   */
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log("Initializing authentication...");
        setLoading(true);

        // Get initial session
        const {
          data: { session: initialSession },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Error getting initial session:", error);
          setError(error.message);
          setLoading(false);
          return;
        }

        if (!mounted) return;

        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        // Load staff data if user exists
        if (initialSession?.user) {
          await loadStaffData(initialSession);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
        if (mounted) {
          setError(error instanceof Error ? error.message : "Failed to initialize authentication");
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, []);

  /**
   * Auth State Change Listener
   *
   * Handles sign in, sign out, and token refresh events.
   */
  useEffect(() => {
    console.log("Setting up auth state listener...");

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event);

      // Don't process events if we're still loading
      if (loadingStaffData.current) {
        console.log("Still loading staff data, skipping auth change...");
        return;
      }

      setSession(session);
      setError(null);

      if (event === "SIGNED_OUT" || !session?.user) {
        // Clear all user data
        setUser(null);
        setStaff(null);
        setRestaurant(null);
        currentUserId.current = null;
        setLoading(false);
        console.log("User signed out - cleared auth state");
      } else if (event === "SIGNED_IN" && session?.user) {
        // User signed in - load their staff data
        setUser(session.user);
        await loadStaffData(session);
      } else if (event === "TOKEN_REFRESHED" && session?.user) {
        // Token refreshed - update user but only reload staff data if needed
        setUser(session.user);
        if (!staff || !restaurant) {
          await loadStaffData(session);
        }
      }
    });

    return () => {
      console.log("Cleaning up auth listener...");
      subscription.unsubscribe();
    };
  }, [staff, restaurant]);

  /**
   * Manual Retry Function
   *
   * Allows users to retry authentication if they get stuck.
   */
  const retryAuthentication = () => {
    console.log("Manually retrying authentication...");
    setLoading(true);
    setError(null);

    if (session?.user) {
      // Reset state and retry
      currentUserId.current = null;
      loadingStaffData.current = false;
      loadStaffData(session);
    } else {
      // No session - refresh page
      window.location.reload();
    }
  };

  const signIn = async (email: string, password: string) => {
    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    } catch (error) {
      setError(error instanceof Error ? error.message : "Sign in failed");
      setLoading(false);
      throw error;
    }
  };

  const signOut = async () => {
    setError(null);

    try {
      // Clear refs and state before signing out
      loadingStaffData.current = false;
      currentUserId.current = null;

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      console.log("User signed out successfully");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Sign out failed");
      throw error;
    }
  };

  // Role-based access helpers
  const isStaff = Boolean(staff);
  const isManager = staff?.role === "manager" || staff?.role === "admin";
  const isAdmin = staff?.role === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        staff,
        restaurant,
        session,
        loading,
        error,
        signIn,
        signOut,
        isStaff,
        isManager,
        isAdmin,
        retryAuthentication,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

/**
 * Protected Route Component - Unchanged
 */
interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: "staff" | "manager" | "admin";
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ children, requireRole, fallback }: ProtectedRouteProps) {
  const { user, staff, loading, error, retryAuthentication } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <div className="text-lg mb-4">Checking authentication...</div>
        <div className="text-sm text-gray-600 mb-4">This usually takes just a moment</div>
        <RetryButton onRetry={retryAuthentication} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <div className="text-center max-w-md">
          <div className="text-red-600 text-lg mb-2">Authentication Error</div>
          <div className="text-gray-600 mb-4">{error}</div>
          <button onClick={retryAuthentication} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mr-2">
            Try Again
          </button>
          <button onClick={() => window.location.reload()} className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400">
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  if (!user || !staff) {
    return fallback || <LoginForm />;
  }

  if (requireRole) {
    const roleHierarchy = { staff: 1, manager: 2, admin: 3 };
    const userLevel = roleHierarchy[staff.role as keyof typeof roleHierarchy] || 0;
    const requiredLevel = roleHierarchy[requireRole];

    if (userLevel < requiredLevel) {
      return (
        <div className="text-center py-16">
          <div className="text-red-600 text-lg mb-2">Access Denied</div>
          <p className="text-gray-600">You need {requireRole} or higher privileges to access this area.</p>
          <p className="text-sm text-gray-500 mt-2">Current role: {staff.role}</p>
        </div>
      );
    }
  }

  return <>{children}</>;
}

/**
 * Retry Button Component
 */
function RetryButton({ onRetry }: { onRetry: () => void }) {
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowRetry(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  if (!showRetry) return null;

  return (
    <div className="text-center">
      <div className="text-sm text-gray-500 mb-2">Taking longer than expected?</div>
      <button onClick={onRetry} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm">
        Retry Authentication
      </button>
    </div>
  );
}

/**
 * Login Form Component - Unchanged
 */
function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setLoginError(null);

    try {
      await signIn(email, password);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Login failed";
      setLoginError(errorMessage);
      setPassword("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">🍕 Pizza Mia Staff Login</h2>
          <p className="mt-2 text-gray-600">Sign in to access the staff dashboard</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {loginError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">⚠️</div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium">Login Failed</h3>
                  <div className="mt-1 text-sm">{loginError}</div>
                </div>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="staff@pizzamia.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Signing in...
              </span>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="text-center text-xs text-gray-500">
          <p>Staff accounts are created by administrators</p>
        </div>
      </div>
    </div>
  );
}
