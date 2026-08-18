import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius } from '@/constants/theme';

/**
 * Ported from _pg_controls() (standard "Showing X–Y of Z" + Prev/Next used
 * by Pending/Completed/Returned/Cancelled) and the "⇤ First ‹ Prev Next › Last ⇥"
 * footer used by SAP-Dispatched/Reports. `variant="full"` adds First/Last;
 * `showJump` adds the Reports-only page-number input.
 */
export function Pagination({
  page,
  totalItems,
  pageSize,
  onPageChange,
  variant = 'simple',
  showJump = false,
}: {
  page: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  variant?: 'simple' | 'full';
  showJump?: boolean;
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const [jump, setJump] = useState('');
  if (totalItems <= pageSize) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  function go(p: number) {
    onPageChange(Math.min(Math.max(1, p), totalPages));
  }

  return (
    <View style={styles.row}>
      <Text style={styles.info}>
        Showing {start}–{end} of {totalItems} (page {page}/{totalPages})
      </Text>
      <View style={styles.controls}>
        {variant === 'full' && (
          <Pressable style={[styles.btn, page === 1 && styles.btnDisabled]} disabled={page === 1} onPress={() => go(1)}>
            <Text style={styles.btnText}>⇤ First</Text>
          </Pressable>
        )}
        <Pressable style={[styles.btn, page === 1 && styles.btnDisabled]} disabled={page === 1} onPress={() => go(page - 1)}>
          <Text style={styles.btnText}>‹ Prev</Text>
        </Pressable>
        {showJump && (
          <TextInput
            style={styles.jumpInput}
            keyboardType="number-pad"
            placeholder={String(page)}
            value={jump}
            onChangeText={setJump}
            onSubmitEditing={() => {
              const n = parseInt(jump, 10);
              if (!Number.isNaN(n)) go(n);
              setJump('');
            }}
          />
        )}
        <Pressable
          style={[styles.btn, page === totalPages && styles.btnDisabled]}
          disabled={page === totalPages}
          onPress={() => go(page + 1)}>
          <Text style={styles.btnText}>Next ›</Text>
        </Pressable>
        {variant === 'full' && (
          <Pressable
            style={[styles.btn, page === totalPages && styles.btnDisabled]}
            disabled={page === totalPages}
            onPress={() => go(totalPages)}>
            <Text style={styles.btnText}>Last ⇥</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, flexWrap: 'wrap', gap: 8 },
  info: { fontSize: 11, color: colors.g500 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  btn: { borderWidth: 1.5, borderColor: colors.g200, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.surface },
  btnDisabled: { opacity: 0.4 },
  btnText: { fontSize: 11, fontWeight: '600', color: colors.g700 },
  jumpInput: {
    width: 44,
    height: 30,
    borderWidth: 1.5,
    borderColor: colors.g200,
    borderRadius: radius.sm,
    textAlign: 'center',
    fontSize: 12,
    color: colors.nearBlack,
  },
});
