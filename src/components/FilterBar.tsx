import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, StyleSheet } from 'react-native';
import { SlidersHorizontal, Check } from 'lucide-react-native';
import { colors, fonts, radii, shadows } from '../theme/tokens';
import { CATEGORIES } from '../data/mockData';
import type { CategoryFilter, SortOption } from '../types';

const SORT_OPTIONS: SortOption[] = ['Alphabetical', 'Most Used', 'Recently Used'];

interface FilterBarProps {
  category: CategoryFilter;
  onCategoryChange: (c: CategoryFilter) => void;
  sort: SortOption;
  onSortChange: (s: SortOption) => void;
}

export default function FilterBar({ category, onCategoryChange, sort, onSortChange }: FilterBarProps) {
  const [sortOpen, setSortOpen] = useState(false);

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        {CATEGORIES.map((c) => {
          const active = category === c;
          if (active) {
            return (
              <Pressable
                key={c}
                onPress={() => onCategoryChange(c)}
                style={[styles.chip, styles.chipActive]}
                accessibilityRole="button"
                accessibilityLabel={`${c} category, selected`}
              >
                <Text style={[styles.chipText, { color: colors.white }]}>{c}</Text>
              </Pressable>
            );
          }
          return (
            <Pressable
              key={c}
              onPress={() => onCategoryChange(c)}
              style={[styles.chip, { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white }]}
              accessibilityRole="button"
              accessibilityLabel={`${c} category`}
            >
              <Text style={[styles.chipText, { color: colors.inkSoft }]}>{c}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Pressable
        onPress={() => setSortOpen(true)}
        style={styles.sortBtn}
        hitSlop={{ top: 4, bottom: 4 }}
        accessibilityRole="button"
        accessibilityLabel={`Sort by, currently ${sort}`}
      >
        <SlidersHorizontal size={13} color={colors.inkSoft} />
        <Text style={styles.sortText}>{sort}</Text>
      </Pressable>

      <Modal visible={sortOpen} transparent animationType="fade" onRequestClose={() => setSortOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setSortOpen(false)} accessibilityLabel="Close sort menu" accessibilityRole="button">
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Sort by</Text>
            {SORT_OPTIONS.map((opt) => (
              <Pressable
                key={opt}
                style={styles.sheetRow}
                onPress={() => { onSortChange(opt); setSortOpen(false); }}
                accessibilityRole="radio"
                accessibilityState={{ checked: sort === opt }}
                accessibilityLabel={opt}
              >
                <Text style={styles.sheetLabel}>{opt}</Text>
                {sort === opt && <Check size={16} color={colors.rust} />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  chipsRow: {
    gap: 6,
    paddingRight: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  chipActive: {
    backgroundColor: colors.rust,
    ...shadows.sm,
  },
  chipText: {
    fontSize: 12.5,
    fontFamily: fonts.sansSemiBold,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm + 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: colors.white,
  },
  sortText: {
    fontSize: 12.5,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(31,27,51,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingBottom: 24,
    paddingTop: 8,
  },
  sheetTitle: {
    fontSize: 13,
    fontFamily: fonts.sansBold,
    color: colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    padding: 16,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sheetLabel: {
    fontSize: 14.5,
    fontFamily: fonts.sansMedium,
    color: colors.ink,
  },
});
