import React, { ReactNode } from "react";
import { StyleSheet, View, ViewStyle, StyleProp } from "react-native";
import { colors, radius } from "@/constants/theme";

export type GlassIntensity = "chip" | "card" | "hero" | "modal";
export type GlassTint = "light" | "dark";

type Props = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: GlassIntensity;
  tint?: GlassTint;
  /** Draw the surface border. Off for chips nested inside another surface. */
  bordered?: boolean;
  borderRadius?: number;
};

/**
 * Flat surface primitive — GlassCard, GlassChip, and the "glass" variants of
 * Card/StatTile/AppHeader all compose this. Historically a blur/backdrop-filter
 * primitive; kept the same name and prop API (intensity/tint/bordered) so every
 * consumer works unmodified, but it now renders a plain opaque surface to match
 * the flat design system.
 */
export default function GlassSurface({
  children,
  style,
  intensity,
  tint = "light",
  bordered = true,
  borderRadius = radius._20,
}: Props) {
  const isDark = tint === "dark";
  const backgroundColor = isDark ? colors.ink : colors.surface;
  const borderColor = isDark ? "rgba(255,255,255,0.14)" : colors.border;

  return (
    <View
      style={[
        styles.base,
        {
          borderRadius,
          backgroundColor,
          borderColor: bordered ? borderColor : "transparent",
          borderWidth: bordered ? 1 : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: "hidden",
  },
});
