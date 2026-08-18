import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';

/** Ported 1:1 from dis_shared_components.py's _sec(title, subtitle). */
export function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.bar} />
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 10 },
  bar: { width: 3, height: 14, borderRadius: 2, backgroundColor: colors.navy },
  title: { fontSize: 10, fontWeight: '700', color: colors.navy, letterSpacing: 1, textTransform: 'uppercase' },
  subtitle: { fontSize: 10, color: colors.g400 },
});
