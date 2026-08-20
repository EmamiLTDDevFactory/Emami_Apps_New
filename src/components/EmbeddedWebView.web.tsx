import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet, Linking } from 'react-native';
import { AlertTriangle, RotateCw, ExternalLink } from 'lucide-react-native';
import { colors, fonts, radii } from '../theme/tokens';

interface EmbeddedWebViewProps {
  url: string;
  appName: string;
}

const STUCK_TIMEOUT_MS = 7000;

// react-native-webview has no web implementation, so on web we fall back to a
// plain iframe. Some sites send an X-Frame-Options / CSP frame-ancestors header
// that silently blocks being framed — browsers don't always fire a JS error for
// that, so we also detect a "stuck loading" state via timeout and always keep an
// "Open in new tab" escape hatch visible.
export default function EmbeddedWebView({ url, appName }: EmbeddedWebViewProps) {
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [stuck, setStuck] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setStuck(false);
    timeoutRef.current = setTimeout(() => setStuck(true), STUCK_TIMEOUT_MS);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [reloadKey]);

  const retry = () => {
    setBlocked(false);
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  const openExternally = () => Linking.openURL(url);

  if (blocked) {
    return (
      <View style={styles.center}>
        <View style={styles.errorIcon}>
          <AlertTriangle size={24} color={colors.rust} />
        </View>
        <Text style={styles.errorTitle}>Couldn't load {appName}</Text>
        <Text style={styles.errorSubtitle}>
          This app may not allow being embedded. Try opening it directly instead.
        </Text>
        <Pressable style={styles.retryBtn} onPress={openExternally} hitSlop={8}>
          <ExternalLink size={15} color={colors.white} />
          <Text style={styles.retryText}>Open in new tab</Text>
        </Pressable>
        <Pressable style={styles.retryBtnGhost} onPress={retry} hitSlop={8}>
          <RotateCw size={14} color={colors.inkSoft} />
          <Text style={styles.retryGhostText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle} numberOfLines={1}>{appName}</Text>
        <Pressable style={styles.openBtn} onPress={openExternally} hitSlop={8}>
          <ExternalLink size={13} color={colors.inkSoft} />
          <Text style={styles.openBtnText}>Open in new tab</Text>
        </Pressable>
      </View>

      {stuck && loading && (
        <View style={styles.stuckBanner}>
          <Text style={styles.stuckText}>Taking longer than usual to load.</Text>
          <Pressable onPress={openExternally}>
            <Text style={styles.stuckLink}>Open in new tab instead</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.frameWrap}>
        {React.createElement('iframe', {
          key: reloadKey,
          src: url,
          title: appName,
          style: { border: 0, width: '100%', height: '100%', backgroundColor: colors.appBg },
          onLoad: () => setLoading(false),
          onError: () => setBlocked(true),
        })}
        {loading && !stuck && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.rust} />
            <Text style={styles.loadingText}>Loading {appName}…</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.appBg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topBarTitle: {
    fontSize: 12.5,
    fontFamily: fonts.sansSemiBold,
    color: colors.inkSoft,
    flex: 1,
  },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  openBtnText: {
    fontSize: 12,
    fontFamily: fonts.sansSemiBold,
    color: colors.inkSoft,
  },
  stuckBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    backgroundColor: `${colors.amber}22`,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.amber}55`,
  },
  stuckText: {
    fontSize: 12,
    color: colors.ink,
    fontFamily: fonts.sansMedium,
  },
  stuckLink: {
    fontSize: 12,
    color: colors.rust,
    fontFamily: fonts.sansBold,
  },
  frameWrap: { flex: 1 },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.appBg,
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
    backgroundColor: colors.appBg,
  },
  errorIcon: {
    width: 52,
    height: 52,
    borderRadius: radii.pill,
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
    maxWidth: 320,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.plum,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radii.md,
    marginBottom: 10,
  },
  retryText: {
    color: colors.white,
    fontFamily: fonts.sansSemiBold,
    fontSize: 13.5,
  },
  retryBtnGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  retryGhostText: {
    color: colors.inkSoft,
    fontFamily: fonts.sansMedium,
    fontSize: 12.5,
  },
});
