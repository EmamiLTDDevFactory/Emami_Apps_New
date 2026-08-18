import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';
import { ChartCard } from './ChartCard';

export type HBar = { label: string; value: number; color: string; barLabel?: string };

/**
 * Horizontal bar chart, hand-built with flexbox rather than gifted-charts'
 * `horizontal` BarChart mode. The original Plotly charts need (a) an
 * "outside" text label at the END of each bar and (b) a per-bar color driven
 * by rankColor() for the Best/Worst Depot chart — gifted-charts' horizontal
 * mode places its topLabelComponent above the bar (vertical-bar convention),
 * not at the trailing edge, and offers no clean per-bar-color + end-label
 * combination. A plain View-based bar is simpler and pixel-exact here, and
 * keeps this in line with the flexbox tables used elsewhere on this screen.
 */
export function HBarChart({ title, data, caption }: { title: string; data: HBar[]; caption?: string }) {
  if (data.length === 0) return null;
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ChartCard title={title} caption={caption}>
      <View style={styles.rows}>
        {data.map((d, i) => (
          <View key={`${d.label}-${i}`} style={styles.row}>
            <Text style={styles.rowLabel} numberOfLines={1}>
              {d.label}
            </Text>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  { width: `${Math.max(3, (d.value / max) * 100)}%`, backgroundColor: d.color },
                ]}
              />
            </View>
            <Text style={styles.rowValue} numberOfLines={1}>
              {d.barLabel ?? String(d.value)}
            </Text>
          </View>
        ))}
      </View>
    </ChartCard>
  );
}

const styles = StyleSheet.create({
  rows: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowLabel: { width: 92, fontSize: 10, color: colors.g700 },
  track: { flex: 1, height: 14, backgroundColor: colors.g100, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  rowValue: { width: 66, fontSize: 10, fontWeight: '700', color: colors.g700, textAlign: 'right' },
});
