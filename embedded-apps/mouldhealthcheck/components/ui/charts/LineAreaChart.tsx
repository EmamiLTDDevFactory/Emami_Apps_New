import React from "react";
import { StyleSheet, View, Text, ViewStyle } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { colors, font } from "@/constants/theme";

export type LinePoint = {
  x: number;
  y: number;
  label?: string;
};

type Props = {
  data: LinePoint[];
  width?: number;
  height?: number;
  color?: string;
  area?: boolean;
  showDots?: boolean;
  animated?: boolean;
  style?: ViewStyle;
};

function buildPath(points: { px: number; py: number }[]) {
  if (points.length === 0) return "";
  return points.reduce(
    (d, p, i) => d + `${i === 0 ? "M" : "L"} ${p.px} ${p.py} `,
    ""
  );
}

/** Line chart with an optional gradient-filled area beneath — trend-over-time KPIs. */
export default function LineAreaChart({
  data,
  width = 320,
  height = 140,
  color = colors.brand,
  area = true,
  showDots = true,
  animated = true,
  style,
}: Props) {
  const padding = 12;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;

  if (data.length === 0) {
    return (
      <View style={[{ width, height }, styles.empty, style]}>
        <Text style={styles.emptyText}>No trend data yet</Text>
      </View>
    );
  }

  const xs = data.map((d) => d.x);
  const ys = data.map((d) => d.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(0, ...ys);
  const maxY = Math.max(1, ...ys);

  const scaleX = (x: number) =>
    padding + (maxX === minX ? innerW / 2 : ((x - minX) / (maxX - minX)) * innerW);
  const scaleY = (y: number) =>
    padding + innerH - ((y - minY) / (maxY - minY || 1)) * innerH;

  const points = data.map((d) => ({ px: scaleX(d.x), py: scaleY(d.y) }));
  const linePath = buildPath(points);
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].px} ${height - padding} L ${points[0].px} ${height - padding} Z`
      : "";

  const Wrapper = animated ? Animated.View : View;
  const wrapperProps = animated ? { entering: FadeIn.duration(500) } : {};

  return (
    <Wrapper {...wrapperProps} style={[{ width, height }, style]}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="lineAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.35} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {area && <Path d={areaPath} fill="url(#lineAreaGrad)" stroke="none" />}
        <Path d={linePath} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        {showDots &&
          points.map((p, i) => (
            <Circle key={i} cx={p.px} cy={p.py} r={4} fill={colors.surface} stroke={color} strokeWidth={2} />
          ))}
      </Svg>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: font.sub, color: colors.textFaint, fontWeight: font.medium },
});
