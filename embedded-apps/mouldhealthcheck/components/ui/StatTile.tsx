import React, { ReactNode } from "react";
import { View, Text, StyleSheet, ViewStyle, StyleProp } from "react-native";
import * as Icons from "phosphor-react-native";
import { colors, radius, font, shadow, statusColors } from "@/constants/theme";

type Trend = {
  direction: "up" | "down";
  value: string;
  /** true = up is good (default). Set false for metrics where a rise is bad (e.g. defect rate). */
  positiveIsUp?: boolean;
};

type Props = {
  value: string | number;
  label: string;
  /** Small muted line under the label, e.g. "Net Sales". */
  subtitle?: string;
  icon?: ReactNode;
  tint?: string;
  tintBg?: string;
  /** Small badge above the trend pill, e.g. "MTD". */
  periodLabel?: string;
  /** Colored up/down badge, e.g. { direction: "down", value: "18.1%" }. Omit when no comparison data exists. */
  trend?: Trend;
  /** Footer row — only rendered when at least one is provided. */
  prevValue?: string;
  compareLabel?: string;
  /** Left edge accent color. Defaults to the trend's success/danger color when trend is set, otherwise none. */
  accent?: string;
  style?: StyleProp<ViewStyle>;
};

/** KPI tile — icon + label/subtitle, optional period+trend badge, big value, optional prev/compare footer. */
export default function StatTile({
  value,
  label,
  subtitle,
  icon,
  tint = colors.brand,
  tintBg = colors.brandSoft,
  periodLabel,
  trend,
  prevValue,
  compareLabel,
  accent,
  style,
}: Props) {
  const trendGood = trend ? (trend.positiveIsUp ?? true ? trend.direction === "up" : trend.direction === "down") : true;
  const trendColors = trend ? (trendGood ? statusColors.success : statusColors.danger) : null;
  const accentColor = accent ?? (trend ? trendColors!.border : undefined);
  const TrendIcon = trend?.direction === "up" ? Icons.CaretUp : Icons.CaretDown;

  return (
    <View style={[styles.card, shadow.soft, accentColor ? { borderLeftWidth: 3, borderLeftColor: accentColor } : null, style]}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          {!!icon && (
            <View style={[styles.iconChip, { backgroundColor: tintBg }]}>{icon}</View>
          )}
          <View style={{ flexShrink: 1 }}>
            <Text style={styles.label} numberOfLines={2}>{label}</Text>
            {!!subtitle && <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text>}
          </View>
        </View>

        {(!!periodLabel || !!trend) && (
          <View style={styles.headerRight}>
            {!!periodLabel && <Text style={styles.periodLabel}>{periodLabel}</Text>}
            {!!trend && (
              <View style={[styles.trendPill, { backgroundColor: trendColors!.bg }]}>
                <TrendIcon size={10} color={trendColors!.fg} weight="bold" />
                <Text style={[styles.trendText, { color: trendColors!.fg }]}>{trend.value}</Text>
              </View>
            )}
          </View>
        )}
      </View>

      <Text style={styles.value} numberOfLines={1}>{value}</Text>

      {(!!prevValue || !!compareLabel) && (
        <View style={styles.footerRow}>
          <Text style={styles.footerText} numberOfLines={1}>{prevValue ?? ""}</Text>
          <Text style={styles.footerText} numberOfLines={1}>{compareLabel ?? ""}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius._15,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10, flexShrink: 1 },
  iconChip: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: font.caption,
    color: colors.ink,
    fontWeight: font.bold,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  subtitle: { fontSize: font.micro, color: colors.textFaint, fontWeight: font.medium, marginTop: 1 },
  headerRight: { alignItems: "flex-end", gap: 4 },
  periodLabel: { fontSize: font.micro, color: colors.textFaint, fontWeight: font.bold, letterSpacing: 0.3 },
  trendPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    height: 20,
    borderRadius: radius.pill,
  },
  trendText: { fontSize: font.micro, fontWeight: font.bold },
  value: {
    fontSize: 24,
    fontWeight: font.black,
    letterSpacing: -0.5,
    color: colors.ink,
    marginTop: 10,
  },
  footerRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8, gap: 8 },
  footerText: { fontSize: font.micro, color: colors.textFaint, fontWeight: font.medium },
});
