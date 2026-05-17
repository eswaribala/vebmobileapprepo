import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authAPI, setAuthToken } from '../services/api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'veb_auth_token';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On app start: check for a saved token and verify it
  useEffect(() => {
    (async () => {
      try {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (token) {
          setAuthToken(token);
          const res = await authAPI.me();
          setUser(res.user);
        }
      } catch {
        // Token invalid or expired — clear it silently
        await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
        setAuthToken(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email, password) => {
    const res = await authAPI.login(email, password);
    await SecureStore.setItemAsync(TOKEN_KEY, res.token);
    setAuthToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const signup = async (name, email, password, role) => {
    const res = await authAPI.signup({ name, email, password, role });
    await SecureStore.setItemAsync(TOKEN_KEY, res.token);
    setAuthToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    setAuthToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

// Returns true if the role has full clinic access
export const isFullAccess = (role) => ['doctor', 'manager'].includes(role);
