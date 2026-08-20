import React, { useState } from "react";
import { View, Text, StyleSheet, Alert, Pressable, KeyboardAvoidingView, Platform, ScrollView, Image } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import * as Icons from "phosphor-react-native";

import { api } from "@/lib/config";
import { colors, font } from "@/constants/theme";
import Field from "@/components/ui/Field";
import Card from "@/components/ui/Card";
import GradientButton from "@/components/ui/GradientButton";
import AppHeader from "@/components/ui/AppHeader";
import { useBreakpoint } from "@/utils/responsive";

export default function Register() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isPhone, isTablet } = useBreakpoint();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Missing details", "Please complete all fields.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/register", {
        ZmUser: name.trim(),
        ZmEmail: email.trim(),
        ZmPass: password,
      });
      if (data?.data || data?.success) {
        Alert.alert("Account created", "Your account is ready. Please sign in.", [
          { text: "Sign In", onPress: () => router.replace("/apps/mouldhealthcheck/(auth)/login") },
        ]);
      } else {
        Alert.alert("Registration Failed", "Please try again.");
      }
    } catch (e) {
      Alert.alert("Registration Failed", "Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const cardWidth = isPhone ? "100%" : isTablet ? 460 : 520;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <View style={{ paddingTop: insets.top, paddingHorizontal: 16 }}>
        <AppHeader back />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.scrollArea, { paddingBottom: insets.bottom + 30 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={ZoomIn.duration(500)} style={{ width: "100%", alignItems: "center" }}>
            <Card style={[styles.card, { width: cardWidth, maxWidth: "100%" }]}>
              <Animated.View entering={ZoomIn.duration(500)} style={styles.logoCard}>
                <Image source={require("../../../../assets/logo.png")} style={styles.logo} resizeMode="contain" />
              </Animated.View>
              <Animated.Text entering={FadeInDown.delay(120).duration(500)} style={styles.title}>
                Create your account
              </Animated.Text>
              <Animated.Text entering={FadeInDown.delay(200).duration(500)} style={styles.subtitle}>
                Join the smart mould-care network
              </Animated.Text>

              <Animated.View entering={FadeInDown.delay(280).duration(500)} style={styles.form}>
                <Field
                  label="Full name"
                  placeholder="Your name"
                  value={name}
                  onChangeText={setName}
                  icon={<Icons.User size={22} color={colors.brand} weight="bold" />}
                />
                <Field
                  label="Email"
                  placeholder="you@emami.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  icon={<Icons.At size={22} color={colors.brand} weight="bold" />}
                />
                <Field
                  label="Password"
                  placeholder="Create a password"
                  password
                  value={password}
                  onChangeText={setPassword}
                  icon={<Icons.Lock size={22} color={colors.brand} weight="bold" />}
                />

                <GradientButton
                  title="Create Account"
                  loading={loading}
                  onPress={handleRegister}
                  icon={<Icons.UserPlus size={20} color="#fff" weight="bold" />}
                />
              </Animated.View>

              <Pressable style={styles.footer} onPress={() => router.replace("/apps/mouldhealthcheck/(auth)/login")}>
                <Text style={styles.footerText}>Already registered? </Text>
                <Text style={styles.footerLink}>Sign In</Text>
              </Pressable>
            </Card>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scrollArea: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 22 },
  card: { padding: 32, alignItems: "center" },
  logoCard: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: { width: 54, height: 54 },
  title: { color: colors.ink, fontSize: font.h3, fontWeight: font.black, marginTop: 12, textAlign: "center" },
  subtitle: { color: colors.textMuted, fontSize: font.body, fontWeight: font.medium, marginTop: 6, textAlign: "center" },
  form: { width: "100%", marginTop: 24, gap: 16 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  footerText: { color: colors.textMuted, fontSize: font.body, fontWeight: font.medium },
  footerLink: { color: colors.brand, fontSize: font.body, fontWeight: font.bold },
});
