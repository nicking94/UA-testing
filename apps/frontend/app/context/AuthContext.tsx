// context/AuthContext.tsx
"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { authApi } from "@/app/lib/api/auth";
import { apiClient } from "@/app/lib/api/client";
interface User {
  id: number;
  username: string | undefined;
  isTrial?: boolean;
  isActive?: boolean;
  paymentReminderDay?: number;
  logo?: string;
}
interface AuthContextType {
  isAuthenticated: boolean | null;
  userId: number | null;
  user: User | null;
  setIsAuthenticated: (authStatus: boolean, userId?: number) => void;
  logoutUser: (username?: string) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
}
const AuthContext = createContext<AuthContextType | null>(null);
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          setIsAuthenticated(false);
          setUserId(null);
          setUser(null);
          return;
        }
        const response = await authApi.validate();
        if (response.user) {
          setIsAuthenticated(true);
          setUserId(response.user.id);
          setUser({
            id: response.user.id,
            username: response.user.username,
            isActive: response.user.isActive,
          });
        } else {
          apiClient.setToken(null);
          setIsAuthenticated(false);
          setUserId(null);
          setUser(null);
        }
      } catch (error) {
        console.error('Error validating token:', error);
        apiClient.setToken(null);
        setIsAuthenticated(false);
        setUserId(null);
        setUser(null);
      }
    };
    checkAuth();
  }, []);
  const login = async (username: string, password: string) => {
    try {
      const response = await authApi.login(username, password);
      setIsAuthenticated(true);
      setUserId(response.user.id);
      setUser({
        id: response.user.id,
        username: response.user.username,
        isActive: response.user.isActive,
        logo: response.user.logo,
      });
    } catch (error: unknown) {
      throw new Error((error as Error).message || 'Error al iniciar sesión');
    }
  };
  const forceLogout = async () => {
    setIsAuthenticated(false);
    setUserId(null);
    setUser(null);
    authApi.logout();
  };
  const logoutUser = async (username?: string) => {
    if (username && user?.username === username) {
      await forceLogout();
    } else if (!username) {
      await forceLogout();
    }
  };
  const updateAuthStatus = async (authStatus: boolean, userId?: number) => {
    if (!authStatus) {
      await forceLogout();
      return;
    }
    setIsAuthenticated(authStatus);
    setUserId(userId || null);
  };
  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userId,
        user,
        setIsAuthenticated: updateAuthStatus,
        logoutUser,
        login,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
