import React from "react";
import { StyleSheet, View, Text, ViewStyle } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { chartPalette, colors, font } from "@/constants/theme";

export type DonutDatum = {
  label: string;
  value: number;
  color?: string;
};

type Props = {
  data: DonutDatum[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerSubLabel?: string;
  colors?: string[];
  showLegend?: boolean;
  animated?: boolean;
  style?: ViewStyle;
};

/** Multi-segment donut/ring — extends ProgressRing's single-arc math to N categories. */
export default function DonutChart({
  data,
  size = 140,
  strokeWidth = 18,
  centerLabel,
  centerSubLabel,
  colors: palette = chartPalette,
  showLegend = true,
  animated = true,
  style,
}: Props) {
  const total = data.reduce((sum, d) => sum + Math.max(0, d.value), 0) || 1;
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  let cumulative = 0;
  const segments = data
    .filter((d) => d.value > 0)
    .map((d, i) => {
      const fraction = d.value / total;
      const dash = Math.max(fraction * circumference - (data.length > 1 ? 2 : 0), 0);
      const rotation = -90 + (cumulative / total) * 360;
      cumulative += d.value;
      return {
        key: `${d.label}-${i}`,
        dash,
        gap: circumference - dash,
        rotation,
        color: d.color ?? palette[i % palette.length],
      };
    });

  const Wrapper = animated ? Animated.View : View;
  const wrapperProps = animated ? { entering: FadeIn.duration(450) } : {};

  return (
    <Wrapper {...wrapperProps} style={[styles.row, style]}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle cx={cx} cy={cy} r={r} stroke={colors.border} strokeWidth={strokeWidth} fill="none" />
          {segments.map((s) => (
            <Circle
              key={s.key}
              cx={cx}
              cy={cy}
              r={r}
              stroke={s.color}
              strokeWidth={strokeWidth}
              strokeLinecap={data.length > 1 ? "butt" : "round"}
              fill="none"
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={circumference - s.dash}
              transform={`rotate(${s.rotation} ${cx} ${cy})`}
            />
          ))}
        </Svg>
        <View style={styles.center} pointerEvents="none">
          {!!centerLabel && <Text style={styles.centerLabel}>{centerLabel}</Text>}
          {!!centerSubLabel && <Text style={styles.centerSub}>{centerSubLabel}</Text>}
        </View>
      </View>

      {showLegend && (
        <View style={styles.legend}>
          {data.map((d, i) => (
            <View key={`${d.label}-${i}`} style={styles.legendRow}>
              <View style={[styles.dot, { backgroundColor: d.color ?? palette[i % palette.length] }]} />
              <Text style={styles.legendLabel} numberOfLines={1}>{d.label}</Text>
              <Text style={styles.legendValue}>{d.value}</Text>
            </View>
          ))}
        </View>
      )}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 16 },
  center: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  centerLabel: { fontSize: font.h3, fontWeight: font.black, color: colors.ink },
  centerSub: { fontSize: font.micro, fontWeight: font.medium, color: colors.textMuted, marginTop: 2 },
  legend: { flex: 1, gap: 8, minWidth: 100 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { flex: 1, fontSize: font.sub, color: colors.textBody, fontWeight: font.medium },
  legendValue: { fontSize: font.sub, color: colors.ink, fontWeight: font.bold },
});
