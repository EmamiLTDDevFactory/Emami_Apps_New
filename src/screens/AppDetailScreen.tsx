import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { appById } from '../data/mockData';
import { colors, fonts, radii } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';
import EmbeddedWebView from '../components/EmbeddedWebView';

type Props = NativeStackScreenProps<RootStackParamList, 'AppDetail'>;

export default function AppDetailScreen({ route }: Props) {
  const insets = useSafeAreaInsets();
  const app = appById(route.params.appId);

  if (!app) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Application not found.</Text>
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
  flex: { flex: 1, backgroundColor: colors.cream2 },
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
    fontFamily: fonts.serifSemiBold,
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
  },
  notFoundText: {
    color: colors.inkSoft,
    fontFamily: fonts.sansMedium,
  },
});
