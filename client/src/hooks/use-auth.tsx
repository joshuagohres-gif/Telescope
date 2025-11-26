/**
 * Authentication Context and Hooks
 * 
 * Provides authentication state and methods throughout the app
 */

import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { PublicUser, RegisterInput, LoginInput } from "@shared/schema";

// Extended user type with email for logged-in user
interface AuthUser extends PublicUser {
  email: string;
  isEmailVerified: boolean;
}

interface AuthConfig {
  googleOAuthEnabled: boolean;
  googleClientId: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  config: AuthConfig | null;
  login: (data: LoginInput) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  loginWithGoogle: () => void;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// API functions
async function fetchCurrentUser(): Promise<{ user: AuthUser | null }> {
  const response = await fetch("/api/auth/me", {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Failed to fetch user");
  }
  return response.json();
}

async function fetchAuthConfig(): Promise<AuthConfig> {
  const response = await fetch("/api/auth/config");
  if (!response.ok) {
    throw new Error("Failed to fetch auth config");
  }
  return response.json();
}

async function loginUser(data: LoginInput): Promise<{ user: AuthUser }> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  
  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.error || "Login failed");
  }
  
  return result;
}

async function registerUser(data: RegisterInput): Promise<{ user: AuthUser }> {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  
  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.error || "Registration failed");
  }
  
  return result;
}

async function logoutUser(): Promise<void> {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });
  
  if (!response.ok) {
    throw new Error("Logout failed");
  }
}

async function logoutAllSessions(): Promise<void> {
  const response = await fetch("/api/auth/logout-all", {
    method: "POST",
    credentials: "include",
  });
  
  if (!response.ok) {
    throw new Error("Logout from all devices failed");
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  
  // Fetch current user
  const { data: userData, isLoading: isUserLoading, refetch: refetchUser } = useQuery({
    queryKey: ["auth", "user"],
    queryFn: fetchCurrentUser,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Fetch auth configuration
  const { data: configData, isLoading: isConfigLoading } = useQuery({
    queryKey: ["auth", "config"],
    queryFn: fetchAuthConfig,
    retry: false,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
  
  // Login mutation
  const loginMutation = useMutation({
    mutationFn: loginUser,
    onSuccess: (data) => {
      queryClient.setQueryData(["auth", "user"], { user: data.user });
    },
  });
  
  // Register mutation
  const registerMutation = useMutation({
    mutationFn: registerUser,
    onSuccess: (data) => {
      queryClient.setQueryData(["auth", "user"], { user: data.user });
    },
  });
  
  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: logoutUser,
    onSuccess: () => {
      queryClient.setQueryData(["auth", "user"], { user: null });
      queryClient.invalidateQueries({ queryKey: ["auth"] });
    },
  });
  
  // Logout all mutation
  const logoutAllMutation = useMutation({
    mutationFn: logoutAllSessions,
    onSuccess: () => {
      queryClient.setQueryData(["auth", "user"], { user: null });
      queryClient.invalidateQueries({ queryKey: ["auth"] });
    },
  });
  
  // Check for auth callback params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authSuccess = params.get("auth_success");
    const authError = params.get("auth_error");
    
    if (authSuccess || authError) {
      // Clean URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, "", newUrl);
      
      if (authSuccess) {
        // Refetch user after OAuth success
        refetchUser();
      }
      
      if (authError) {
        console.error("Auth error:", authError);
        // Could show a toast notification here
      }
    }
  }, [refetchUser]);
  
  const login = useCallback(async (data: LoginInput) => {
    await loginMutation.mutateAsync(data);
  }, [loginMutation]);
  
  const register = useCallback(async (data: RegisterInput) => {
    await registerMutation.mutateAsync(data);
  }, [registerMutation]);
  
  const logout = useCallback(async () => {
    await logoutMutation.mutateAsync();
  }, [logoutMutation]);
  
  const logoutAll = useCallback(async () => {
    await logoutAllMutation.mutateAsync();
  }, [logoutAllMutation]);
  
  const loginWithGoogle = useCallback(() => {
    window.location.href = "/api/auth/google";
  }, []);
  
  const refetch = useCallback(async () => {
    await refetchUser();
  }, [refetchUser]);
  
  const value: AuthContextType = {
    user: userData?.user ?? null,
    isLoading: isUserLoading || isConfigLoading,
    isAuthenticated: !!userData?.user,
    config: configData ?? null,
    login,
    register,
    logout,
    logoutAll,
    loginWithGoogle,
    refetchUser: refetch,
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Utility hook for requiring auth
export function useRequireAuth() {
  const { user, isLoading, isAuthenticated } = useAuth();
  return { user, isLoading, isAuthenticated };
}
