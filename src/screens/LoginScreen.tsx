import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator, Linking,
} from 'react-native';
import { BadgeCheck } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { colors, fonts, radii } from '../theme/tokens';
import EmpAppMark from '../components/EmpAppMark';
import { getMicrosoftSignInUrl } from '../lib/authApi';

interface LoginScreenProps {
  error?: string | null;
  verifying?: boolean;
  onDismissError?: () => void;
  onLogin?: () => void;
}

/**
 * TEMPORARY — real Microsoft SSO is fully built and confirmed working on the request side
 * (backend/server.js is a working SAML SP; a local test click-through reached Emami's actual
 * branded Microsoft login page). It can't reliably complete end-to-end in production yet though:
 * the deployed Lambda's Function URL intermittently/currently returns 403 on public traffic (an
 * AWS-account-level access issue, unrelated to this app's code, still being chased with AWS).
 * Rather than gate on one or the other, both sign-in options are offered side by side — "Sign in
 * with Microsoft" for whoever it works for, "Continue with Temporary Access" as a guaranteed
 * fallback that never depends on the Lambda. TO REVERT: set this back to false and remove the
 * temporary-access button once the Function URL issue is resolved for good.
 */
const SHOW_TEMP_SIGNIN = true;

const APPS_GRADIENT = ['#2563EB', '#7C3AED', '#16A34A', '#F59E0B', '#DB2777'] as const;

// Purely decorative accents for this screen only — Login intentionally
// breaks from the brand palette here (same as APPS_GRADIENT above), so
// these stay local rather than being promoted into theme/tokens.ts.
const LOGIN_ACCENTS = {
  blobTop: '#F7B9A0',
  blobBottom: '#A9C9F5',
  blobMid: '#F5C9E0',
  haloRingOuter: 'rgba(31,27,51,0.12)',
  haloRingInner: 'rgba(31,27,51,0.1)',
  haloDotBlue: '#2563EB',
  haloDotPink: '#DB2777',
  taglineAccent: '#0D9488',
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

/** Classic four-square Microsoft glyph — lucide has no brand icon for this, so it's drawn directly. */
function MicrosoftGlyph() {
  const squares = ['#F25022', '#7FBA00', '#00A4EF', '#FFB900'];
  return (
    <View style={styles.msGlyph}>
      {squares.map((color) => (
        <View key={color} style={[styles.msGlyphSquare, { backgroundColor: color }]} />
      ))}
    </View>
  );
}

export default function LoginScreen({ error, verifying, onDismissError, onLogin }: LoginScreenProps) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [localError, setLocalError] = useState('');

  const trimmedEmail = email.trim().toLowerCase();
  const looksLikeEmail = /^\S+@\S+\.\S+$/.test(trimmedEmail);

  // Independent of the email field — Microsoft's own sign-in page asks for the account, and
  // backend/server.js's ACS handler enforces the @emamigroup.com domain check server-side.
  const signInWithMicrosoft = () => {
    setLocalError('');
    onDismissError?.();
    const url = getMicrosoftSignInUrl();
    if (Platform.OS === 'web') {
      window.location.href = url;
    } else {
      // Native completion (deep-linking back into the app after SSO) isn't
      // wired up yet — this app is served as a web hub today.
      Linking.openURL(url).catch(() => {});
    }
  };

  const continueTemporarily = () => {
    setLocalError('');
    onDismissError?.();
    if (!trimmedEmail) {
      setLocalError('Enter your email to continue.');
      return;
    }
    if (!looksLikeEmail) {
      setLocalError('Enter a valid email address to continue.');
      return;
    }
    onLogin?.();
  };

  const shownError = error || localError;

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
            <Text style={styles.welcome}>{verifying ? 'Signing you in…' : 'Welcome back'}</Text>
            <Text style={styles.subtitle}>
              {verifying ? 'Verifying your Microsoft sign-in.' : 'Choose how you’d like to sign in'}
            </Text>

            {verifying ? (
              <ActivityIndicator size="small" color={colors.plumDeep} style={{ marginTop: 10 }} />
            ) : (
              <>
                {!!shownError && <Text style={styles.error}>{shownError}</Text>}

                <Pressable onPress={signInWithMicrosoft} style={styles.primaryBtn}>
                  <MicrosoftGlyph />
                  <Text style={styles.primaryBtnText}>Sign in with Microsoft</Text>
                </Pressable>

                {SHOW_TEMP_SIGNIN && (
                  <>
                    <View style={styles.dividerRow}>
                      <View style={styles.dividerLine} />
                      <Text style={styles.dividerText}>OR</Text>
                      <View style={styles.dividerLine} />
                    </View>

                    <TextInput
                      style={styles.input}
                      value={email}
                      onChangeText={(v) => { setEmail(v); setLocalError(''); onDismissError?.(); }}
                      placeholder="you@company.com"
                      placeholderTextColor={colors.inkSoft}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      onSubmitEditing={continueTemporarily}
                    />

                    <Pressable onPress={continueTemporarily} style={styles.secondaryBtn}>
                      <Text style={styles.secondaryBtnText}>Continue with Temporary Access</Text>
                    </Pressable>
                  </>
                )}
              </>
            )}

            <Text style={styles.helper}>
              {SHOW_TEMP_SIGNIN
                ? 'Microsoft sign-in is being finalized — use Temporary Access if it doesn’t complete.'
                : 'Only @emamigroup.com accounts can sign in. No access? Contact IT.'}
            </Text>
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
    backgroundColor: LOGIN_ACCENTS.blobTop,
    top: -200,
    right: -160,
  },
  blobBottom: {
    width: 360,
    height: 360,
    backgroundColor: LOGIN_ACCENTS.blobBottom,
    bottom: -160,
    left: -130,
  },
  blobMid: {
    width: 300,
    height: 300,
    backgroundColor: LOGIN_ACCENTS.blobMid,
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
  input: {
    width: '100%',
    backgroundColor: colors.cream2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontFamily: fonts.sansMedium,
    fontSize: 14.5,
    color: colors.ink,
    marginBottom: 8,
  },
  error: {
    width: '100%',
    fontFamily: fonts.sansMedium,
    fontSize: 12.5,
    color: '#DC2626',
    marginTop: 4,
    marginBottom: 6,
  },
  primaryBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.plumDeep,
    borderRadius: radii.pill,
    paddingVertical: 14,
    gap: 10,
    marginTop: 10,
  },
  primaryBtnText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14.5,
    color: colors.white,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 10,
    marginTop: 20,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10.5,
    letterSpacing: 0.8,
    color: colors.inkSoft,
  },
  secondaryBtn: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cream2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingVertical: 14,
    marginTop: 10,
  },
  secondaryBtnText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14.5,
    color: colors.ink,
  },
  msGlyph: {
    width: 16,
    height: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 1,
  },
  msGlyphSquare: {
    width: 7.5,
    height: 7.5,
  },
  helper: {
    marginTop: 20,
    fontFamily: fonts.sansRegular,
    fontSize: 11.5,
    color: colors.inkSoft,
    textAlign: 'center',
  },
});
