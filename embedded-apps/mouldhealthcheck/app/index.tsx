import React, { useEffect } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import Animated, { FadeIn, FadeInDown, ZoomIn } from "react-native-reanimated";
import GlassSurface from "@/components/ui/GlassSurface";
import { gradients, font, radius } from "@/constants/theme";
import { useBreakpoint } from "@/utils/responsive";

export default function Splash() {
  const router = useRouter();
  const { isPhone } = useBreakpoint();

  useEffect(() => {
    const t = setTimeout(() => router.replace("/apps/mouldhealthcheck/welcome"), 1900);
    return () => clearTimeout(t);
  }, []);

  const logoSize = isPhone ? 132 : 160;

  return (
    <LinearGradient colors={gradients.aurora} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.blobTop} />
      <View style={styles.blobBottom} />
      <View style={styles.blobAccent} />

      <Animated.View entering={ZoomIn.duration(700)}>
        <GlassSurface intensity="hero" tint="dark" borderRadius={radius._32} style={{ width: logoSize, height: logoSize, alignItems: "center", justifyContent: "center" }}>
          <Image source={require("../assets/logo.png")} style={[styles.logo, { width: logoSize * 0.79, height: logoSize * 0.79 }]} resizeMode="contain" />
        </GlassSurface>
      </Animated.View>

      <Animated.Text entering={FadeInDown.delay(300).duration(700)} style={styles.title}>
        Mold Health Inspection
      </Animated.Text>
      <Animated.Text entering={FadeInDown.delay(450).duration(700)} style={styles.tagline}>
        Smart mould inspection, simplified
      </Animated.Text>

      <Animated.View entering={FadeIn.delay(900).duration(800)} style={styles.footer}>
        <Text style={styles.footerText}>Emami Group · Maintenance</Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  blobTop: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 999,
    backgroundColor: "rgba(236,72,153,0.22)",
    top: -90,
    right: -80,
  },
  blobBottom: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: "rgba(45,127,249,0.20)",
    bottom: -40,
    left: -60,
  },
  blobAccent: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: "rgba(20,184,166,0.18)",
    top: "40%",
    right: "8%",
  },
  logo: {},
  title: { color: "#fff", fontSize: 34, fontWeight: font.black, marginTop: 26, letterSpacing: -0.5 },
  tagline: { color: "rgba(255,255,255,0.9)", fontSize: font.body, fontWeight: font.medium, marginTop: 8 },
  footer: { position: "absolute", bottom: 48 },
  footerText: { color: "rgba(255,255,255,0.85)", fontSize: font.sub, fontWeight: font.semibold, letterSpacing: 0.4 },
});
