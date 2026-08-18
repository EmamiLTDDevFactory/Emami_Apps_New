import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors, font } from "@/constants/theme";

type Props = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export default function SectionTitle({ title, subtitle, actionLabel, onAction }: Props) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {!!actionLabel && (
        <TouchableOpacity onPress={onAction} activeOpacity={0.7}>
          <Text style={styles.action}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 16, marginBottom: 12 },
  title: { fontSize: font.h3, fontWeight: font.black, color: colors.ink, letterSpacing: -0.3 },
  subtitle: { fontSize: font.sub, color: colors.textMuted, marginTop: 2 },
  action: { fontSize: font.sub, fontWeight: font.bold, color: colors.brand },
});
