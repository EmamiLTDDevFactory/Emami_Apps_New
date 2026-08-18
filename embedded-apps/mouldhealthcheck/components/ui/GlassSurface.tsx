import React, { ReactNode } from "react";
import { Platform, StyleSheet, View, ViewStyle, StyleProp } from "react-native";
import { BlurView } from "expo-blur";
import { blur, glass, radius, webBlurPx } from "@/constants/theme";

export type GlassIntensity = "chip" | "card" | "hero" | "modal";
export type GlassTint = "light" | "dark";

type Props = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: GlassIntensity;
  tint?: GlassTint;
  /** Draw the frosted-edge border. Off for chips nested inside another glass surface. */
  bordered?: boolean;
  borderRadius?: number;
};

/**
 * The one glassmorphism primitive: BlurView + translucent tint on native,
 * CSS backdropFilter on web. Everything else (GlassCard, GlassChip, and the
 * glass variants of Card/StatTile/AppHeader) composes this rather than
 * reimplementing blur per-component.
 */
export default function GlassSurface({
  children,
  style,
  intensity = "card",
  tint = "light",
  bordered = true,
  borderRadius = radius._20,
}: Props) {
  const isDark = tint === "dark";
  const overlayColor = isDark ? glass.surfaceDark : glass.surface;
  const borderColor = isDark ? glass.borderDark : glass.border;

  if (Platform.OS === "web") {
    const px = webBlurPx[intensity];
    return (
      <View
        style={[
          styles.base,
          {
            borderRadius,
            backgroundColor: overlayColor,
            borderColor: bordered ? borderColor : "transparent",
            borderWidth: bordered ? 1 : 0,
            // react-native-web passes unknown style keys straight through as CSS.
            backdropFilter: `blur(${px}px) saturate(160%)`,
            WebkitBackdropFilter: `blur(${px}px) saturate(160%)`,
          } as any,
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  const preset = blur[intensity];
  return (
    <View style={[{ borderRadius }, styles.clip, style]}>
      <BlurView
        intensity={preset.intensity}
        tint={preset.tint}
        style={StyleSheet.absoluteFillObject}
      />
      <View
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: overlayColor,
            borderColor: bordered ? borderColor : "transparent",
            borderWidth: bordered ? 1 : 0,
            borderRadius,
          },
        ]}
      />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: "hidden",
  },
  clip: {
    overflow: "hidden",
  },
  content: {
    width: "100%",
  },
});
