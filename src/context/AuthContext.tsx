import React, { createContext, useContext, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_STORAGE_KEY = 'emami_apps_is_logged_in';

interface AuthContextValue {
  isLoggedIn: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({
  children,
  initialLoggedIn = false,
}: {
  children: React.ReactNode;
  initialLoggedIn?: boolean;
}) {
  const [isLoggedIn, setIsLoggedIn] = useState(initialLoggedIn);

  const value = useMemo(
    () => ({
      isLoggedIn,
      login: () => {
        setIsLoggedIn(true);
        AsyncStorage.setItem(AUTH_STORAGE_KEY, 'true').catch(() => {});
      },
      logout: () => {
        setIsLoggedIn(false);
        AsyncStorage.removeItem(AUTH_STORAGE_KEY).catch(() => {});
      },
    }),
    [isLoggedIn]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export async function loadPersistedLoginState(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(AUTH_STORAGE_KEY)) === 'true';
  } catch {
    return false;
  }
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
