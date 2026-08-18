import React, { ReactNode } from "react";
import { View, TouchableOpacity, StyleSheet, ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import { colors, radius, shadow } from "@/constants/theme";
import GlassSurface, { GlassIntensity, GlassTint } from "./GlassSurface";

type Props = {
  children: ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  padded?: boolean;
  flat?: boolean;
  /** "solid" (default, unchanged look) or "glass" — frosted, for use over a colorful/gradient backdrop. */
  variant?: "solid" | "glass";
  glassIntensity?: GlassIntensity;
  glassTint?: GlassTint;
};

/** White rounded card with a soft shadow. Optionally pressable (with haptics), or glass. */
export default function Card({
  children,
  style,
  onPress,
  padded = true,
  flat,
  variant = "solid",
  glassIntensity = "card",
  glassTint = "light",
}: Props) {
  if (variant === "glass") {
    const glassBody = (
      <GlassSurface
        intensity={glassIntensity}
        tint={glassTint}
        borderRadius={radius._24}
        style={[!flat && shadow.soft, padded && styles.padded, style] as any}
      >
        {children}
      </GlassSurface>
    );
    if (!onPress) return glassBody;
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          Haptics.selectionAsync();
          onPress();
        }}
      >
        {glassBody}
      </TouchableOpacity>
    );
  }

  const base = [
    styles.card,
    !flat && shadow.card,
    padded && styles.padded,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => {
          Haptics.selectionAsync();
          onPress();
        }}
        style={base}
      >
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={base}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius._24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  padded: { padding: 16 },
});
