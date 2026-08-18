import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { CheckCircle2, LayoutDashboard, Users, Briefcase, BarChart3, Bell, BadgeCheck } from 'lucide-react-native';
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

const FEATURES = [
  { label: 'Dashboard', icon: LayoutDashboard, color: '#2563EB' },
  { label: 'People', icon: Users, color: '#7C3AED' },
  { label: 'Workflows', icon: Briefcase, color: '#16A34A' },
  { label: 'Analytics', icon: BarChart3, color: '#F59E0B' },
  { label: 'Notifications', icon: Bell, color: '#DB2777' },
];

function FeatureDiamond({ label, icon: Icon, color }: (typeof FEATURES)[number]) {
  return (
    <View style={diamondStyles.wrap}>
      <View style={[diamondStyles.diamond, { backgroundColor: color }]}>
        <View style={diamondStyles.iconWrap}>
          <Icon size={16} color={colors.white} strokeWidth={2.3} />
        </View>
      </View>
      <Text style={diamondStyles.label}>{label}</Text>
    </View>
  );
}

const diamondStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    width: 64,
  },
  diamond: {
    width: 38,
    height: 38,
    borderRadius: 10,
    transform: [{ rotate: '45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: colors.plumDeep,
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  iconWrap: {
    transform: [{ rotate: '-45deg' }],
  },
  label: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 9.5,
    letterSpacing: 0.3,
    color: colors.inkSoft,
    textAlign: 'center',
  },
});

const APPS_GRADIENT = ['#2563EB', '#16A34A', '#F59E0B', '#DB2777'] as const;

function AppsWordmark() {
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
            </View>
            <EmpAppMark size={68} />

            <AppsWordmark />
            <Text style={styles.tagline}>ONE ACCESS. ENDLESS POSSIBILITIES.</Text>

            <View style={styles.featureRow}>
              {FEATURES.map((f) => (
                <FeatureDiamond key={f.label} {...f} />
              ))}
            </View>

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
    opacity: 0.45,
  },
  blobTop: {
    width: 380,
    height: 380,
    backgroundColor: '#C7BEF5',
    top: -160,
    right: -120,
  },
  blobBottom: {
    width: 320,
    height: 320,
    backgroundColor: '#F5C9E0',
    bottom: -140,
    left: -100,
  },
  blobMid: {
    width: 260,
    height: 260,
    backgroundColor: '#BEE7E0',
    top: 120,
    left: -110,
    opacity: 0.35,
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
    top: -56,
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  haloRing: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1.5,
  },
  haloRingOuter: {
    width: 180,
    height: 180,
    borderColor: 'rgba(91,79,224,0.18)',
  },
  haloRingInner: {
    width: 132,
    height: 132,
    borderColor: 'rgba(219,39,119,0.18)',
  },
  appsText: {
    fontFamily: fonts.sansBold,
    fontSize: 46,
    letterSpacing: 1,
    color: '#000',
  },
  tagline: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 1.6,
    color: colors.ink,
    marginTop: 6,
    textAlign: 'center',
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 30,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.plumDeep,
    borderRadius: radii.pill,
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginTop: 24,
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
