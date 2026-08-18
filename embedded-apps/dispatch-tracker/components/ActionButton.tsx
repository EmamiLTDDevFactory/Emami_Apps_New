import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius } from '@/constants/theme';

/** Ported 1:1 from the action-button color recipes in spec_main_panel.md §8. */
export const actionButtonRecipes = {
  deliver: { bg: colors.greenLt, border: colors.greenBd, text: colors.greenDk },
  return: { bg: colors.amberLt, border: colors.amberBd, text: colors.amberDk },
  cancel: { bg: colors.redLt, border: colors.redBd, text: colors.redDk },
  cancelPending: { bg: colors.redLt, border: colors.redBd, text: colors.redDk },
  dispatch: { bg: colors.green, border: colors.green, text: '#fff' },
  uploadPod: { bg: colors.navyLt, border: colors.navyBd, text: colors.navy },
  viewPod: { bg: colors.greenLt, border: colors.greenBd, text: colors.greenDk },
  reupPod: { bg: colors.amberLt, border: colors.amberBd, text: colors.amberDk },
} as const;

type Recipe = keyof typeof actionButtonRecipes;

export function ActionButton({
  label,
  recipe,
  onPress,
  disabled,
  fullWidth,
}: {
  label: string;
  recipe: Recipe;
  onPress: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
}) {
  const c = actionButtonRecipes[recipe];
  return (
    <Pressable
      style={[
        styles.btn,
        { backgroundColor: c.bg, borderColor: c.border },
        fullWidth && { flex: 1 },
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}>
      <Text style={[styles.text, { color: c.text }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderWidth: 1.5,
    borderRadius: radius.sm,
    paddingVertical: 9,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 32,
  },
  disabled: { opacity: 0.4 },
  text: { fontSize: 12, fontWeight: '700' },
});
