import React, { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
  IBMPlexSans_700Bold,
} from '@expo-google-fonts/ibm-plex-sans';
import {
  IBMPlexSerif_500Medium,
  IBMPlexSerif_600SemiBold,
} from '@expo-google-fonts/ibm-plex-serif';

import { AuthProvider, loadPersistedLoginState } from './src/context/AuthContext';
import { FavoritesProvider } from './src/context/FavoritesContext';
import { NotificationsUIProvider } from './src/context/NotificationsUIContext';
import RootNavigator from './src/navigation/RootNavigator';
import { linking } from './src/navigation/linking';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [fontsLoaded] = useFonts({
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
    IBMPlexSans_700Bold,
    IBMPlexSerif_500Medium,
    IBMPlexSerif_600SemiBold,
  });

  const [authChecked, setAuthChecked] = useState(false);
  const [initialLoggedIn, setInitialLoggedIn] = useState(false);

  useEffect(() => {
    loadPersistedLoginState().then((loggedIn) => {
      setInitialLoggedIn(loggedIn);
      setAuthChecked(true);
    });
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    // When the browser restores this page from bfcache (e.g. hitting Back
    // after a full-page navigation into an embedded app), it can resurrect
    // an old in-memory copy of this bundle instead of the current one.
    // Force a real reload so the page that's showing always matches what's
    // actually deployed.
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        window.location.reload();
      }
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  const ready = fontsLoaded && authChecked;

  const onLayoutRootView = useCallback(async () => {
    if (ready) {
      await SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <SafeAreaProvider>
        <AuthProvider initialLoggedIn={initialLoggedIn}>
          <FavoritesProvider>
            <NotificationsUIProvider>
              <NavigationContainer linking={linking}>
                <StatusBar style="dark" />
                <RootNavigator />
              </NavigationContainer>
            </NotificationsUIProvider>
          </FavoritesProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
