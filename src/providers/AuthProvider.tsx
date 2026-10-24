import React, {
  createContext,
  useCallback,
  useContext,
  useState,
  useEffect,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { loginUser, getUserPassword, logoutUser } from "../services/auth";
import { storage } from "../utils/storage";
import type { LoginResponse } from "../types/auth";

const PUBLIC_PATHS = ["/login", "/change-password", "/auth0-callback"];

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  loginWithMagicLink: (email: string) => Promise<void>;
  establishSession: (response: LoginResponse) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout: logoutAuth0 } = useAuth0();

  useEffect(() => {
    const user = storage.getUserData();
    setIsAuthenticated(!!user?.email);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated) {
      if (location.pathname === "/login") {
        navigate("/dashboard", { replace: true });
      }
    } else if (!PUBLIC_PATHS.includes(location.pathname)) {
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, isLoading, location.pathname, navigate]);

  const establishSession = useCallback((response: LoginResponse) => {
    if (
      !response.user_id ||
      !response.email ||
      !response.first_name ||
      !response.last_name
    ) {
      throw new Error("Missing required authentication data");
    }

    // Do NOT store login_token — session is HttpOnly cookie from backend
    const userData = {
      userId: response.user_id,
      email: response.email,
      firstName: response.first_name,
      lastName: response.last_name,
      phoneNumber: response.phone_number || "",
      patientId: response.patientId || "",
      gender: response.gender || "",
      existing: response.existing || 0,
    };

    storage.setUserData(userData);

    if (response.patientId) {
      storage.setPatientId(response.patientId);
    }

    setIsAuthenticated(true);
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    try {
      const response = await loginUser(credentials.email, credentials.password);

      if (response.status === 0) {
        throw new Error(response.message);
      }

      if (response.status === 3 && response.error_code === "4010") {
        navigate("/change-password", {
          state: {
            email: credentials.email,
            tempPassword: response.password,
          },
        });
        return;
      }

      if (response.status === 1) {
        establishSession(response);
        return;
      }

      throw new Error(response.message);
    } catch (error: unknown) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const loginWithMagicLink = async (email: string) => {
    try {
      const passwordResponse = await getUserPassword(email);

      if (passwordResponse.status !== 1) {
        throw new Error(
          passwordResponse.message || "Failed to get user password"
        );
      }

      const response = await loginUser(email, passwordResponse.password, true);

      if (response.status === 0) {
        throw new Error(response.message);
      }

      if (response.status === 3 && response.error_code === "4010") {
        navigate("/change-password", {
          state: {
            email: email,
            tempPassword: response.password,
          },
        });
        return;
      }

      if (response.status === 1) {
        establishSession(response);
        return;
      }

      throw new Error(response.message);
    } catch (error: unknown) {
      console.error("Magic link login failed:", error);
      throw error;
    }
  };

  const clearAuth0Cache = useCallback(async () => {
    try {
      await logoutAuth0({ openUrl: false });
    } catch {
      // Panel logout already succeeded — ignore Auth0 cache errors
    }
  }, [logoutAuth0]);

  const logout = async () => {
    const user = storage.getUserData();
    const email = user?.email;

    if (!email) {
      storage.clearAuth();
      setIsAuthenticated(false);
      await clearAuth0Cache();
      navigate("/login");
      return;
    }

    try {
      const result = await logoutUser(email);
      if (result.status === 1) {
        storage.clearAuth();
        setIsAuthenticated(false);
        await clearAuth0Cache();
        navigate("/login");
      }
      // If API fails / status !== 1 → keep cookies & session
    } catch (error) {
      console.error("Logout failed:", error);
      // Keep session on failure per cookie-auth rules
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        login,
        loginWithMagicLink,
        establishSession,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
