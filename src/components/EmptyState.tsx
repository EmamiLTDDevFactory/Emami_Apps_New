import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Inbox } from 'lucide-react-native';
import { colors, fonts } from '../theme/tokens';

interface EmptyStateProps {
  query?: string;
}

export default function EmptyState({ query }: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconCircle}>
        <Inbox size={24} color={colors.rust} />
      </View>
      <Text style={styles.title}>No applications found</Text>
      <Text style={styles.subtitle}>
        {query ? `Nothing matches "${query}". Try a different name or clear the filters.` : 'Try adjusting your filters or search terms.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 72,
    paddingHorizontal: 24,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 16,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13.5,
    color: colors.inkSoft,
    fontFamily: fonts.sansRegular,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 19,
  },
});
