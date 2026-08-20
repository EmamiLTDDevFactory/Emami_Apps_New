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

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    // Expo's web export has no editable index.html template here, so the PWA
    // manifest/meta tags needed for "install to home screen" are injected at
    // runtime instead. Guarded so Fast Refresh doesn't duplicate them.
    const addTag = (tag: 'link' | 'meta', attrs: Record<string, string>) => {
      const selector = Object.entries(attrs)
        .filter(([k]) => k === 'rel' || k === 'name' || k === 'property')
        .map(([k, v]) => `[${k}="${v}"]`)
        .join('');
      if (selector && document.head.querySelector(`${tag}${selector}`)) return;
      const el = document.createElement(tag);
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
      document.head.appendChild(el);
    };

    addTag('link', { rel: 'manifest', href: '/manifest.json' });
    addTag('link', { rel: 'apple-touch-icon', href: '/icon.png' });
    addTag('meta', { name: 'theme-color', content: '#241E3D' });
    addTag('meta', { name: 'apple-mobile-web-app-capable', content: 'yes' });
    addTag('meta', { name: 'apple-mobile-web-app-title', content: 'Emami Apps' });

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    // SEO fallback: server/index.js already injects these server-side (so
    // non-JS crawlers/link-unfurlers see them too), but that only applies
    // when this build is actually served through that Express server. If
    // it's ever served as a plain static export instead (e.g. Amplify),
    // this keeps Google — which does execute JS — still seeing them.
    // addTag's existing-tag check means this is a no-op when the server
    // already added them, so there's no duplicate/conflicting tag either way.
    const SEO_DESCRIPTION =
      "Emami Apps is the single sign-on portal for Emami Group's internal business applications — including Non CTC Expense, RC Portal, Dispatch Tracker, and MoldHealthCheck. Sign in with your Emami Microsoft work account.";
    if (document.title !== 'Emami Apps – Emami Group Employee Portal') {
      document.title = 'Emami Apps – Emami Group Employee Portal';
    }
    addTag('meta', { name: 'description', content: SEO_DESCRIPTION });
    addTag('link', { rel: 'canonical', href: 'https://www.emamiapps.in/' });
    addTag('meta', { property: 'og:title', content: 'Emami Apps – Emami Group Employee Portal' });
    addTag('meta', { property: 'og:description', content: "Single sign-on portal for Emami Group's internal business applications." });
    addTag('meta', { property: 'og:url', content: 'https://www.emamiapps.in/' });
    addTag('meta', { property: 'og:type', content: 'website' });
    addTag('meta', { property: 'og:site_name', content: 'Emami Apps' });

    if (!document.head.querySelector('script[type="application/ld+json"]')) {
      const ld = document.createElement('script');
      ld.type = 'application/ld+json';
      ld.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'Emami Apps',
        url: 'https://www.emamiapps.in',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        description: SEO_DESCRIPTION,
        publisher: { '@type': 'Organization', name: 'Emami Group', url: 'https://www.emamigroup.com' },
      });
      document.head.appendChild(ld);
    }
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
