// src/lib/contexts/auth-context.tsx
"use client";
import { LoginForm } from "@/components/auth/LoginForm";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { supabase } from "@/lib/supabase/client";
import { Restaurant, Staff } from "@/lib/types/restaurant";
import { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

interface AuthContextType {
  user: User | null;
  staff: Staff | null;
  restaurant: Restaurant | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  loginWithPin: (pin: string, restaurantId: string) => Promise<void>;
  signOut: () => Promise<void>;
  isStaff: boolean;
  isManager: boolean;
  isAdmin: boolean;
  retryAuthentication: () => void;
  authMethod: "email" | "pin" | null;
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
  const [authMethod, setAuthMethod] = useState<"email" | "pin" | null>(null); // NEW

  // Refs for state management
  const loadingStaffData = useRef(false);
  const currentUserId = useRef<string | null>(null);
  const staffRef = useRef<Staff | null>(null);
  const restaurantRef = useRef<Restaurant | null>(null);

  /**
   * Load Staff Data via API Route
   */
  const loadStaffData = useCallback(
    async (session: Session, retryCount = 0) => {
      if (loadingStaffData.current) {
        console.log("Staff data already loading, skipping...");
        return;
      }

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
            throw new Error(
              errorData.error ||
                `API request failed with status ${response.status}`
            );
          }
        }

        const result = await response.json();

        if (!result.data) {
          throw new Error("Invalid response from API");
        }

        const { staff: staffData, restaurant: restaurantData } = result.data;

        setStaff(staffData);
        setRestaurant(restaurantData);
        setError(null);

        console.log(
          "Staff data loaded successfully via API:",
          staffData.name,
          staffData.role
        );
        console.log("Restaurant data loaded:", restaurantData.name);
      } catch (error) {
        console.error("Failed to load staff data:", error);

        if (error instanceof Error) {
          if (error.message.includes("Failed to fetch") && retryCount < 2) {
            console.log(`Retrying API call (attempt ${retryCount + 1})`);
            await new Promise((resolve) =>
              setTimeout(resolve, (retryCount + 1) * 1000)
            );
            return loadStaffData(session, retryCount + 1);
          }

          setError(error.message);
        } else {
          setError("An unexpected error occurred during authentication");
        }

        setUser(null);
        setStaff(null);
        setRestaurant(null);
        currentUserId.current = null;

        if (
          error instanceof Error &&
          error.message.includes("Authentication failed")
        ) {
          await supabase.auth.signOut();
        }
      } finally {
        loadingStaffData.current = false;
        setLoading(false);
      }
    },
    []
  );

  /**
   * ENHANCED: PIN Login Function with better session management
   */
  const loginWithPin = useCallback(
    async (pin: string, restaurantId: string) => {
      setLoading(true);
      setError(null);

      try {
        console.log("🔐 Attempting PIN login...");

        const response = await fetch("/api/auth/pin-login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pin,
            restaurant_id: restaurantId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "PIN login failed");
        }

        const result = await response.json();
        const {
          staff: staffData,
          restaurant: restaurantData,
          session: sessionData,
        } = result.data;

        // Create a custom user object for PIN-based sessions
        const customUser: User = {
          id: staffData.id,
          aud: "staff",
          role: "authenticated",
          email: staffData.email,
          phone: "",
          confirmed_at: new Date().toISOString(),
          email_confirmed_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString(),
          app_metadata: {},
          user_metadata: {
            name: staffData.name,
            role: staffData.role,
            login_method: "pin",
          },
          identities: [],
          created_at: staffData.created_at,
          updated_at: new Date().toISOString(),
        };

        // Create a custom session object
        const customSession: Session = {
          access_token: sessionData.token,
          refresh_token: sessionData.token,
          expires_in: 8 * 60 * 60,
          expires_at: Math.floor(
            new Date(sessionData.expires_at).getTime() / 1000
          ),
          token_type: "bearer",
          user: customUser,
        };

        // Update auth state
        setUser(customUser);
        setStaff(staffData);
        setRestaurant(restaurantData);
        setSession(customSession);
        setAuthMethod("pin"); // NEW: Track auth method

        // Store session data in localStorage for persistence
        localStorage.setItem(
          "pin_session",
          JSON.stringify({
            session: customSession,
            staff: staffData,
            restaurant: restaurantData,
            expires_at: sessionData.expires_at,
            auth_method: "pin",
          })
        );

        console.log("✅ PIN login successful:", staffData.name);
      } catch (error) {
        console.error("❌ PIN login failed:", error);
        setError(error instanceof Error ? error.message : "PIN login failed");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * ENHANCED: Initialize Authentication with better session handling
   */
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log("Initializing authentication...");
        setLoading(true);

        // Check for existing PIN session FIRST
        const storedPinSession = localStorage.getItem("pin_session");
        if (storedPinSession) {
          try {
            const sessionData = JSON.parse(storedPinSession);
            const expiresAt = new Date(sessionData.expires_at);

            if (expiresAt > new Date()) {
              console.log("📱 Restoring PIN session...");
              setUser(sessionData.session.user);
              setStaff(sessionData.staff);
              setRestaurant(sessionData.restaurant);
              setSession(sessionData.session);
              setAuthMethod("pin");
              setLoading(false);
              return; // Early return - don't check Supabase session
            } else {
              console.log("📱 PIN session expired, clearing...");
              localStorage.removeItem("pin_session");
            }
          } catch (error) {
            console.warn("Failed to restore PIN session:", error);
            localStorage.removeItem("pin_session");
          }
        }

        // No valid PIN session - check Supabase session
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

        if (initialSession?.user) {
          setAuthMethod("email"); // Traditional Supabase auth
          await loadStaffData(initialSession);
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
  }, [loadStaffData]);

  /**
   * ENHANCED: Auth State Change Listener
   */
  useEffect(() => {
    console.log("Setting up auth state listener...");

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event);

      // Don't process Supabase events if we're using PIN auth
      if (authMethod === "pin") {
        console.log("Ignoring Supabase auth change - using PIN session");
        return;
      }

      if (loadingStaffData.current) {
        console.log("Still loading staff data, skipping auth change...");
        return;
      }

      if (event === "SIGNED_OUT") {
        localStorage.removeItem("pin_session");
      }

      setSession(session);
      setError(null);

      if (event === "SIGNED_OUT" || !session?.user) {
        setUser(null);
        setStaff(null);
        setRestaurant(null);
        setAuthMethod(null);
        currentUserId.current = null;
        setLoading(false);
        console.log("User signed out - cleared auth state");
      } else if (event === "SIGNED_IN" && session?.user) {
        setUser(session.user);
        setAuthMethod("email");
        await loadStaffData(session);
      } else if (event === "TOKEN_REFRESHED" && session?.user) {
        setUser(session.user);
        setAuthMethod("email");

        const currentStaff = staffRef.current;
        const currentRestaurant = restaurantRef.current;

        if (!currentStaff || !currentRestaurant) {
          await loadStaffData(session);
        }
      }
    });

    return () => {
      console.log("Cleaning up auth listener...");
      subscription.unsubscribe();
    };
  }, [loadStaffData, authMethod]);

  // Update refs
  useEffect(() => {
    staffRef.current = staff;
  }, [staff]);

  useEffect(() => {
    restaurantRef.current = restaurant;
  }, [restaurant]);

  /**
   * Manual Retry Function
   */
  const retryAuthentication = () => {
    console.log("Manually retrying authentication...");
    setLoading(true);
    setError(null);

    if (session?.user) {
      currentUserId.current = null;
      loadingStaffData.current = false;
      loadStaffData(session);
    } else {
      window.location.reload();
    }
  };

  const signIn = async (email: string, password: string) => {
    setError(null);
    setLoading(true);

    try {
      // Clear any PIN session first
      localStorage.removeItem("pin_session");

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
      loadingStaffData.current = false;
      currentUserId.current = null;

      // Clear both auth methods
      localStorage.removeItem("pin_session");
      setAuthMethod(null);

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
        loginWithPin,
        signOut,
        isStaff,
        isManager,
        isAdmin,
        retryAuthentication,
        authMethod, // NEW
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

// ProtectedRoute component remains the same...
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

  if (loading) {
    return <LoadingScreen />;
  }

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

  if (!user || !staff) {
    return fallback || <LoginForm />;
  }

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
