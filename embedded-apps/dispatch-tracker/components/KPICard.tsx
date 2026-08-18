import { StyleSheet, Text, View } from 'react-native';
import { colors, kpiTint, radius, shadow } from '@/constants/theme';

/** Ported 1:1 from dis_shared_components.py's _kpi(icon, label, val, color, sub). */
export function KPICard({
  icon,
  label,
  value,
  color = colors.navy,
  sub,
}: {
  icon: string;
  label: string;
  value: string;
  color?: string;
  sub?: string;
}) {
  const tint = kpiTint[color] ?? colors.navyLt;
  return (
    <View style={[styles.card, shadow.sm]}>
      <View style={[styles.accent, { backgroundColor: color }]} />
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.label} numberOfLines={1}>
            {label}
          </Text>
          <View style={[styles.iconChip, { backgroundColor: tint }]}>
            <Text style={{ fontSize: 13 }}>{icon}</Text>
          </View>
        </View>
        <Text style={styles.value} numberOfLines={1}>
          {value}
        </Text>
        {sub ? (
          <Text style={styles.sub} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 90,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.g200,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  accent: { height: 3, width: '100%' },
  body: { padding: 10, paddingHorizontal: 13, gap: 4 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 8.5, fontWeight: '700', color: colors.g400, letterSpacing: 0.7, textTransform: 'uppercase', flex: 1 },
  iconChip: { width: 26, height: 26, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 20, fontWeight: '900', color: colors.g900, letterSpacing: -0.5 },
  sub: { fontSize: 10, color: colors.g400 },
});
