import { chartPalette, colors, font } from "@/constants/theme";
import React, { useId } from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

export type StackedBarDatum = {
  label: string;
  values: number[];
};

type Props = {
  data: StackedBarDatum[];
  seriesLabels: string[];
  height?: number;
  colors?: string[];
  valueFormatter?: (value: number) => string;
  animated?: boolean;
  showLegend?: boolean;
  style?: ViewStyle;
};

export default function StackedBarChart({
  data,
  seriesLabels,
  height = 180,
  colors: palette = chartPalette,
  valueFormatter = (v) => `${v}`,
  animated = true,
  showLegend = true,
  style,
}: Props) {
  const max = Math.max(1, ...data.map((d) => d.values.reduce((sum, v) => sum + v, 0)));
  const barAreaHeight = height - 28;
  const chartId = useId().replace(/:/g, '');

  return (
    <View style={[{ width: "100%" }, style]}>
      <View style={[styles.wrap, { height }]}>
        {data.map((d, gi) => {
          const Wrapper = animated ? Animated.View : View;
          const wrapperProps = animated ? { entering: FadeInUp.delay(gi * 40).duration(400) } : {};

          return (
            <View key={`${d.label}-${gi}`} style={styles.group}>
              <Wrapper {...wrapperProps} style={{ width: "100%", height: barAreaHeight, justifyContent: "flex-end" }}>
                <Svg width="100%" height={barAreaHeight}>
                  <Defs>
                    {d.values.map((_, si) => {
                      const color = palette[si % palette.length];
                      return (
                        <LinearGradient key={`grad-${si}`} id={`stackedGrad-${chartId}-${gi}-${si}`} x1="0" y1="0" x2="0" y2="1">
                          <Stop offset="0" stopColor={color} stopOpacity={1} />
                          <Stop offset="1" stopColor={color} stopOpacity={0.7} />
                        </LinearGradient>
                      );
                    })}
                  </Defs>
                  {d.values
                    .map((val, si) => ({ val, si }))
                    .reduce((acc: any[], curr: any, i: number) => {
                      const prefixSum = i === 0 ? curr.val : acc[i - 1].prefixSum + curr.val;
                      acc.push({ ...curr, prefixSum });
                      return acc;
                    }, [])
                    .reverse()
                    .map(({ si, prefixSum }: any) => {
                      const segmentHeight = Math.max(0, (prefixSum / max) * barAreaHeight);
                      if (segmentHeight === 0) return null;

                      return (
                        <Rect
                          key={si}
                          x="33%"
                          y={barAreaHeight - segmentHeight}
                          width="14%"
                          height={segmentHeight}
                          fill={`url(#stackedGrad-${chartId}-${gi}-${si})`}
                          rx={6}
                          ry={6}
                        />
                      );
                    })
                  }
                </Svg>
              </Wrapper>
              <Text style={styles.label} numberOfLines={1}>{d.label}</Text>
            </View>
          );
        })}
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
  label: {
    fontSize: font.micro,
    fontWeight: font.medium,
    color: colors.textMuted,
    marginTop: 6,
    textAlign: "center",
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 16,
    marginTop: 16,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: font.sub, color: colors.textMuted },
});
