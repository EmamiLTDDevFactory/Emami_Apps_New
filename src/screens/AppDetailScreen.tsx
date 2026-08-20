import React, { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { appById } from '../data/mockData';
import { colors, fonts, radii } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';
import EmbeddedWebView from '../components/EmbeddedWebView';

type Props = NativeStackScreenProps<RootStackParamList, 'AppDetail'>;

// A relative URL (starting with "/") means the app is genuinely merged into
// this hub's own web build and served same-origin (see mockData.ts) — that
// gets a full page navigation, not a WebView, since it's not a separate site
// being embedded. An absolute URL is a real cross-origin app, which still
// gets the WebView/iframe treatment.
function isSameOriginRoute(url: string) {
  return Platform.OS === 'web' && url.startsWith('/');
}

export default function AppDetailScreen({ route }: Props) {
  const insets = useSafeAreaInsets();
  const app = appById(route.params.appId);

  useEffect(() => {
    if (app?.url && isSameOriginRoute(app.url)) {
      // replace, not href: this hub screen shouldn't stay in history as an
      // entry of its own — otherwise browser Back re-mounts it and its
      // redirect fires again, bouncing straight back into the embedded app.
      window.location.replace(app.url);
    }
  }, [app?.url]);

  if (!app) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Application not found.</Text>
      </View>
    );
  }

  if (app.url && isSameOriginRoute(app.url)) {
    return (
      <View style={styles.notFound}>
        <ActivityIndicator size="large" color={colors.rust} />
      </View>
    );
  }

  if (app.url) {
    return <EmbeddedWebView url={app.url} appName={app.name} />;
  }

  const Icon = app.icon;

  return (
    <ScrollView style={styles.flex} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
      <LinearGradient
        colors={[colors.plum, colors.plumDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.iconBox}>
          <Icon size={24} color={colors.amber} />
        </View>
        <View style={styles.flex1}>
          <Text style={styles.name}>{app.name}</Text>
          <Text style={styles.desc}>{app.desc}</Text>
        </View>
      </LinearGradient>

      <View style={styles.body}>
        <Text style={styles.bodyText}>
          {app.name} isn't wired up to a real backend yet — add its URL to EMBEDDED_APP_URLS in
          src/data/mockData.ts and it'll load here automatically.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.appBg },
  flex1: { flex: 1 },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 24,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: radii.lg,
    backgroundColor: `${colors.amber}2a`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontFamily: fonts.sansBold,
    fontSize: 19,
    color: colors.white,
  },
  desc: {
    color: `${colors.cream}b3`,
    fontSize: 13,
    fontFamily: fonts.sansRegular,
    marginTop: 4,
  },
  body: {
    padding: 32,
    alignItems: 'center',
  },
  bodyText: {
    fontSize: 14,
    color: colors.inkSoft,
    fontFamily: fonts.sansRegular,
    textAlign: 'center',
    lineHeight: 21,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.appBg,
  },
  notFoundText: {
    color: colors.inkSoft,
    fontFamily: fonts.sansMedium,
  },
});
