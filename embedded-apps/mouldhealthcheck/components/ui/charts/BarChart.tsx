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
  /** Dashed gridlines + y-axis scale, financial-dashboard style. Default on. */
  showAxis?: boolean;
  /** Number of gridline intervals (ticks rendered = axisTicks + 1). */
  axisTicks?: number;
  /** Small value label above each bar. Off by default when showAxis is on (the axis already conveys magnitude). */
  showValueLabels?: boolean;
};

/** Vertical bar chart with dashed gridlines + y-axis scale — one value per category. */
export default function BarChart({
  data,
  height = 200,
  colors: palette = chartPalette,
  valueFormatter = (v) => `${v}`,
  animated = true,
  style,
  showAxis = true,
  axisTicks = 4,
  showValueLabels = !showAxis,
}: Props) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const xLabelsHeight = 32;
  const valueLabelHeight = showValueLabels ? 18 : 0;
  const barAreaHeight = height - xLabelsHeight - valueLabelHeight;
  const chartId = useId().replace(/:/g, "");

  const ticks = Array.from({ length: axisTicks + 1 }, (_, i) => (max / axisTicks) * (axisTicks - i));

  return (
    <View style={[styles.wrap, { height }, style]}>
      {showAxis && (
        <View style={[styles.axisCol, { height: barAreaHeight }]}>
          {ticks.map((t, i) => (
            <Text key={i} style={styles.axisLabel} numberOfLines={1}>{valueFormatter(t)}</Text>
          ))}
        </View>
      )}

      <View style={styles.chartCol}>
        <View style={[styles.barArea, { height: barAreaHeight }]}>
          {showAxis && ticks.map((_, i) => (
            <View
              key={i}
              style={[styles.gridline, { top: (i / (ticks.length - 1)) * barAreaHeight, pointerEvents: "none" }]}
            />
          ))}

          <View style={styles.barsRow}>
            {data.map((d, i) => {
              const barHeight = Math.max(3, (d.value / max) * barAreaHeight);
              const color = d.color ?? palette[i % palette.length];
              const Wrapper = animated ? Animated.View : View;
              const wrapperProps = animated ? { entering: FadeInUp.delay(i * 60).duration(400) } : {};
              return (
                <View key={`${d.label}-${i}`} style={styles.col}>
                  {showValueLabels && (
                    <Text style={[styles.value, { color }]} numberOfLines={1}>{valueFormatter(d.value)}</Text>
                  )}
                  <Wrapper {...wrapperProps} style={styles.barSlot}>
                    <Svg width="100%" height={barHeight}>
                      <Defs>
                        <LinearGradient id={`barGrad-${chartId}-${i}`} x1="0" y1="0" x2="0" y2="1">
                          <Stop offset="0" stopColor={color} stopOpacity={1} />
                          <Stop offset="1" stopColor={color} stopOpacity={0.6} />
                        </LinearGradient>
                      </Defs>
                      {/* Rounded-top / square-bottom bar: a fully-rounded rect plus a square patch
                          over its bottom edge — avoids needing the bar's actual pixel width, which
                          isn't known up front since the column width comes from flex layout. */}
                      <Rect x="20%" y="0" width="60%" height="100%" rx={6} ry={6} fill={`url(#barGrad-${chartId}-${i})`} />
                      {barHeight > 6 && (
                        <Rect x="20%" y={barHeight - 6} width="60%" height={6} fill={`url(#barGrad-${chartId}-${i})`} />
                      )}
                    </Svg>
                  </Wrapper>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.xLabelsRow}>
          {data.map((d, i) => (
            <Text key={`${d.label}-${i}`} style={styles.label} numberOfLines={2}>{d.label}</Text>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", width: "100%" },
  axisCol: { width: 52, justifyContent: "space-between", paddingRight: 8 },
  axisLabel: { fontSize: font.micro, color: colors.textFaint, fontWeight: font.medium, textAlign: "right" },
  chartCol: { flex: 1, minWidth: 0 },
  barArea: { position: "relative" },
  gridline: { position: "absolute", left: 0, right: 0, borderTopWidth: 1, borderColor: colors.border, borderStyle: "dashed" },
  barsRow: { flexDirection: "row", alignItems: "flex-end", height: "100%", gap: 10 },
  col: { flex: 1, minWidth: 0, alignItems: "center", height: "100%", justifyContent: "flex-end" },
  barSlot: { width: "100%", alignItems: "center", justifyContent: "flex-end" },
  value: { fontSize: font.micro, fontWeight: font.bold, color: colors.ink, marginBottom: 4 },
  xLabelsRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  label: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    fontSize: font.micro,
    fontWeight: font.medium,
    color: colors.textMuted,
    textAlign: "center",
  },
});
