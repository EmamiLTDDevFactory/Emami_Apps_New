import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { colors, radius, font } from "@/constants/theme";

type Props = {
  label: string;
  active?: boolean;
  count?: number;
  onPress?: () => void;
};

/** Swiggy-style selectable filter chip. */
export default function Chip({ label, active, count, onPress }: Props) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => {
        Haptics.selectionAsync();
        onPress?.();
      }}
      style={[styles.chip, active ? styles.active : styles.inactive]}
    >
      <Text style={[styles.label, active ? styles.labelActive : styles.labelInactive]}>
        {label}
        {typeof count === "number" ? `  ${count}` : ""}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 16,
    height: 38,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  active: { backgroundColor: colors.ink, borderColor: colors.ink },
  inactive: { backgroundColor: colors.surface, borderColor: colors.border },
  label: { fontSize: font.sub, fontWeight: font.semibold },
  labelActive: { color: "#fff" },
  labelInactive: { color: colors.textBody },
});
