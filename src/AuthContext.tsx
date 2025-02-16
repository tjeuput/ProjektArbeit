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
  logout: () => Promise<void>;
}

// Define role hierarchy as a constant outside component
const ROLE_HIERARCHY: { [key: string]: number } = {
  'administrator': 3,
  'bereichsleiter': 2,
  'mitarbeiter': 1
};

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
  const [authToken, setAuthToken] = useState<string | null>(
    localStorage.getItem('authToken')
  );

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      if (!authToken) {
        setUser(null);
        setIsAuthenticated(false);
        return;
      }

      const result = await invoke<User | null>('check_auth', { 
        authToken 
      });

      if (result) {
        setUser(result);
        setIsAuthenticated(true);
      } else {
        // Token is invalid or expired
        localStorage.removeItem('authToken');
        setAuthToken(null);
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('authToken');
      setAuthToken(null);
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const hasPermission = (requiredRole: string): boolean => {
    if (!user) return false;
    
    const userRoleLevel = ROLE_HIERARCHY[user.role.toLowerCase()] || 0;
    const requiredRoleLevel = ROLE_HIERARCHY[requiredRole.toLowerCase()] || 0;

    return userRoleLevel >= requiredRoleLevel;
  };

  const login = async (username: string, password: string) => {
    try {
      const loginResult = await invoke<{ user: User; token: string }>('login', { 
        username, 
        password 
      });

      setUser(loginResult.user);
      setAuthToken(loginResult.token);
      localStorage.setItem('authToken', loginResult.token);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Login failed:', error);
      throw new Error(typeof error === 'string' ? error : 'Login failed');
    }
  };

  const logout = async () => {
    try {
      if (authToken) {
        await invoke('logout', { authToken });
      }
      localStorage.removeItem('authToken');
      setAuthToken(null);
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout failed:', error);
      // Still clear the local state even if the server call fails
      localStorage.removeItem('authToken');
      setAuthToken(null);
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      hasPermission, 
      login, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};