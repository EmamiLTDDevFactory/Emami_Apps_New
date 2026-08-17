import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radii } from '../theme/tokens';
import EmpAppMark from '../components/EmpAppMark';

interface LoginScreenProps {
  onLogin: () => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('r.sen@emamigroup.com');
  const [password, setPassword] = useState('••••••••••');
  const [loading, setLoading] = useState(false);

  const submit = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLogin();
    }, 700);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <LinearGradient
          colors={[colors.rust, colors.plum, colors.plumDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + 20 }]}
        >
          <View style={styles.brandRow}>
            <EmpAppMark size={32} dark />
            <Text style={styles.brandText}>EMAMI</Text>
          </View>

          <View style={styles.heroTextBlock}>
            <Text style={styles.eyebrow}>Enterprise Application Hub</Text>
            <Text style={styles.headline}>Every business application, one door in.</Text>
            <Text style={styles.description}>
              Finance, HR, procurement, sales and analytics — sign in once to reach every
              application your role can use, without hunting for separate links.
            </Text>
          </View>

          <Text style={styles.copyright}>© {new Date().getFullYear()} Emami Limited. Internal use only.</Text>
        </LinearGradient>

        <View style={styles.formWrap}>
          <Text style={styles.signInTitle}>Sign in</Text>
          <Text style={styles.signInSubtitle}>Use your Emami corporate credentials.</Text>

          <Text style={styles.label}>Work email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
          />

          <Pressable style={styles.forgotWrap}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </Pressable>

          <Pressable onPress={submit} style={styles.submitBtn} disabled={loading}>
            {loading && <ActivityIndicator size="small" color={colors.white} style={{ marginRight: 8 }} />}
            <Text style={styles.submitText}>{loading ? 'Signing in…' : 'Sign in'}</Text>
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable onPress={onLogin} style={styles.ssoBtn}>
            <Text style={styles.ssoText}>Continue with SSO</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.white },
  scroll: { flexGrow: 1 },
  hero: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 40,
  },
  brandText: {
    color: colors.white,
    fontFamily: fonts.sansSemiBold,
    fontSize: 15,
    letterSpacing: 0.3,
  },
  heroTextBlock: {
    marginBottom: 24,
  },
  eyebrow: {
    color: `${colors.cream}cc`,
    fontSize: 12.5,
    fontFamily: fonts.sansBold,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  headline: {
    fontFamily: fonts.serifSemiBold,
    color: colors.white,
    fontSize: 28,
    lineHeight: 34,
  },
  description: {
    color: `${colors.cream}b3`,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 14,
    fontFamily: fonts.sansRegular,
  },
  copyright: {
    color: `${colors.cream}80`,
    fontSize: 11.5,
    fontFamily: fonts.sansRegular,
  },
  formWrap: {
    padding: 24,
  },
  signInTitle: {
    fontFamily: fonts.serifSemiBold,
    fontSize: 24,
    color: colors.ink,
    marginBottom: 6,
  },
  signInSubtitle: {
    color: colors.inkSoft,
    fontSize: 14,
    fontFamily: fonts.sansRegular,
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: colors.cream2,
    marginBottom: 16,
    fontFamily: fonts.sansRegular,
  },
  forgotWrap: {
    alignSelf: 'flex-end',
    marginBottom: 22,
  },
  forgotText: {
    fontSize: 13,
    color: colors.rust,
    fontFamily: fonts.sansSemiBold,
  },
  submitBtn: {
    backgroundColor: colors.plum,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  submitText: {
    color: colors.white,
    fontFamily: fonts.sansSemiBold,
    fontSize: 14.5,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: 12,
    color: colors.inkSoft,
    fontFamily: fonts.sansRegular,
  },
  ssoBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  ssoText: {
    color: colors.ink,
    fontFamily: fonts.sansSemiBold,
    fontSize: 14.5,
  },
});
