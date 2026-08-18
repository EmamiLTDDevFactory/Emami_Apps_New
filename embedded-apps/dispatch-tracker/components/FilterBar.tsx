import { useState, useMemo } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Portal from './Portal';
import { colors, radius } from '@/constants/theme';

export function SearchInput({
  value,
  onChangeText,
  placeholder = '🔍  Search',
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <TextInput
      style={styles.search}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.g400}
    />
  );
}

/** Compact inline filter dropdown used in every tab's filter row (Depot, Town, Period, Sort, ...). */
export function FilterSelect({
  value,
  options,
  onChange,
  minWidth = 110,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  minWidth?: number;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: minWidth, height: 0 });
  const nativeId = useMemo(() => `filter-chip-${Math.random().toString(36).slice(2)}`, []);
  return (
    <View style={{ minWidth }}>
      <Pressable
        nativeID={nativeId}
        style={styles.chip}
        onPress={() => {
          const willOpen = !open;
          if (willOpen && typeof document !== 'undefined') {
            const el = document.getElementById(nativeId);
            if (el) {
              const r = el.getBoundingClientRect();
              setCoords({ top: r.top + window.scrollY, left: r.left + window.scrollX, width: r.width, height: r.height });
            }
          }
          setOpen((o) => !o);
        }}>
        <Text style={styles.chipText} numberOfLines={1}>
          {value}
        </Text>
        <Text style={styles.chipCaret}>{open ? '▲' : '▼'}</Text>
      </Pressable>
      {open && (
        <Portal>
          <View
            style={[
              styles.dropdown,
              {
                position: 'absolute',
                top: coords.top + coords.height,
                left: coords.left,
                minWidth: coords.width,
              },
            ]}>
            {options.map((opt) => (
              <Pressable
                key={opt}
                style={styles.dropdownItem}
                onPress={() => {
                  onChange(opt);
                  setOpen(false);
                }}>
                <Text style={{ fontSize: 12, color: opt === value ? colors.navy : colors.nearBlack, fontWeight: opt === value ? '600' : '400' }}>
                  {opt}
                </Text>
              </Pressable>
            ))}
          </View>
        </Portal>
      )}
    </View>
  );
}

export function FilterRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

export function ActiveFilterChip({ label }: { label: string }) {
  return (
    <View style={styles.activeChip}>
      <Text style={styles.activeChipText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap', paddingVertical: 8 },
  search: {
    flexGrow: 1,
    minWidth: 160,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.g200,
    borderRadius: radius.sm,
    paddingHorizontal: 11,
    height: 34,
    fontSize: 12,
    color: colors.nearBlack,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.g200,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    height: 34,
  },
  chipText: { fontSize: 12, fontWeight: '500', color: colors.nearBlack, flex: 1 },
  chipCaret: { fontSize: 9, color: colors.g400, marginLeft: 6 },
  dropdown: {
    position: 'absolute',
    top: 36,
    left: 0,
    right: 0,
    zIndex: 20,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.g200,
    borderRadius: radius.sm,
    maxHeight: 240,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  dropdownItem: { paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.g100 },
  activeChip: { backgroundColor: colors.navyLt, borderWidth: 1, borderColor: colors.navyBd, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  activeChipText: { fontSize: 10, fontWeight: '700', color: colors.navy },
});
