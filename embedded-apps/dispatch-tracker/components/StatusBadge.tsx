import { StyleSheet, Text, View } from 'react-native';
import { podBadge, statusBadge } from '@/constants/theme';

type StatusKey = keyof typeof statusBadge;

/** Ported 1:1 from the .badge-* status-pill recipes in main_panel.py's global CSS. */
export function StatusBadge({ status, label }: { status: StatusKey; label: string }) {
  const c = statusBadge[status];
  return (
    <View style={[styles.pill, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Text style={[styles.text, { color: c.text }]}>{label}</Text>
    </View>
  );
}

type PodKey = keyof typeof podBadge;

/** Ported 1:1 from the .pod-* status-pill recipes. */
export function PodBadge({ status, label }: { status: PodKey; label: string }) {
  const c = podBadge[status];
  return (
    <View style={[styles.pill, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Text style={[styles.text, { color: c.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  text: { fontSize: 10, fontWeight: '700' },
});
