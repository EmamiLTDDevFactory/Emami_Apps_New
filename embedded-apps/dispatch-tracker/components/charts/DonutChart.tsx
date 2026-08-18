import { StyleSheet, Text, View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { colors } from '@/constants/theme';
import { ChartCard } from './ChartCard';

export type DonutSlice = { label: string; value: number; color: string };

/**
 * Ported from the "Invoice Status Mix" go.Pie(hole=0.52, textinfo="percent+label")
 * chart. gifted-charts' inline pie labels overlap badly at phone chart sizes, so —
 * per the porting note allowing a legend fallback — percent+label is rendered as a
 * legend row below the donut instead of inline slice text.
 */
export function DonutChart({ title, data }: { title: string; data: DonutSlice[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total <= 0) return null;
  const pieData = data.map((d) => ({ value: d.value, color: d.color }));
  return (
    <ChartCard title={title}>
      <View style={styles.pieRow}>
        <PieChart
          data={pieData}
          donut
          radius={78}
          innerRadius={41}
          innerCircleColor={colors.surface}
        />
        <View style={styles.legend}>
          {data.map((d) => (
            <View key={d.label} style={styles.legendRow}>
              <View style={[styles.dot, { backgroundColor: d.color }]} />
              <Text style={styles.legendLabel} numberOfLines={1}>
                {d.label}
              </Text>
              <Text style={styles.legendValue}>
                {d.value} ({((d.value / total) * 100).toFixed(0)}%)
              </Text>
            </View>
          ))}
        </View>
      </View>
    </ChartCard>
  );
}

const styles = StyleSheet.create({
  pieRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  legend: { flex: 1, gap: 6 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { flex: 1, fontSize: 11, color: colors.g700 },
  legendValue: { fontSize: 11, fontWeight: '700', color: colors.g900 },
});
