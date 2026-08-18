import React from "react";
import { StyleSheet, View, Text, ViewStyle, Platform } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import Svg, { Circle, G } from "react-native-svg";
import { chartPalette, colors, font } from "@/constants/theme";

export type PieDatum = {
  label: string;
  value: number;
  color?: string;
};

type Props = {
  data: PieDatum[];
  size?: number;
  depth?: number;
  tilt?: string;
  colors?: string[];
  showLegend?: boolean;
  animated?: boolean;
  style?: ViewStyle;
};

export default function PieChart3D({
  data,
  size = 180,
  depth = 20,
  tilt = "60deg",
  colors: palette = chartPalette,
  showLegend = true,
  animated = true,
  style,
}: Props) {
  const total = data.reduce((sum, d) => sum + Math.max(0, d.value), 0) || 1;
  const strokeWidth = size / 2;
  const r = size / 4;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  let cumulative = 0;
  const segments = data
    .filter((d) => d.value > 0)
    .map((d, i) => {
      const fraction = d.value / total;
      // Add a tiny overlap to avoid anti-aliasing gaps between segments
      const dash = Math.max(fraction * circumference + 1.5, 0);
      const rotation = -90 + (cumulative / total) * 360;
      cumulative += d.value;
      return {
        ...d,
        color: d.color || palette[i % palette.length],
        dash,
        rotation,
      };
    });

  const Wrapper = animated ? Animated.View : View;
  const wrapperProps = animated ? { entering: FadeIn.duration(800) } : {};

  // We render 'depth' number of layers. The top layer (last one rendered) is the bright pie surface.
  // The bottom layers form the 3D sides and are overlaid with a semi-transparent black stroke to darken them.
  const layers = Array.from({ length: depth });

  return (
    <View style={[styles.container, style]}>
      <Wrapper {...wrapperProps} style={{ alignItems: "center" }}>
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          {layers.map((_, layerIdx) => {
            const isTopLayer = layerIdx === depth - 1;
            return (
              <View
                key={layerIdx}
                style={{
                  position: "absolute",
                  // The offset creates the 3D depth, moving each layer down.
                  // Since the tilt makes it isometric, shifting Y visually extrudes it.
                  top: layerIdx * (Platform.OS === 'web' ? 1.5 : 1), 
                  transform: [{ rotateX: tilt }],
                  zIndex: layerIdx,
                }}
              >
                <Svg width={size} height={size}>
                  <G>
                    {segments.map((s, i) => (
                      <Circle
                        key={i}
                        cx={cx}
                        cy={cy}
                        r={r}
                        strokeWidth={strokeWidth}
                        stroke={s.color}
                        strokeDasharray={`${s.dash} ${circumference}`}
                        strokeDashoffset={0}
                        transform={`rotate(${s.rotation} ${cx} ${cy})`}
                        fill="none"
                      />
                    ))}
                    {!isTopLayer && (
                      <Circle
                        cx={cx}
                        cy={cy}
                        r={r}
                        strokeWidth={strokeWidth}
                        stroke="#000"
                        strokeOpacity={0.25}
                        fill="none"
                      />
                    )}
                  </G>
                </Svg>
              </View>
            );
          })}
        </View>
      </Wrapper>

      {showLegend && (
        <View style={styles.legend}>
          {segments.map((s, i) => (
            <View key={s.label} style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: s.color }]} />
              <Text style={styles.legendLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center" },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 16,
    marginTop: 24,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: font.sub, color: colors.textBody, fontWeight: font.medium },
});
