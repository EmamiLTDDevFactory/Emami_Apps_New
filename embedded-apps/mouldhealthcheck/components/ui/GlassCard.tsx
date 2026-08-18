import React, { ReactNode } from "react";
import { Pressable, StyleSheet, ViewStyle, StyleProp } from "react-native";
import * as Haptics from "expo-haptics";
import { radius, shadow } from "@/constants/theme";
import GlassSurface, { GlassIntensity, GlassTint } from "./GlassSurface";

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  padded?: boolean;
  intensity?: GlassIntensity;
  tint?: GlassTint;
  /** Adds a colorful glow shadow (e.g. shadow.glow / shadow.glowSuccess) behind the card. */
  glow?: StyleProp<ViewStyle>;
};

/**
 * Frosted-glass sibling to Card.tsx — for hero sections, floating KPI panels
 * and overlays sitting on a colorful/gradient backdrop (blur over a flat
 * background barely reads as "glass", so this is opt-in per screen, not a
 * blanket Card replacement).
 */
export default function GlassCard({
  children,
  style,
  onPress,
  padded = true,
  intensity = "card",
  tint = "light",
  glow,
}: Props) {
  const content = (
    <GlassSurface
      intensity={intensity}
      tint={tint}
      borderRadius={radius._24}
      style={[styles.card, padded && styles.padded, glow, style] as any}
    >
      {children}
    </GlassSurface>
  );

  if (!onPress) return content;

  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    ...shadow.soft,
  },
  padded: { padding: 16 },
  pressed: { opacity: 0.9 },
});
