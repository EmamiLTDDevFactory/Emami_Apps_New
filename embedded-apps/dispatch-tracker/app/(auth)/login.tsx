import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadow } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError } from '@/lib/api';
import { FormError, GhostButton, PrimaryButton, TextField } from '@/components/Form';

/** Ported from page_depot_login() in streamlit_app/app.py — single OTP-based Sign-On Portal. */
export default function LoginScreen() {
  const { requestOtp, verifyOtp } = useAuth();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSendOtp() {
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await requestOtp(email.trim());
      setOtpSent(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleValidateOtp() {
    if (!otp.trim()) {
      setError('Please enter the OTP.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await verifyOtp(email.trim(), otp.trim());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not validate OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.navWhite}>
        <Image source={require('@/assets/images/emami-logo.png')} style={styles.logo} resizeMode="contain" />
      </View>
      <View style={styles.navSys}>
        <Text style={styles.navSysText}>DISPATCH INTELLIGENCE SYSTEM</Text>
        <Text style={styles.navSysSub}>Emami Limited</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Text style={styles.heroKicker}>WELCOME TO</Text>
          <Text style={styles.heroTitle}>Dispatch Intelligence System</Text>
          <View style={styles.heroRule} />
          <Text style={styles.heroDesc}>
            A centralized platform for invoice tracking, dispatch monitoring, depot operations, and national
            logistics analytics.
          </Text>
        </View>

        <View style={[styles.card, shadow.sm]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardIconChip}>
              <Text style={{ fontSize: 20 }}>🔐</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Login</Text>
              <Text style={styles.cardSubtitle}>Access the Dispatch Intelligence System</Text>
            </View>
          </View>

          {!otpSent ? (
            <>
              <View style={styles.notice}>
                <Text style={styles.noticeText}>Enter your registered email address to receive a one-time password.</Text>
              </View>
              <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
              <TextField value={email} onChangeText={setEmail} placeholder="Enter your email" keyboardType="default" />
              <FormError text={error} />
              <PrimaryButton label="Send OTP  →" onPress={handleSendOtp} color={colors.teal} loading={loading} />
            </>
          ) : (
            <>
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  OTP sent to <Text style={{ fontWeight: '700' }}>{email}</Text>
                </Text>
              </View>
              <Text style={styles.fieldLabel}>ENTER OTP</Text>
              <TextField value={otp} onChangeText={setOtp} placeholder="Enter the OTP from your email" keyboardType="numeric" />
              <FormError text={error} />
              <PrimaryButton label="Validate OTP  →" onPress={handleValidateOtp} color={colors.teal} loading={loading} />
              <GhostButton
                label="← Change Email"
                onPress={() => {
                  setOtpSent(false);
                  setOtp('');
                  setError(null);
                }}
              />
            </>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerBrand}>Emami Group</Text>
        <Text style={styles.footerDot}>·</Text>
        <Text style={styles.footerText}>Dispatch Intelligence System</Text>
        <Text style={styles.footerDot}>·</Text>
        <Text style={styles.footerText}>© 2026</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  navWhite: { height: 52, paddingHorizontal: 20, justifyContent: 'center', backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.g200 },
  logo: { height: 30, width: 90 },
  navSys: { height: 32, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.teal },
  navSysText: { color: 'rgba(255,255,255,0.9)', fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },
  navSysSub: { color: 'rgba(255,255,255,0.45)', fontSize: 9 },
  scroll: { padding: 20, paddingBottom: 40 },
  hero: { alignItems: 'center', paddingVertical: 18, paddingHorizontal: 8 },
  heroKicker: { fontSize: 10, fontWeight: '800', color: colors.teal, letterSpacing: 1.5 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: colors.g900, textAlign: 'center', marginTop: 6 },
  heroRule: { width: 40, height: 3, borderRadius: 2, backgroundColor: colors.teal, marginVertical: 10 },
  heroDesc: { fontSize: 12, color: colors.gray, textAlign: 'center', lineHeight: 19 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderTopWidth: 3, borderTopColor: colors.teal, padding: 20, marginTop: 8 },
  cardHeaderRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 8 },
  cardIconChip: { width: 42, height: 42, borderRadius: 10, backgroundColor: colors.navyLt, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 17, fontWeight: '800', color: colors.g900 },
  cardSubtitle: { fontSize: 11, color: colors.g400, marginTop: 2 },
  notice: { backgroundColor: colors.greenLt, borderWidth: 1, borderColor: colors.greenBd, borderRadius: 8, padding: 10, marginTop: 12, marginBottom: 4 },
  noticeText: { fontSize: 11.5, color: colors.greenDk, lineHeight: 17 },
  infoBox: { backgroundColor: colors.blueLt, borderWidth: 1, borderColor: colors.blueBd, borderRadius: 8, padding: 10, marginTop: 12, marginBottom: 4 },
  infoText: { fontSize: 12, color: colors.blueDk },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: colors.g500, textTransform: 'uppercase', letterSpacing: 0.7, marginTop: 12, marginBottom: 5 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, backgroundColor: colors.surface, borderTopWidth: 2, borderTopColor: colors.g200 },
  footerBrand: { fontSize: 12, fontWeight: '600', color: colors.navy },
  footerText: { fontSize: 11, fontWeight: '500', color: colors.g500 },
  footerDot: { fontSize: 11, color: colors.g400 },
});
