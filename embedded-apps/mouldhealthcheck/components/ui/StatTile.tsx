import React, { ReactNode } from "react";
import { View, Text, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { colors, radius, font, shadow } from "@/constants/theme";
import GlassSurface from "./GlassSurface";
import GlassChip from "./GlassChip";

type Props = {
  value: string | number;
  label: string;
  icon?: ReactNode;
  tint?: string;
  tintBg?: string;
  footerText?: string;
  style?: StyleProp<ViewStyle>;
  /** "solid" (default, unchanged look) or "glass" — frosted tile for colorful dashboard backdrops. */
  variant?: "solid" | "glass";
};

/** Small KPI tile — materialized design. */
export default function StatTile({
  value,
  label,
  icon,
  tint = colors.brand,
  tintBg = colors.brandSoft,
  footerText,
  style,
  variant = "solid",
}: Props) {
  const iconChip = !!icon && (
    variant === "glass" ? (
      <GlassChip size={48} style={[styles.iconChip, { shadowColor: tint }, shadow.glow]}>
        {icon}
      </GlassChip>
    ) : (
      <View style={[styles.iconChip, styles.iconChipSolid, { backgroundColor: tint, shadowColor: tint }]}>
        {icon}
      </View>
    )
  );

  const body = (
    <>
      {iconChip}
      <View style={styles.textContainer}>
        <Text style={styles.label} numberOfLines={1}>{label}</Text>
        <Text style={[styles.value, { color: colors.ink }]}>{value}</Text>
      </View>

      {!!footerText && (
        <>
          <View style={styles.divider} />
          <Text style={styles.footerText}>{footerText}</Text>
        </>
      )}
    </>
  );

  if (variant === "glass") {
    return (
      <GlassSurface intensity="card" borderRadius={radius._15} style={[styles.card, shadow.soft, style] as any}>
        {body}
      </GlassSurface>
    );
  }

  return <View style={[styles.card, shadow.card, style]}>{body}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius._15,
    padding: 16,
    paddingTop: 12,
    marginTop: 24, // space for floating icon
    minHeight: 110,
    overflow: 'visible',
    position: 'relative',
  },
  iconChip: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    position: 'absolute',
    top: -16,
    left: 16,
    zIndex: 10,
  },
  iconChipSolid: {
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  textContainer: {
    alignItems: 'flex-end',
  },
  label: {
    fontSize: font.sub,
    color: colors.textMuted,
    fontWeight: font.medium,
  },
  value: {
    fontSize: 26,
    fontWeight: font.black,
    letterSpacing: -0.5,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(236, 236, 241, 0.8)',
    marginTop: 16,
    marginBottom: 12,
  },
  footerText: {
    fontSize: font.micro,
    color: colors.textFaint,
    fontWeight: font.medium,
  }
});
