import Card from "@/components/ui/Card";
import GradientButton from "@/components/ui/GradientButton";
import { colors, font, radius } from "@/constants/theme";
import { useBreakpoint } from "@/utils/responsive";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Icons from "phosphor-react-native";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const LOGO_BASE64 = 'data:image/png;base64,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';

const FEATURES = [
  { Icon: Icons.ClipboardText, title: "Guided checklists", sub: "Every mould subsystem, step by step" },
  { Icon: Icons.SealCheck, title: "Track approvals", sub: "See submissions & status in real time" },
  { Icon: Icons.DeviceMobile, title: "Built for the floor", sub: "Fast, user-friendly, on your phone" },
];

export default function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isPhone, isTablet } = useBreakpoint();

  const cardWidth = isPhone ? "100%" : isTablet ? 480 : 560;
  const contentPad = isPhone ? 22 : 40;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <View style={[styles.scrollArea, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24, paddingHorizontal: contentPad }]}>
        <Animated.View entering={ZoomIn.duration(600)} style={{ width: "100%", alignItems: "center" }}>
          <Card style={[styles.card, { width: cardWidth, maxWidth: "100%" }]}>
            <View style={styles.logoPill}>
              <Image source={{ uri: LOGO_BASE64 }} style={styles.logo} resizeMode="contain" />
            </View>

            <Animated.Text entering={FadeInDown.delay(180).duration(600)} style={styles.heroTitle}>
              Mold Health Inspection Portal
            </Animated.Text>
            <Animated.Text entering={FadeInDown.delay(280).duration(600)} style={styles.heroSub}>
              The smart way to inspect &amp; maintain your moulds
            </Animated.Text>

            <View style={styles.featuresContainer}>
              {FEATURES.map((f, i) => (
                <Animated.View
                  key={f.title}
                  entering={FadeInDown.delay(400 + i * 100).duration(600)}
                  style={styles.featureRow}
                >
                  <View style={styles.featureIcon}>
                    <f.Icon size={20} color={colors.brand} weight="fill" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.featureTitle}>{f.title}</Text>
                    <Text style={styles.featureSub}>{f.sub}</Text>
                  </View>
                </Animated.View>
              ))}
            </View>

            <Animated.View entering={FadeIn.delay(750).duration(600)} style={{ width: "100%" }}>
              <GradientButton
                title="Get Started"
                icon={<Icons.ArrowRight size={20} color="#fff" weight="bold" />}
                onPress={() => router.push("/apps/mouldhealthcheck/(auth)/login")}
              />
              <Pressable style={styles.signupRow} onPress={() => router.push("/apps/mouldhealthcheck/(auth)/register")} />
            </Animated.View>
          </Card>

          <Text style={styles.footerText}>© 2026 Mold Inspection Portal - Emami Limited. All rights reserved.</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scrollArea: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    padding: 32,
    alignItems: "center",
  },
  logoPill: {
    backgroundColor: "transparent",
    marginBottom: 20,
  },
  logo: { width: 100, height: 100 },
  heroTitle: {
    color: colors.ink,
    fontSize: font.h3,
    fontWeight: font.black,
    marginBottom: 8,
    textAlign: "center",
  },
  heroSub: {
    color: colors.textMuted,
    fontSize: font.sub,
    fontWeight: font.medium,
    textAlign: "center",
    marginBottom: 28,
    paddingHorizontal: 12,
    lineHeight: 22,
  },
  featuresContainer: { width: "100%", gap: 14, marginBottom: 28 },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    borderRadius: radius._15,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  featureTitle: { fontSize: font.body, fontWeight: font.bold, color: colors.ink },
  featureSub: { fontSize: font.micro, color: colors.textMuted, marginTop: 2 },
  signupRow: { flexDirection: "row", justifyContent: "center", marginTop: 16 },
  footerText: {
    marginTop: 24,
    color: colors.textFaint,
    fontSize: font.micro,
    fontWeight: font.medium,
    textAlign: "center",
  },
});
