import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { colors, font } from "@/constants/theme";

type Props = {
  /** 0..100 */
  progress: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  trackColor?: string;
};

/** Circular progress ring with a brand gradient (Apple-Health-style gauge). */
export default function ProgressRing({
  progress,
  size = 96,
  strokeWidth = 10,
  label,
  sublabel,
  trackColor = colors.border,
}: Props) {
  const clamped = Math.max(0, Math.min(100, progress));
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.brandLight} />
            <Stop offset="1" stopColor={colors.brand} />
          </LinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#ringGrad)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Text style={[styles.label, { fontSize: size * 0.26 }]}>
          {label ?? `${Math.round(clamped)}%`}
        </Text>
        {!!sublabel && <Text style={styles.sub}>{sublabel}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  label: { color: colors.ink, fontWeight: font.black },
  sub: { color: colors.textMuted, fontSize: font.micro, fontWeight: font.medium, marginTop: 1 },
});
