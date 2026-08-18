import React, { ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import * as Icons from "phosphor-react-native";
import { colors, font } from "@/constants/theme";

export default function EmptyState({
  icon,
  title,
  message,
}: {
  icon?: ReactNode;
  title: string;
  message?: string;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconCircle}>
        {icon ?? <Icons.Tray size={34} color={colors.brand} weight="duotone" />}
      </View>
      <Text style={styles.title}>{title}</Text>
      {!!message && <Text style={styles.msg}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", paddingVertical: 48, paddingHorizontal: 32 },
  iconCircle: {
    width: 78,
    height: 78,
    borderRadius: 999,
    backgroundColor: colors.brandSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: { fontSize: font.title, fontWeight: font.bold, color: colors.ink, textAlign: "center" },
  msg: { fontSize: font.sub, color: colors.textMuted, marginTop: 6, textAlign: "center", lineHeight: 20 },
});
