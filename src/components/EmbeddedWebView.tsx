import React, { useCallback, useRef, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, BackHandler, StyleSheet, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import WebView, { WebViewNavigation } from 'react-native-webview';
import { AlertTriangle, RotateCw } from 'lucide-react-native';
import { colors, fonts, radii } from '../theme/tokens';

interface EmbeddedWebViewProps {
  url: string;
  appName: string;
}

function getOriginWhitelist(url: string) {
  try {
    const { origin } = new URL(url);
    // Allow the app's own origin (any path) plus its auth/subdomain redirects.
    return [`${origin}/*`, `https://*.${new URL(url).hostname.split('.').slice(-2).join('.')}/*`];
  } catch {
    return ['https://*'];
  }
}

export default function EmbeddedWebView({ url, appName }: EmbeddedWebViewProps) {
  const webviewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const originWhitelist = useRef(getOriginWhitelist(url)).current;

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return;
      const onBackPress = () => {
        if (canGoBack && webviewRef.current) {
          webviewRef.current.goBack();
          return true;
        }
        return false;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [canGoBack])
  );

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    setCanGoBack(navState.canGoBack);
  };

  const retry = () => {
    setError(null);
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  if (error) {
    return (
      <View style={styles.center}>
        <View style={styles.errorIcon}>
          <AlertTriangle size={24} color={colors.rust} />
        </View>
        <Text style={styles.errorTitle}>Couldn't load {appName}</Text>
        <Text style={styles.errorSubtitle}>{error}</Text>
        <Pressable style={styles.retryBtn} onPress={retry}>
          <RotateCw size={15} color={colors.white} />
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <WebView
        key={reloadKey}
        ref={webviewRef}
        source={{ uri: url }}
        originWhitelist={originWhitelist}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onNavigationStateChange={handleNavigationStateChange}
        onError={(e) => setError(e.nativeEvent.description || 'The app could not be reached.')}
        onHttpError={(e) => {
          if (e.nativeEvent.statusCode >= 500) {
            setError(`Server error (${e.nativeEvent.statusCode}). Please try again.`);
          }
        }}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        startInLoadingState={false}
        style={styles.webview}
      />
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.rust} />
          <Text style={styles.loadingText}>Loading {appName}…</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.cream2 },
  webview: { flex: 1, backgroundColor: colors.cream2 },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cream2,
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: colors.inkSoft,
    fontFamily: fonts.sansMedium,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: colors.cream2,
  },
  errorIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: `${colors.rust}17`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 6,
  },
  errorSubtitle: {
    fontSize: 13,
    color: colors.inkSoft,
    fontFamily: fonts.sansRegular,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.plum,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radii.md,
  },
  retryText: {
    color: colors.white,
    fontFamily: fonts.sansSemiBold,
    fontSize: 13.5,
  },
});
