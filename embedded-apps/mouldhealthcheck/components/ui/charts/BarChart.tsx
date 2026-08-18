import React, { useId } from "react";
import { StyleSheet, View, Text, ViewStyle } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { chartPalette, colors, font } from "@/constants/theme";

export type BarDatum = {
  label: string;
  value: number;
  color?: string;
};

type Props = {
  data: BarDatum[];
  height?: number;
  colors?: string[];
  valueFormatter?: (value: number) => string;
  animated?: boolean;
  style?: ViewStyle;
};

/** Simple colorful vertical bar chart — one value per category. */
export default function BarChart({
  data,
  height = 160,
  colors: palette = chartPalette,
  valueFormatter = (v) => `${v}`,
  animated = true,
  style,
}: Props) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const barAreaHeight = height - 28;

  const chartId = useId().replace(/:/g, '');

  return (
    <View style={[styles.wrap, { height }, style]}>
      {data.map((d, i) => {
        const barHeight = Math.max(4, (d.value / max) * barAreaHeight);
        const color = d.color ?? palette[i % palette.length];
        const Wrapper = animated ? Animated.View : View;
        const wrapperProps = animated ? { entering: FadeInUp.delay(i * 60).duration(400) } : {};
        return (
          <View key={`${d.label}-${i}`} style={styles.col}>
            <Text style={[styles.value, { color }]} numberOfLines={1}>{valueFormatter(d.value)}</Text>
            <Wrapper {...wrapperProps} style={{ width: "100%", height: barAreaHeight, justifyContent: "flex-end" }}>
              <Svg width="100%" height={barHeight}>
                <Defs>
                  <LinearGradient id={`barGrad-${chartId}-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={color} stopOpacity={1} />
                    <Stop offset="1" stopColor={color} stopOpacity={0.55} />
                  </LinearGradient>
                </Defs>
                <Rect x="10%" y="0" width="80%" height="100%" rx={8} ry={8} fill={`url(#barGrad-${chartId}-${i})`} />
              </Svg>
            </Wrapper>
            <Text style={styles.label} numberOfLines={1}>{d.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  col: { flex: 1, alignItems: "center" },
  value: { fontSize: font.micro, fontWeight: font.bold, color: colors.ink, marginBottom: 4 },
  label: {
    fontSize: font.micro,
    fontWeight: font.medium,
    color: colors.textMuted,
    marginTop: 6,
    textAlign: "center",
  },
});
