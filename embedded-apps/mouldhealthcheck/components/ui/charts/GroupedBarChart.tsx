import React, { useId } from "react";
import { StyleSheet, View, Text, ViewStyle } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { chartPalette, colors, font } from "@/constants/theme";

export type GroupedBarDatum = {
  label: string;
  values: number[];
};

type Props = {
  data: GroupedBarDatum[];
  seriesLabels: string[];
  height?: number;
  colors?: string[];
  valueFormatter?: (value: number) => string;
  animated?: boolean;
  showLegend?: boolean;
  style?: ViewStyle;
};

/**
 * Grouped/side-by-side bar chart for 2+ series per category (e.g. Running vs
 * NPA per vendor). Clean SVG replacement for the pseudo-3D View+LinearGradient
 * cylinder bars previously hand-rolled in admindashboard.tsx.
 */
export default function GroupedBarChart({
  data,
  seriesLabels,
  height = 180,
  colors: palette = chartPalette,
  valueFormatter = (v) => `${v}`,
  animated = true,
  showLegend = true,
  style,
}: Props) {
  const max = Math.max(1, ...data.flatMap((d) => d.values));
  const barAreaHeight = height - 28;
  const seriesCount = Math.max(1, seriesLabels.length);

  const chartId = useId().replace(/:/g, '');

  return (
    <View style={[{ width: "100%" }, style]}>
      <View style={[styles.wrap, { height }]}>
        {data.map((d, gi) => (
          <View key={`${d.label}-${gi}`} style={styles.group}>
            <View style={styles.bars}>
              {d.values.map((value, si) => {
                const barHeight = Math.max(4, (value / max) * barAreaHeight);
                const color = palette[si % palette.length];
                const Wrapper = animated ? Animated.View : View;
                const wrapperProps = animated
                  ? { entering: FadeInUp.delay((gi * seriesCount + si) * 40).duration(380) }
                  : {};
                return (
                  <Wrapper
                    key={si}
                    {...wrapperProps}
                    style={{ flex: 1, height: barAreaHeight, justifyContent: "flex-end" }}
                  >
                    <Svg width="100%" height={barHeight}>
                      <Defs>
                        <LinearGradient id={`groupBarGrad-${chartId}-${gi}-${si}`} x1="0" y1="0" x2="0" y2="1">
                          <Stop offset="0" stopColor={color} stopOpacity={1} />
                          <Stop offset="1" stopColor={color} stopOpacity={0.55} />
                        </LinearGradient>
                      </Defs>
                      <Rect x="15%" y="0" width="70%" height="100%" rx={6} ry={6} fill={`url(#groupBarGrad-${chartId}-${gi}-${si})`} />
                    </Svg>
                  </Wrapper>
                );
              })}
            </View>
            <Text style={styles.label} numberOfLines={1}>{d.label}</Text>
          </View>
        ))}
      </View>

      {showLegend && (
        <View style={styles.legend}>
          {seriesLabels.map((label, i) => (
            <View key={label} style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: palette[i % palette.length] }]} />
              <Text style={styles.legendLabel}>{label}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "flex-end", gap: 14, width: "100%" },
  group: { flex: 1, alignItems: "center" },
  bars: { flexDirection: "row", gap: 4, width: "100%", alignItems: "flex-end", flex: 1 },
  label: {
    fontSize: font.micro,
    fontWeight: font.medium,
    color: colors.textMuted,
    marginTop: 6,
    textAlign: "center",
  },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 12, justifyContent: "center" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: font.sub, color: colors.textBody, fontWeight: font.medium },
});
