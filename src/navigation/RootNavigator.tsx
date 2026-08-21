import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';
import { appById } from '../data/mockData';
import { verifySsoToken } from '../lib/authApi';
import LoginScreen from '../screens/LoginScreen';
import AppDetailScreen from '../screens/AppDetailScreen';
import DrawerNavigator from './DrawerNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const SSO_ERROR_MESSAGES: Record<string, string> = {
  domain_not_allowed: 'Please sign in with your @emamigroup.com Microsoft work account.',
  invalid_response: 'Sign-in failed. Please try again.',
  not_configured: 'Single sign-on is not set up yet. Please contact IT.',
};

export default function RootNavigator() {
  const { isLoggedIn, login } = useAuth();
  const [ssoError, setSsoError] = useState<string | null>(null);
  const [verifyingSso, setVerifyingSso] = useState(false);

  // Microsoft SSO completes with a full-page redirect back to this app's own
  // URL (not a fetch response) — the backend's ACS endpoint appends either
  // ?ssoToken=<jwt> (success) or ?ssoError=<code> (failure) to it. Pick that
  // up once on mount, exchange the token for a verified session, then scrub
  // it from the address bar either way so it can't be replayed or bookmarked.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get('ssoToken');
    const errorCode = params.get('ssoError');
    if (!token && !errorCode) return;

    window.history.replaceState({}, '', window.location.pathname);
    if (token) {
      setVerifyingSso(true);
      verifySsoToken(token).then((result) => {
        setVerifyingSso(false);
        if (result.ok) {
          login();
        } else {
          setSsoError(result.error || 'Sign-in could not be verified.');
        }
      });
    } else if (errorCode) {
      setSsoError(SSO_ERROR_MESSAGES[errorCode] || 'Sign-in failed. Please try again.');
    }
  }, []);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isLoggedIn ? (
        <Stack.Screen name="Login">
          {() => (
            <LoginScreen
              error={ssoError}
              verifying={verifyingSso}
              onDismissError={() => setSsoError(null)}
              onLogin={login}
            />
          )}
        </Stack.Screen>
      ) : (
        <>
          <Stack.Screen name="Main" component={DrawerNavigator} />
          <Stack.Screen
            name="AppDetail"
            component={AppDetailScreen}
            options={({ route }) => ({
              headerShown: true,
              title: appById(route.params.appId)?.name ?? '',
              headerStyle: { backgroundColor: colors.plum },
              headerTintColor: colors.white,
              headerShadowVisible: false,
            })}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
