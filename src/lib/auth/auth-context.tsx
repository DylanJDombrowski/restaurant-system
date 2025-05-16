// src/lib/auth/auth-context.tsx
"use client";
import { createContext, useContext, useEffect, useState, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { Staff, Restaurant } from "@/lib/types";

/**
 * Authentication Context - Infinite Loop Prevention Version
 *
 * This version includes several safeguards to prevent infinite loops:
 * 1. Loading flags to prevent duplicate API calls
 * 2. Ref tracking to avoid unnecessary effect triggers
 * 3. Proper cleanup and error boundaries
 */
interface AuthContextType {
  // Core authentication state
  user: User | null;
  staff: Staff | null;
  restaurant: Restaurant | null;
  session: Session | null;

  // Loading and error states
  loading: boolean;
  error: string | null;

  // Authentication actions
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;

  // Role checking helpers
  isStaff: boolean;
  isManager: boolean;
  isAdmin: boolean;
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

  // Refs to prevent infinite loops
  const loadingStaffData = useRef(false);
  const currentUserId = useRef<string | null>(null);

  /**
   * Load Staff Data with Loop Prevention
   *
   * This function includes several safeguards:
   * - Loading flag to prevent concurrent calls
   * - User ID check to avoid reloading same data
   * - Proper error handling and cleanup
   */
  const loadStaffData = async (userId: string) => {
    // Prevent concurrent loading attempts
    if (loadingStaffData.current) {
      console.log("Staff data already loading, skipping...");
      return;
    }

    // Prevent reloading the same user's data
    if (currentUserId.current === userId) {
      console.log("Staff data already loaded for this user, skipping...");
      return;
    }

    loadingStaffData.current = true;
    currentUserId.current = userId;

    try {
      console.log("Loading staff data for user:", userId);
      setError(null);

      // First, fetch the staff record
      const { data: staffData, error: staffError } = await supabase
        .from("staff")
        .select("*")
        .eq("id", userId)
        .eq("is_active", true)
        .single();

      if (staffError) {
        console.error("Error loading staff data:", staffError);

        if (staffError.code === "PGRST116") {
          throw new Error("Access denied. No staff record found.");
        }

        throw staffError;
      }

      // Then fetch the restaurant data
      const { data: restaurantData, error: restaurantError } = await supabase
        .from("restaurants")
        .select("*")
        .eq("id", staffData.restaurant_id)
        .single();

      if (restaurantError) {
        console.error("Error loading restaurant data:", restaurantError);
        throw new Error("Failed to load restaurant information");
      }

      // Update state in a single batch to prevent multiple re-renders
      setStaff(staffData);
      setRestaurant(restaurantData);

      console.log(
        "Staff data loaded successfully:",
        staffData.name,
        staffData.role
      );
      console.log("Restaurant data loaded:", restaurantData.name);
    } catch (error) {
      console.error("Failed to load staff data:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load staff data"
      );

      // Clear user data and sign out on error
      setUser(null);
      setStaff(null);
      setRestaurant(null);
      currentUserId.current = null;

      // Sign out to prevent stuck states
      await supabase.auth.signOut();
    } finally {
      loadingStaffData.current = false;
      setLoading(false);
    }
  };

  /**
   * Initialize Authentication
   *
   * This effect runs only once when the component mounts
   */
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log("Initializing authentication...");

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

        if (!mounted) return; // Component unmounted, don't update state

        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        // Load staff data if user exists
        if (initialSession?.user) {
          await loadStaffData(initialSession.user.id);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
        if (mounted) {
          setError(
            error instanceof Error ? error.message : "Failed to initialize auth"
          );
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, []); // Empty dependency array - only run once

  /**
   * Auth State Change Listener
   *
   * Set up after initial load to handle sign in/out events
   */
  useEffect(() => {
    console.log("Setting up auth state listener...");

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event);

      // Prevent processing the same event multiple times
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
      } else if (event === "SIGNED_IN" && session?.user) {
        // User signed in - load their staff data
        setUser(session.user);
        await loadStaffData(session.user.id);
      } else if (event === "TOKEN_REFRESHED" && session?.user) {
        // Token refreshed - update user but don't reload staff data
        setUser(session.user);
      }
    });

    return () => {
      console.log("Cleaning up auth listener...");
      subscription.unsubscribe();
    };
  }, []); // Empty dependency array - listener should be set up once

  const signIn = async (email: string, password: string) => {
    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Note: loadStaffData will be called by the auth state change listener
    } catch (error) {
      setError(error instanceof Error ? error.message : "Sign in failed");
      setLoading(false);
      throw error;
    }
  };

  const signOut = async () => {
    setError(null);

    try {
      // Clear refs before signing out
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
 * Protected Route Component
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
  const { user, staff, loading, error } = useAuth();

  // Show loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-lg">Checking authentication...</div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="text-red-600 text-lg mb-2">Authentication Error</div>
          <div className="text-gray-600">{error}</div>
        </div>
      </div>
    );
  }

  // If not authenticated, show login
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
 * Login Form Component
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
