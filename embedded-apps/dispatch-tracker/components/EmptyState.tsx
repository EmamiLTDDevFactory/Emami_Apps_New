import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '@/constants/theme';

/** Ported 1:1 from dis_shared_components.py's _no_data(msg, icon, hint). */
export function EmptyState({ message, icon = '📭', hint }: { message: string; icon?: string; hint?: string }) {
  return (
    <View style={styles.box}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.message}>{message}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: '#F8FAFF',
    borderWidth: 1.5,
    borderColor: colors.navyBd,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  icon: { fontSize: 20, opacity: 0.6 },
  message: { fontSize: 12, fontWeight: '600', color: colors.g700, textAlign: 'center' },
  hint: { fontSize: 10, color: colors.g400, textAlign: 'center' },
});
