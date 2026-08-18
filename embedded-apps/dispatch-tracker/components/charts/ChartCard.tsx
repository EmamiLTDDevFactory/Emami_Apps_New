import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadow } from '@/constants/theme';

/** Shared card shell for every chart wrapper — mirrors the Plotly chart title styling
 *  ({text-align:left, size:12, color:#1E3A7B}) used throughout dis_shared_components.py. */
export function ChartCard({ title, caption, children }: { title: string; caption?: string; children: React.ReactNode }) {
  return (
    <View style={[styles.card, shadow.sm]}>
      <Text style={styles.title}>{title}</Text>
      {children}
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.g200,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 10,
  },
  title: { fontSize: 12, fontWeight: '700', color: colors.navy, marginBottom: 10 },
  caption: { fontSize: 9, color: colors.g400, textAlign: 'center', marginTop: 8 },
});
