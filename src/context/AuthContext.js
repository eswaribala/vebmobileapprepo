import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { authAPI, setAuthToken } from '../services/api';

const INACTIVITY_LIMIT_MS = 10 * 60 * 1000; // 10 minutes

const AuthContext = createContext(null);

const TOKEN_KEY = 'veb_auth_token';
const BIOMETRIC_EMAIL_KEY = 'veb_bio_email';
const BIOMETRIC_PASS_KEY = 'veb_bio_pass';
const BIOMETRIC_ENABLED_KEY = 'veb_bio_enabled';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const backgroundedAt = useRef(null);
  const userRef = useRef(null);
  userRef.current = user;

  // Auto-logout when app stays backgrounded for 10+ minutes
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        backgroundedAt.current = Date.now();
      } else if (state === 'active') {
        if (backgroundedAt.current && userRef.current) {
          const elapsed = Date.now() - backgroundedAt.current;
          if (elapsed >= INACTIVITY_LIMIT_MS) {
            logoutInternal();
          }
        }
        backgroundedAt.current = null;
      }
    });
    return () => sub.remove();
  }, []);

  const logoutInternal = async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    setAuthToken(null);
    setUser(null);
  };

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
    // res.pending means account exists but awaiting approval — surface as a typed error
    if (res.pending) {
      const err = new Error(res.error || 'Account pending approval');
      err.pending = true;
      throw err;
    }
    await SecureStore.setItemAsync(TOKEN_KEY, res.token);
    setAuthToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const registerBiometric = async (email, password) => {
    await SecureStore.setItemAsync(BIOMETRIC_EMAIL_KEY, email);
    await SecureStore.setItemAsync(BIOMETRIC_PASS_KEY, password);
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
  };

  const removeBiometric = async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(BIOMETRIC_EMAIL_KEY).catch(() => {}),
      SecureStore.deleteItemAsync(BIOMETRIC_PASS_KEY).catch(() => {}),
      SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY).catch(() => {}),
    ]);
  };

  const isBiometricRegistered = async () => {
    const val = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY).catch(() => null);
    return val === 'true';
  };

  const loginWithBiometric = async () => {
    const email = await SecureStore.getItemAsync(BIOMETRIC_EMAIL_KEY);
    const pass = await SecureStore.getItemAsync(BIOMETRIC_PASS_KEY);
    if (!email || !pass) throw new Error('No biometric credentials stored. Please log in with your password.');
    return await login(email, pass);
  };

  const signup = async (name, email, password, role) => {
    const res = await authAPI.signup({ name, email, password, role });
    if (res.pending) return { pending: true }; // caller navigates to PendingApproval
    await SecureStore.setItemAsync(TOKEN_KEY, res.token);
    setAuthToken(res.token);
    setUser(res.user);
    return { pending: false, user: res.user };
  };

  const logout = logoutInternal;

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, registerBiometric, removeBiometric, isBiometricRegistered, loginWithBiometric }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

// Roles with full clinic access
export const isFullAccess = (role) => ['owner', 'doctor', 'manager'].includes(role);
export const isOwner = (role) => role === 'owner';
export const canApproveSignups = (role) => ['owner', 'manager'].includes(role);
