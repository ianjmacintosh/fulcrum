import React, { createContext, useState, useEffect, ReactNode } from "react";
import { User } from "../db/schemas";
import { AdminUser } from "../db/schemas";
import { createKeyFromPassword } from "../services/encryption-service";

export interface AuthState {
  user: User | AdminUser | null;
  userType: "admin" | "user" | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  encryptionKey: CryptoKey | null;
}

export interface AuthContextType extends AuthState {
  login: (
    email: string,
    password: string,
  ) => Promise<{
    success: boolean;
    error?: string;
    userType?: "admin" | "user";
    redirectUrl?: string;
  }>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    userType: null,
    isLoggedIn: false,
    isLoading: true,
    encryptionKey: null,
  });

  // Check authentication status on mount and when needed
  const checkAuthStatus = async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));

      // Check if we have a session cookie
      const response = await fetch("/api/auth/status", {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.authenticated && data.user) {
          setState({
            user: data.user,
            userType: data.userType,
            isLoggedIn: true,
            isLoading: false,
            encryptionKey: null, // Key will need to be re-derived with password
          });
        } else {
          setState({
            user: null,
            userType: null,
            isLoggedIn: false,
            isLoading: false,
            encryptionKey: null,
          });
        }
      } else {
        setState({
          user: null,
          userType: null,
          isLoggedIn: false,
          isLoading: false,
          encryptionKey: null,
        });
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
      setState({
        user: null,
        userType: null,
        isLoggedIn: false,
        isLoading: false,
        encryptionKey: null,
      });
    }
  };

  // Login function
  const login = async (email: string, password: string) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        try {
          // Derive encryption key from password
          const { key } = await createKeyFromPassword(password);

          // Refresh auth status after successful login and store encryption key
          await checkAuthStatus();

          // Update state to include the encryption key
          setState((prevState) => ({
            ...prevState,
            encryptionKey: key,
          }));

          return {
            success: true,
            userType: data.userType,
            redirectUrl: data.redirectUrl,
          };
        } catch (encryptionError) {
          console.error("Failed to derive encryption key:", encryptionError);
          // Login still succeeds, but encryption key derivation failed
          await checkAuthStatus();
          return {
            success: true,
            userType: data.userType,
            redirectUrl: data.redirectUrl,
            warning:
              "Login successful but encryption key derivation failed. You may need to re-enter your password for encrypted data.",
          };
        }
      } else {
        return {
          success: false,
          error: data.error || "Login failed",
        };
      }
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        error: "Network error. Please try again.",
      };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      // Clear auth state
      setState({
        user: null,
        userType: null,
        isLoggedIn: false,
        isLoading: false,
        encryptionKey: null,
      });
    } catch (error) {
      console.error("Logout error:", error);
      // Clear auth state even if logout request fails
      setState({
        user: null,
        userType: null,
        isLoggedIn: false,
        isLoading: false,
        encryptionKey: null,
      });
    }
  };

  // Check auth status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    checkAuthStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext };
