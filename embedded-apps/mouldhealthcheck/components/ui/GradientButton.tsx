import React, { ReactNode } from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { colors, radius, font, shadow, gradients } from "@/constants/theme";

type Props = {
  title: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  variant?: "brand" | "ink" | "success" | "outline";
  style?: ViewStyle;
  full?: boolean;
};

/** Primary CTA — brand gradient, haptic feedback, loading + disabled states. */
export default function GradientButton({
  title,
  onPress,
  loading,
  disabled,
  icon,
  variant = "brand",
  style,
  full = true,
}: Props) {
  const isOutline = variant === "outline";
  const grad =
    variant === "ink"
      ? gradients.ink
      : variant === "success"
      ? gradients.success
      : gradients.brand;
  const glowShadow =
    variant === "ink"
      ? shadow.floating
      : variant === "success"
      ? shadow.glowSuccess
      : shadow.glow;

  const content = (
    <View style={styles.row}>
      {loading ? (
        <ActivityIndicator color={isOutline ? colors.brand : "#fff"} />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, isOutline && { color: colors.brand }]}>{title}</Text>
        </>
      )}
    </View>
  );

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      disabled={disabled || loading}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress?.();
      }}
      style={[
        full && styles.full,
        { opacity: disabled ? 0.55 : 1 },
        !isOutline && glowShadow,
        style,
      ]}
    >
      {isOutline ? (
        <View style={[styles.body, styles.outline]}>{content}</View>
      ) : (
        <LinearGradient
          colors={grad}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.body}
        >
          {content}
        </LinearGradient>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  full: { width: "100%" },
  body: {
    height: 56,
    borderRadius: radius._20,
    alignItems: "center",
    justifyContent: "center",
  },
  outline: {
    backgroundColor: colors.brandSoft,
    borderWidth: 1.5,
    borderColor: colors.brandSoft2,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  text: { color: "#fff", fontSize: font.title, fontWeight: font.bold, letterSpacing: 0.2 },
});
