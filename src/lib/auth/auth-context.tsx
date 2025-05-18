// src/lib/auth/auth-context.tsx - Type-Safe Enhanced Version
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
  // Add a retry function for stuck states
  retryAuthentication: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Enhanced Promise with Timeout Utility
 *
 * This utility allows us to add timeout functionality to any promise
 * while maintaining proper TypeScript types. It's like putting a
 * kitchen timer on your database queries - if they take too long,
 * we abort and try again.
 */
function withTimeout<T>(
  promise: Promise<T> | PromiseLike<T>,
  timeoutMs: number,
  timeoutMessage = "Operation timed out"
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);
  });

  const wrappedPromise = Promise.resolve(promise).finally(() =>
    clearTimeout(timeoutHandle)
  );

  return Promise.race([wrappedPromise, timeoutPromise]);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Core state
  const [user, setUser] = useState<User | null>(null);
  const [staff, setStaff] = useState<Staff | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Enhanced refs for better state management
  const loadingStaffData = useRef(false);
  const currentUserId = useRef<string | null>(null);
  const maxRetries = useRef(0);

  /**
   * Enhanced Staff Data Loading with Timeout and Retry Logic
   *
   * This function now includes timeout handling to prevent hanging,
   * retry logic for temporary failures, and better error states.
   *
   * Think of this as the hiring process for your restaurant - we need
   * to verify the person's identity (auth user) and get their job
   * details (staff record) and workplace info (restaurant data).
   */
  const loadStaffData = async (userId: string, retryCount = 0) => {
    // Prevent multiple concurrent attempts
    if (loadingStaffData.current) {
      console.log("Staff data already loading, skipping...");
      return;
    }

    // Prevent reloading the same user's data unless it's a retry
    if (currentUserId.current === userId && retryCount === 0) {
      console.log("Staff data already loaded for this user, skipping...");
      return;
    }

    loadingStaffData.current = true;
    currentUserId.current = userId;

    try {
      console.log(
        `Loading staff data for user: ${userId} (attempt ${retryCount + 1})`
      );
      setError(null);

      /**
       * Step 1: Load Staff Record with Timeout Protection
       *
       * We wrap the Supabase query in our timeout utility. This preserves
       * the response type while adding timeout functionality. It's like
       * setting a timer when you're looking up an employee's file.
       */
      const staffData = await withTimeout(
        supabase
          .from("staff")
          .select("*")
          .eq("id", userId)
          .eq("is_active", true)
          .single()
          .then(({ data, error }) => {
            if (error) throw error;
            return data;
          }),
        10000, // 10 second timeout
        "Staff data query timed out"
      );

      console.log("Staff record loaded:", staffData);

      /**
       * Step 2: Load Restaurant Data with Timeout Protection
       *
       * Once we have the staff record, we need their restaurant details.
       * This is like getting the restaurant's operations manual after
       * we've confirmed the employee works there.
       */
      const restaurantData = await withTimeout(
        supabase
          .from("restaurants")
          .select("*")
          .eq("id", staffData.restaurant_id)
          .single()
          .then(({ data, error }) => {
            if (error) throw error;
            return data;
          }),
        5000, // 5 second timeout for restaurant data
        "Restaurant data query timed out"
      );

      console.log("Restaurant data loaded:", restaurantData);

      // Update state atomically to prevent intermediate renders
      setStaff(staffData);
      setRestaurant(restaurantData);
      setError(null);
      maxRetries.current = 0; // Reset retry counter on success

      console.log(
        "Authentication completed successfully:",
        staffData.name,
        staffData.role
      );
    } catch (error) {
      console.error("Failed to load staff data:", error);

      // Increment retry counter
      maxRetries.current = Math.max(maxRetries.current, retryCount + 1);

      /**
       * Enhanced Error Handling with Smart Retry Logic
       *
       * Different errors require different responses:
       * - Timeout errors: Retry automatically (network might be slow)
       * - Permission errors: Don't retry (user doesn't have access)
       * - Not found errors: Don't retry (user not in system)
       */
      if (error instanceof Error) {
        if (error.message.includes("timeout") && retryCount < 3) {
          console.log(`Retrying staff data load (attempt ${retryCount + 1})`);
          // Wait progressively longer between retries (1s, 2s, 3s)
          await new Promise((resolve) =>
            setTimeout(resolve, (retryCount + 1) * 1000)
          );
          return loadStaffData(userId, retryCount + 1);
        }

        // For non-timeout errors or max retries reached
        if (error.message.includes("No rows returned")) {
          setError("Access denied. No staff record found for this account.");
        } else if (error.message.includes("timeout")) {
          setError(
            "Connection timeout. Please check your internet connection and try again."
          );
        } else {
          setError(error.message);
        }
      } else {
        setError("An unexpected error occurred during authentication.");
      }

      // Clear user data on error
      setUser(null);
      setStaff(null);
      setRestaurant(null);
      currentUserId.current = null;

      // Only sign out for non-timeout errors to allow manual retry
      if (!(error instanceof Error && error.message.includes("timeout"))) {
        await supabase.auth.signOut();
      }
    } finally {
      loadingStaffData.current = false;
      setLoading(false);
    }
  };

  /**
   * Initialize Authentication with Better Error Handling
   *
   * This enhanced initialization provides better feedback when
   * authentication fails and includes recovery mechanisms.
   */
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log("Initializing authentication...");
        setLoading(true);

        // Get initial session with timeout protection
        const sessionResult = await withTimeout(
          supabase.auth.getSession(),
          8000,
          "Session initialization timed out"
        );

        if (sessionResult.error) {
          console.error("Error getting initial session:", sessionResult.error);
          setError(sessionResult.error.message);
          setLoading(false);
          return;
        }

        if (!mounted) return;

        const session = sessionResult.data.session;
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await loadStaffData(session.user.id);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
        if (mounted) {
          setError(
            error instanceof Error
              ? error.message
              : "Failed to initialize authentication"
          );
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
   * Enhanced Auth State Listener
   *
   * This listener now includes better state management and
   * prevents conflicts with the initialization process.
   */
  useEffect(() => {
    console.log("Setting up auth state listener...");

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event);

      // Ignore token refresh events if we're already loading
      if (event === "TOKEN_REFRESHED" && loadingStaffData.current) {
        console.log("Ignoring token refresh during staff data loading");
        return;
      }

      setSession(session);
      setError(null);

      if (event === "SIGNED_OUT" || !session?.user) {
        setUser(null);
        setStaff(null);
        setRestaurant(null);
        currentUserId.current = null;
        setLoading(false);
        console.log("User signed out - cleared auth state");
      } else if (event === "SIGNED_IN" && session?.user) {
        setUser(session.user);
        await loadStaffData(session.user.id);
      } else if (event === "TOKEN_REFRESHED" && session?.user) {
        setUser(session.user);
        // Don't reload staff data on token refresh unless there's an error
        if (!staff || !restaurant) {
          await loadStaffData(session.user.id);
        }
      }
    });

    return () => {
      console.log("Cleaning up auth listener...");
      subscription.unsubscribe();
    };
  }, [staff, restaurant]); // Include staff and restaurant in dependencies

  /**
   * Manual Retry Function
   *
   * Sometimes network issues or temporary database problems can leave
   * users in a stuck state. This function gives them a way to manually
   * retry the authentication process without refreshing the page.
   */
  const retryAuthentication = () => {
    console.log("Manually retrying authentication...");
    setLoading(true);
    setError(null);

    if (session?.user) {
      // Reset the current user ID to force a reload
      currentUserId.current = null;
      loadingStaffData.current = false;
      loadStaffData(session.user.id);
    } else {
      // Refresh the entire session
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
 * Enhanced Protected Route with Retry Capability
 *
 * Now includes a retry button when authentication gets stuck
 * and better error messaging for different failure scenarios.
 */
interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: "staff" | "manager" | "admin";
  fallback?: React.ReactNode;
}

export function ProtectedRoute({
  children,
  requireRole,
  fallback,
}: ProtectedRouteProps) {
  const { user, staff, loading, error, retryAuthentication } = useAuth();

  // Enhanced loading state with retry option
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <div className="text-lg mb-4">Checking authentication...</div>
        <div className="text-sm text-gray-600 mb-4">
          This usually takes just a moment
        </div>
        {/* Show retry button after some time */}
        <RetryButton onRetry={retryAuthentication} />
      </div>
    );
  }

  // Enhanced error state with specific messaging
  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <div className="text-center max-w-md">
          <div className="text-red-600 text-lg mb-2">Authentication Error</div>
          <div className="text-gray-600 mb-4">{error}</div>
          <button
            onClick={retryAuthentication}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mr-2"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  // Check authentication
  if (!user || !staff) {
    return fallback || <LoginForm />;
  }

  // Check role-based access
  if (requireRole) {
    const roleHierarchy = { staff: 1, manager: 2, admin: 3 };
    const userLevel =
      roleHierarchy[staff.role as keyof typeof roleHierarchy] || 0;
    const requiredLevel = roleHierarchy[requireRole];

    if (userLevel < requiredLevel) {
      return (
        <div className="text-center py-16">
          <div className="text-red-600 text-lg mb-2">Access Denied</div>
          <p className="text-gray-600">
            You need {requireRole} or higher privileges to access this area.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Current role: {staff.role}
          </p>
        </div>
      );
    }
  }

  return <>{children}</>;
}

/**
 * Retry Button Component
 *
 * Shows a retry button after a delay to help users who get stuck
 * in the loading state.
 */
function RetryButton({ onRetry }: { onRetry: () => void }) {
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowRetry(true);
    }, 5000); // Show retry button after 5 seconds

    return () => clearTimeout(timer);
  }, []);

  if (!showRetry) return null;

  return (
    <div className="text-center">
      <div className="text-sm text-gray-500 mb-2">
        Taking longer than expected?
      </div>
      <button
        onClick={onRetry}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
      >
        Retry Authentication
      </button>
    </div>
  );
}

// LoginForm component remains unchanged from your original
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
      const errorMessage =
        error instanceof Error ? error.message : "Login failed";
      setLoginError(errorMessage);
      setPassword(""); // Clear password on error
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">
            🍕 Pizza Mia Staff Login
          </h2>
          <p className="mt-2 text-gray-600">
            Sign in to access the staff dashboard
          </p>
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
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
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
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
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
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
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
