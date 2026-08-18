import React, { ReactNode, useState } from "react";
import { View, TextInput, StyleSheet, TextInputProps, TouchableOpacity, Text } from "react-native";
import * as Icons from "phosphor-react-native";
import { colors, radius, font } from "@/constants/theme";

type Props = TextInputProps & {
  icon?: ReactNode;
  label?: string;
  password?: boolean;
};

/** Labelled input with leading icon, focus ring and optional password toggle. */
export default function Field({ icon, label, password, style, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!password);

  return (
    <View style={styles.wrap}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.field, focused && styles.fieldFocused]}>
        {icon}
        <TextInput
          placeholderTextColor={colors.textFaint}
          secureTextEntry={hidden}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, style]}
          {...rest}
        />
        {password && (
          <TouchableOpacity onPress={() => setHidden((h) => !h)} hitSlop={8}>
            {hidden ? (
              <Icons.Eye size={20} color={colors.textMuted} />
            ) : (
              <Icons.EyeSlash size={20} color={colors.textMuted} />
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%" },
  label: { fontSize: font.sub, fontWeight: font.bold, color: colors.textBody, marginBottom: 8, marginLeft: 2 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 56,
    paddingHorizontal: 16,
    borderRadius: radius._17,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  fieldFocused: { borderColor: colors.brand, backgroundColor: "#fff" },
  input: { flex: 1, fontSize: font.body, color: colors.ink, fontWeight: font.medium, padding: 0, outlineStyle: 'none' as any },
});
