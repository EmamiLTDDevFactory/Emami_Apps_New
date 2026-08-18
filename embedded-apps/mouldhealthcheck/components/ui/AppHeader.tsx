import React, { ReactNode } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";
import * as Haptics from "expo-haptics";
import { colors, font } from "@/constants/theme";
import GlassChip from "./GlassChip";

type Props = {
  title?: string;
  subtitle?: string;
  back?: boolean;
  onBack?: () => void;
  right?: ReactNode;
  light?: boolean; // white text (for coloured headers)
};

/** Compact top bar: optional back button, title/subtitle, optional right slot. */
export default function AppHeader({ title, subtitle, back, onBack, right, light }: Props) {
  const router = useRouter();
  const fg = light ? "#fff" : colors.ink;
  const sub = light ? "rgba(255,255,255,0.8)" : colors.textMuted;

  return (
    <View style={styles.row}>
      {back ? (
        light ? (
          <TouchableOpacity
            onPress={() => {
              Haptics.selectionAsync();
              onBack ? onBack() : router.back();
            }}
            activeOpacity={0.8}
          >
            <GlassChip size={40} tint="dark" style={styles.iconBtn}>
              <Icons.CaretLeft size={20} color={fg} weight="bold" />
            </GlassChip>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => {
              Haptics.selectionAsync();
              onBack ? onBack() : router.back();
            }}
            style={[styles.iconBtn, styles.iconDark]}
            activeOpacity={0.8}
          >
            <Icons.CaretLeft size={20} color={fg} weight="bold" />
          </TouchableOpacity>
        )
      ) : (
        <View style={styles.spacer} />
      )}

      <View style={styles.titleWrap}>
        {!!title && (
          <Text style={[styles.title, { color: fg }]} numberOfLines={1}>
            {title}
          </Text>
        )}
        {!!subtitle && (
          <Text style={[styles.subtitle, { color: sub }]} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      <View style={styles.rightWrap}>{right ?? <View style={styles.spacer} />}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  iconDark: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  spacer: { width: 40, height: 40 },
  titleWrap: { flex: 1, alignItems: "center", paddingHorizontal: 8 },
  title: { fontSize: font.title, fontWeight: font.bold },
  subtitle: { fontSize: font.caption, fontWeight: font.medium, marginTop: 1 },
  rightWrap: { minWidth: 40, alignItems: "flex-end" },
});
