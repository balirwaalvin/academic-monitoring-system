import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '../services/api';
import type { User, AuthState, StudentProfile, ParentProfile } from '../types';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<StudentProfile | ParentProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    authApi.me()
      .then((res) => {
        setUser(res.data.user as User);
        setProfile((res.data.profile || null) as StudentProfile | ParentProfile | null);
        setToken('appwrite-session');
      })
      .catch(() => {
        setToken(null);
        setUser(null);
        setProfile(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    const { token: sessionToken, user: profileUser, profile: roleProfile } = res.data;
    setToken(sessionToken || 'appwrite-session');
    setUser(profileUser as User);
    setProfile((roleProfile || null) as StudentProfile | ParentProfile | null);
  };

  const logout = async () => {
    await authApi.logout();
    setToken(null);
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, profile, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
