// src/lib/auth/auth-context.tsx
"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { Staff, Restaurant } from "@/lib/types";

/**
 * Authentication Context Structure
 *
 * This context manages the complete authentication state for staff members.
 * It connects Supabase's user authentication with our staff table data,
 * creating a bridge between identity (who they are) and authorization
 * (what they can do).
 */
interface AuthContextType {
  // Core authentication state
  user: User | null; // Supabase user object (handles identity)
  staff: Staff | null; // Our staff record (handles roles/permissions)
  restaurant: Restaurant | null; // The restaurant this staff member works for
  session: Session | null; // Current authentication session

  // Loading and error states
  loading: boolean; // True during initial auth check
  error: string | null; // Any authentication errors

  // Authentication actions
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;

  // Role checking helpers (computed based on staff.role)
  isStaff: boolean; // Can create orders, basic operations
  isManager: boolean; // Can manage menu, view analytics
  isAdmin: boolean; // Can manage staff, system settings
}

// Create the context with undefined initial value
// This forces consumers to use the hook, preventing accidental usage outside provider
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Authentication Provider Component
 *
 * This wrapper component manages all authentication state and provides it
 * to child components. It handles the complex orchestration between
 * Supabase auth and our custom staff data.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Core state management
  const [user, setUser] = useState<User | null>(null);
  const [staff, setStaff] = useState<Staff | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Initialize Authentication State
   *
   * This effect runs once when the component mounts. It checks if there's
   * an existing session and sets up real-time listeners for auth changes.
   * Think of this as the "startup sequence" for authentication.
   */
  useEffect(() => {
    // Get initial session state
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("Error getting session:", error);
        setError(error.message);
      } else {
        setSession(session);
        setUser(session?.user ?? null);

        // If we have a user, load their staff data
        if (session?.user) {
          loadStaffData(session.user.id);
        }
      }
      setLoading(false);
    });

    /**
     * Set up auth state listener
     *
     * This listener fires whenever the authentication state changes:
     * - User signs in → Load staff data
     * - User signs out → Clear all data
     * - Session expires → Handle gracefully
     *
     * This ensures our UI stays in sync with the auth state automatically.
     */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event);

      setSession(session);
      setUser(session?.user ?? null);
      setError(null);

      if (session?.user) {
        // User signed in - load their staff data
        await loadStaffData(session.user.id);
      } else {
        // User signed out - clear all state
        setStaff(null);
        setRestaurant(null);
      }

      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => subscription.unsubscribe();
  });

  /**
   * Load Staff and Restaurant Data
   *
   * This function fetches the staff record for the authenticated user
   * and loads their restaurant information. This is where we connect
   * Supabase's authentication with our business logic.
   *
   * @param userId - The Supabase user ID to look up
   */
  const loadStaffData = async (userId: string) => {
    try {
      setError(null);

      // Fetch staff record for this user
      // Note: We're assuming the staff.id matches the Supabase user.id
      const { data: staffData, error: staffError } = await supabase
        .from("staff")
        .select(
          `
          *,
          restaurants:restaurant_id (*)
        `
        )
        .eq("id", userId)
        .eq("is_active", true)
        .single();

      if (staffError) {
        console.error("Error loading staff data:", staffError);

        // If user exists in Supabase but not in staff table,
        // they might be a user who shouldn't have access
        if (staffError.code === "PGRST116") {
          throw new Error("Access denied. No staff record found.");
        }

        throw staffError;
      }

      // Set staff and restaurant data
      setStaff(staffData);
      setRestaurant(staffData.restaurants as Restaurant);

      console.log("Staff data loaded:", staffData.name, staffData.role);
    } catch (error) {
      console.error("Failed to load staff data:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load staff data"
      );

      // If we can't load staff data, sign them out
      // This prevents unauthorized access
      await signOut();
    }
  };

  /**
   * Sign In Function
   *
   * This function handles the complete sign-in process:
   * 1. Validates credentials with Supabase
   * 2. Supabase auth state listener automatically loads staff data
   * 3. UI updates automatically via context
   */
  const signIn = async (email: string, password: string) => {
    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      // Note: We don't manually load staff data here because the
      // auth state change listener will handle it automatically
    } catch (error) {
      setError(error instanceof Error ? error.message : "Sign in failed");
      throw error; // Re-throw so the UI can handle it
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign Out Function
   *
   * Cleanly signs out the user and clears all authentication state.
   * The auth state listener will automatically clear staff and restaurant data.
   */
  const signOut = async () => {
    setError(null);

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      console.log("User signed out successfully");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Sign out failed");
      throw error;
    }
  };

  /**
   * Role-based Access Helpers
   *
   * These computed properties make it easy to check permissions throughout
   * the app. They're calculated based on the staff.role value and follow
   * a hierarchical permission model:
   *
   * admin > manager > staff
   *
   * Each higher role includes all permissions of lower roles.
   */
  const isStaff = Boolean(staff);
  const isManager = staff?.role === "manager" || staff?.role === "admin";
  const isAdmin = staff?.role === "admin";

  // Provide all authentication state and methods to child components
  const contextValue: AuthContextType = {
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
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

/**
 * useAuth Hook
 *
 * This custom hook provides a clean way to access authentication context
 * in any component. It includes error checking to ensure it's used correctly.
 */
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};

/**
 * Protected Route Component
 *
 * This component handles route protection based on authentication state
 * and role requirements. It's a higher-order component that wraps
 * pages that require authentication.
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

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-lg">Checking authentication...</div>
      </div>
    );
  }

  // Show error state if authentication failed
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

  // If not authenticated, show login form or fallback
  if (!user || !staff) {
    return fallback || <LoginForm />;
  }

  // Check role-based access if required
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

  // User is authenticated and authorized - render protected content
  return <>{children}</>;
}

/**
 * Login Form Component
 *
 * A clean, professional login form that integrates with our authentication system.
 * It provides immediate feedback and handles all error states gracefully.
 */
function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const { signIn } = useAuth();

  /**
   * Handle form submission
   *
   * This function manages the login process and provides appropriate
   * user feedback during the authentication attempt.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setLoginError(null);

    try {
      await signIn(email, password);
      // Success! The auth context will handle the redirect automatically
    } catch (error) {
      // Display user-friendly error messages
      const errorMessage =
        error instanceof Error ? error.message : "Login failed";
      setLoginError(errorMessage);

      // Clear password on error for security
      setPassword("");
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
          {/* Error display */}
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

          {/* Email field */}
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

          {/* Password field */}
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

          {/* Submit button */}
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

        {/* Developer info - can be removed in production */}
        <div className="text-center text-xs text-gray-500">
          <p>Staff accounts are created by administrators</p>
        </div>
      </div>
    </div>
  );
}
