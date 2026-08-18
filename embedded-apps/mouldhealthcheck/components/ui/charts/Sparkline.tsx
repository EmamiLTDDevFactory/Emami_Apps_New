import React from "react";
import { View, ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors } from "@/constants/theme";

type Props = {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
  style?: ViewStyle;
};

/** Compact axis-less trend line — for StatTile/GlassCard footers. */
export default function Sparkline({
  values,
  width = 72,
  height = 28,
  color = colors.brand,
  strokeWidth = 2,
  style,
}: Props) {
  if (values.length < 2) return <View style={[{ width, height }, style]} />;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);

  const d = values
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * height;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <View style={[{ width, height }, style]}>
      <Svg width={width} height={height}>
        <Path d={d} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}
