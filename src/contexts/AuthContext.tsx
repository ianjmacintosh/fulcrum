import React, { createContext, useState, useEffect, ReactNode } from "react";
import { createKeyFromPassword } from "../services/encryption-service";
import {
  storeEncryptionKey,
  retrieveEncryptionKey,
  removeEncryptionKey,
  isKeyStorageAvailable,
} from "../services/key-storage";

// Client-side user types (no server imports to avoid bundle bloat)
export interface User {
  _id?: string;
  id?: string;
  email: string;
  name?: string;
  username?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface AdminUser {
  _id?: string;
  id?: string;
  email: string;
  name?: string;
  username?: string;
  createdAt: Date;
  updatedAt?: Date;
  role: "admin";
}

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
    console.log("AuthContext DEBUG: checkAuthStatus called");
    try {
      setState((prev) => ({ ...prev, isLoading: true }));

      // Check if we have a session cookie
      console.log("AuthContext DEBUG: Fetching /api/auth/status");
      const response = await fetch("/api/auth/status", {
        method: "GET",
        credentials: "include",
      });

      console.log("AuthContext DEBUG: Auth status response:", {
        ok: response.ok,
        status: response.status,
      });

      if (response.ok) {
        const data = await response.json();
        console.log("AuthContext DEBUG: Auth status data:", {
          success: data.success,
          authenticated: data.authenticated,
          hasUser: !!data.user,
          userId: data.user?.id || data.user?._id,
        });

        if (data.success && data.authenticated && data.user) {
          // Try to retrieve encryption key from IndexedDB if not in memory
          let encryptionKey = state.encryptionKey;
          console.log("AuthContext DEBUG: Checking encryption key:", {
            hasKeyInMemory: !!encryptionKey,
            isStorageAvailable: isKeyStorageAvailable(),
          });

          if (!encryptionKey && isKeyStorageAvailable()) {
            try {
              const userId = data.user.id || data.user._id;
              encryptionKey = await retrieveEncryptionKey(userId);
              console.log(
                "AuthContext DEBUG: Retrieved key from storage:",
                !!encryptionKey,
              );
            } catch (error) {
              console.error(
                "AuthContext DEBUG: Failed to retrieve encryption key from storage:",
                error,
              );
            }
          }

          setState({
            user: data.user,
            userType: data.userType,
            isLoggedIn: true,
            isLoading: false,
            encryptionKey: encryptionKey,
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
          // Get user ID from login response for encryption key derivation
          const userId = data.userId;

          if (!userId) {
            throw new Error(
              "No user ID available for encryption key derivation",
            );
          }

          // Derive encryption key from password using user ID as salt
          const { key } = await createKeyFromPassword(password, userId);

          // Store encryption key in IndexedDB for future sessions
          if (isKeyStorageAvailable()) {
            try {
              await storeEncryptionKey(key, userId);
            } catch (error) {
              console.error("Failed to store encryption key:", error);
            }
          }

          // Refresh auth status after successful login
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
    const currentUser = state.user;

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      // Remove encryption key from IndexedDB
      if (currentUser && isKeyStorageAvailable()) {
        try {
          await removeEncryptionKey(currentUser.id || currentUser._id);
        } catch (error) {
          console.error("Failed to remove encryption key from storage:", error);
        }
      }

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

      // Remove encryption key even if logout request fails
      if (currentUser && isKeyStorageAvailable()) {
        try {
          await removeEncryptionKey(currentUser.id || currentUser._id);
        } catch (error) {
          console.error("Failed to remove encryption key from storage:", error);
        }
      }

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
