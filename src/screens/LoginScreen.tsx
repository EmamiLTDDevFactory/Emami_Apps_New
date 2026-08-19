import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { CheckCircle2, BadgeCheck } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { colors, fonts, radii } from '../theme/tokens';
import EmpAppMark from '../components/EmpAppMark';

interface LoginScreenProps {
  onLogin: () => void;
}

function MicrosoftMark() {
  return (
    <View style={msStyles.grid}>
      <View style={[msStyles.tile, { backgroundColor: '#F35325' }]} />
      <View style={[msStyles.tile, { backgroundColor: '#81BC06' }]} />
      <View style={[msStyles.tile, { backgroundColor: '#05A6F0' }]} />
      <View style={[msStyles.tile, { backgroundColor: '#FFBA08' }]} />
    </View>
  );
}

const msStyles = StyleSheet.create({
  grid: {
    width: 18,
    height: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  tile: {
    width: 8,
    height: 8,
  },
});

const APPS_GRADIENT = ['#2563EB', '#7C3AED', '#16A34A', '#F59E0B', '#DB2777'] as const;

function AppsWordmark() {
  // react-native-web doesn't actually mask with @react-native-masked-view —
  // it silently falls back to rendering the opaque mask text, which is why
  // this showed up solid black on web. Use the CSS gradient-text trick there
  // instead; MaskedView works correctly on native (iOS/Android).
  if (Platform.OS === 'web') {
    const webGradientStyle: any = {
      backgroundImage: `linear-gradient(90deg, ${APPS_GRADIENT.join(', ')})`,
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      color: 'transparent',
      WebkitTextFillColor: 'transparent',
    };
    return <Text style={[styles.appsText, webGradientStyle]}>APPS</Text>;
  }

  return (
    <MaskedView maskElement={<Text style={styles.appsText}>APPS</Text>}>
      <LinearGradient
        colors={APPS_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text style={[styles.appsText, { opacity: 0 }]}>APPS</Text>
      </LinearGradient>
    </MaskedView>
  );
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const insets = useSafeAreaInsets();
  const [email] = useState('sudiptoroy@emamigroup.com');
  const [loading, setLoading] = useState(false);

  const submit = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLogin();
    }, 700);
  };

  return (
    <View style={styles.root}>
      <View style={[styles.blob, styles.blobTop]} pointerEvents="none" />
      <View style={[styles.blob, styles.blobBottom]} pointerEvents="none" />
      <View style={[styles.blob, styles.blobMid]} pointerEvents="none" />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.hero}>
            <View style={styles.logoHalo} pointerEvents="none">
              <View style={[styles.haloRing, styles.haloRingOuter]} />
              <View style={[styles.haloRing, styles.haloRingInner]} />
              <View style={[styles.haloDot, styles.haloDotBlue]} />
              <View style={[styles.haloDot, styles.haloDotPink]} />
            </View>
            <View style={styles.logoTile}>
              <EmpAppMark size={56} />
            </View>

            <AppsWordmark />
            <Text style={styles.tagline}>
              <Text style={styles.taglinePrimary}>ONE ACCESS. </Text>
              <Text style={styles.taglineAccent}>ENDLESS POSSIBILITIES.</Text>
            </Text>

            <View style={styles.badgePill}>
              <BadgeCheck size={13} color={colors.white} />
              <Text style={styles.badgeText}>EMAMI APPS. EMPOWERING EVERY POSSIBILITY.</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.welcome}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in with your Microsoft work account</Text>

            <View style={styles.emailPill}>
              <Text style={styles.emailText}>{email}</Text>
              <CheckCircle2 size={16} color={colors.green} />
            </View>

            <Pressable onPress={submit} style={styles.msBtn} disabled={loading}>
              {loading ? (
                <ActivityIndicator size="small" color={colors.ink} style={{ marginRight: 10 }} />
              ) : (
                <MicrosoftMark />
              )}
              <Text style={styles.msBtnText}>{loading ? 'Signing in…' : 'Sign in with Microsoft'}</Text>
            </Pressable>

            <Text style={styles.helper}>Use your Emami Microsoft account. No access? Contact IT.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.cream2,
    overflow: 'hidden',
  },
  flex: { flex: 1 },
  blob: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.22,
  },
  blobTop: {
    width: 420,
    height: 420,
    backgroundColor: '#F7B9A0',
    top: -200,
    right: -160,
  },
  blobBottom: {
    width: 360,
    height: 360,
    backgroundColor: '#A9C9F5',
    bottom: -160,
    left: -130,
  },
  blobMid: {
    width: 300,
    height: 300,
    backgroundColor: '#F5C9E0',
    top: 100,
    left: -130,
    opacity: 0.16,
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  hero: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    marginBottom: 28,
  },
  logoHalo: {
    position: 'absolute',
    top: -50,
    width: 190,
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
  },
  haloRing: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
  },
  haloRingOuter: {
    width: 190,
    height: 190,
    borderColor: 'rgba(31,27,51,0.12)',
  },
  haloRingInner: {
    width: 142,
    height: 142,
    borderColor: 'rgba(31,27,51,0.1)',
  },
  haloDot: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  haloDotBlue: {
    backgroundColor: '#2563EB',
    top: 24,
    left: 18,
  },
  haloDotPink: {
    backgroundColor: '#DB2777',
    top: 24,
    right: 18,
  },
  logoTile: {
    width: 96,
    height: 96,
    borderRadius: radii.xxl,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.plumDeep,
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  appsText: {
    fontFamily: fonts.sansBold,
    fontSize: 46,
    letterSpacing: 0,
    color: '#000',
  },
  tagline: {
    fontSize: 11,
    letterSpacing: 1.4,
    marginTop: 8,
    textAlign: 'center',
  },
  taglinePrimary: {
    fontFamily: fonts.sansBold,
    color: colors.ink,
  },
  taglineAccent: {
    fontFamily: fonts.sansBold,
    color: '#0D9488',
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.plumDeep,
    borderRadius: radii.pill,
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginTop: 20,
  },
  badgeText: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 0.6,
    color: colors.white,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.white,
    borderRadius: radii.xxxl + 6,
    paddingVertical: 32,
    paddingHorizontal: 28,
    alignItems: 'center',
    shadowColor: colors.plumDeep,
    shadowOpacity: 0.12,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 16 },
    elevation: 8,
  },
  welcome: {
    fontFamily: fonts.sansBold,
    fontSize: 22,
    color: colors.ink,
  },
  subtitle: {
    fontFamily: fonts.sansRegular,
    fontSize: 13.5,
    color: colors.inkSoft,
    marginTop: 6,
    marginBottom: 24,
    textAlign: 'center',
  },
  emailPill: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cream2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 14,
  },
  emailText: {
    fontFamily: fonts.sansMedium,
    fontSize: 13.5,
    color: colors.ink,
  },
  msBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingVertical: 14,
    gap: 12,
    shadowColor: colors.ink,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  msBtnText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14.5,
    color: colors.ink,
  },
  helper: {
    marginTop: 20,
    fontFamily: fonts.sansRegular,
    fontSize: 11.5,
    color: colors.inkSoft,
    textAlign: 'center',
  },
});
