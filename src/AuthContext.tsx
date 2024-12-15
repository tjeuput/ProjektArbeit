import React, { createContext, useContext, useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api';

interface User {
  id: number;
  username: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  hasPermission: (requiredRole: string) => boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check for existing session on mount
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      // Call your Rust backend to verify session
      const sessionUser = await invoke<User>('check_session');
      if (sessionUser) {
        setUser(sessionUser);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Session check failed:', error);
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const hasPermission = (requiredRole: string): boolean => {
    if (!user) return false;
    
    // Define role hierarchy
    const roleHierarchy: { [key: string]: number } = {
      'admin': 3,
      'manager': 2,
      'user': 1
    };

    const userRoleLevel = roleHierarchy[user.role] || 0;
    const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

    return userRoleLevel >= requiredRoleLevel;
  };

  const login = async (username: string, password: string) => {
    try {
      const loggedInUser = await invoke<User>('login', { username, password });
      setUser(loggedInUser);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await invoke('logout');
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, hasPermission, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};