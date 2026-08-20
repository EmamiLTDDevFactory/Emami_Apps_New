import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { CheckCircle2, BadgeCheck } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import Svg, { Path, Circle } from 'react-native-svg';
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

// Purely decorative accents for this screen only — Login intentionally
// breaks from the brand palette here (same as APPS_GRADIENT above), so
// these stay local rather than being promoted into theme/tokens.ts.
const LOGIN_ACCENTS = {
  haloRingOuter: 'rgba(31,27,51,0.12)',
  haloRingInner: 'rgba(31,27,51,0.1)',
  haloDotBlue: '#2563EB',
  haloDotPink: '#DB2777',
  taglineAccent: '#0D9488',
  lineRust: '#DB2777',
  lineTeal: '#0D9488',
  lineBlue: '#2563EB',
  lineAmber: '#F59E0B',
  nodeTeal: '#0D9488',
  nodeOrange: '#F59E0B',
} as const;

// One-off hero-card radius (bigger than any step in the shared `radii`
// scale) — not a missing token, just this card's specific treatment.
const CARD_RADIUS = radii.xxxl + 6;

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
      <View style={styles.bgDecoration} pointerEvents="none">
        <Svg width="100%" height="100%" viewBox="0 0 400 800" preserveAspectRatio="none">
          <Path d="M-20,120 C 80,90 140,150 220,110 S 380,60 440,100" stroke={LOGIN_ACCENTS.lineRust} strokeWidth={1.2} fill="none" opacity={0.28} />
          <Path d="M-20,205 C 60,175 140,235 240,185 S 360,145 440,195" stroke={LOGIN_ACCENTS.lineTeal} strokeWidth={1.2} fill="none" opacity={0.24} />
          <Path d="M-20,290 C 70,320 150,265 250,305 S 370,340 440,300" stroke={LOGIN_ACCENTS.lineBlue} strokeWidth={1} fill="none" opacity={0.16} />
          <Path d="M-20,615 C 90,645 150,585 250,625 S 370,675 440,635" stroke={LOGIN_ACCENTS.lineBlue} strokeWidth={1.2} fill="none" opacity={0.22} />
          <Path d="M-20,700 C 100,670 160,730 260,690 S 380,650 440,700" stroke={LOGIN_ACCENTS.lineAmber} strokeWidth={1.2} fill="none" opacity={0.2} />
          <Circle cx={46} cy={92} r={4} fill={LOGIN_ACCENTS.nodeTeal} opacity={0.75} />
          <Circle cx={46} cy={92} r={11} stroke={LOGIN_ACCENTS.nodeTeal} strokeWidth={1} fill="none" opacity={0.3} />
          <Circle cx={358} cy={128} r={4} fill={LOGIN_ACCENTS.nodeOrange} opacity={0.75} />
          <Circle cx={358} cy={128} r={11} stroke={LOGIN_ACCENTS.nodeOrange} strokeWidth={1} fill="none" opacity={0.3} />
          <Circle cx={30} cy={660} r={3} fill={LOGIN_ACCENTS.lineRust} opacity={0.5} />
          <Circle cx={370} cy={710} r={3} fill={LOGIN_ACCENTS.lineTeal} opacity={0.5} />
        </Svg>
      </View>

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
  bgDecoration: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
    borderColor: LOGIN_ACCENTS.haloRingOuter,
  },
  haloRingInner: {
    width: 142,
    height: 142,
    borderColor: LOGIN_ACCENTS.haloRingInner,
  },
  haloDot: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  haloDotBlue: {
    backgroundColor: LOGIN_ACCENTS.haloDotBlue,
    top: 24,
    left: 18,
  },
  haloDotPink: {
    backgroundColor: LOGIN_ACCENTS.haloDotPink,
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
    color: LOGIN_ACCENTS.taglineAccent,
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
    borderRadius: CARD_RADIUS,
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
