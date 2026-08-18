import React, { ReactNode } from "react";
import { StyleSheet, ViewStyle, StyleProp } from "react-native";
import { radius } from "@/constants/theme";
import GlassSurface, { GlassTint } from "./GlassSurface";

type Props = {
  children?: ReactNode;
  size?: number;
  style?: StyleProp<ViewStyle>;
  tint?: GlassTint;
};

/** Small pill/circle glass surface — icon chips inside StatTile/AppHeader. */
export default function GlassChip({ children, size = 44, style, tint = "light" }: Props) {
  return (
    <GlassSurface
      intensity="chip"
      tint={tint}
      borderRadius={radius._15}
      style={[styles.chip, { width: size, height: size }, style] as any}
    >
      <>{children}</>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: "center",
    justifyContent: "center",
  },
});
