import { StyleSheet, Text } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { colors } from '@/constants/theme';
import { ChartCard } from './ChartCard';

export type VBar = { label: string; value: number; color: string; barLabel: string };

/**
 * Generic vertical bar chart used for both "GSV by Status (₹)" and, from
 * SlaCharts.tsx, "Orders vs SLA Breach Severity" — both are go.Bar(..., textposition="outside")
 * in the original, i.e. a colored bar per category with a formatted value label above it.
 */
export function GsvBarChart({ title, data }: { title: string; data: VBar[] }) {
  if (data.length === 0) return null;
  const barData = data.map((d) => ({
    value: d.value,
    label: d.label,
    frontColor: d.color,
    topLabelComponent: () => <Text style={styles.topLabel}>{d.barLabel}</Text>,
  }));
  return (
    <ChartCard title={title}>
      <BarChart
        data={barData}
        height={150}
        barWidth={Math.max(20, Math.min(38, 220 / data.length))}
        spacing={28}
        initialSpacing={18}
        endSpacing={18}
        hideYAxisText
        yAxisThickness={0}
        xAxisThickness={1}
        xAxisColor={colors.g200}
        xAxisLabelTextStyle={styles.xAxisLabel}
        noOfSections={4}
        disableScroll
        isAnimated
      />
    </ChartCard>
  );
}

const styles = StyleSheet.create({
  topLabel: { fontSize: 9.5, color: colors.g700, fontWeight: '600', marginBottom: 2 },
  xAxisLabel: { fontSize: 9.5, color: colors.g700 },
});
