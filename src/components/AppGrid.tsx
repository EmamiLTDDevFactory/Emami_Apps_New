import React from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import type { AppItem } from '../types';
import AppCard from './AppCard';
import EmptyState from './EmptyState';
import { topUsedAppId } from '../data/mockData';

interface AppGridProps {
  apps: AppItem[];
  favorites: Set<string>;
  query: string;
  onOpenApp: (app: AppItem) => void;
  onToggleFavorite: (id: string) => void;
  ListHeaderComponent?: React.ReactElement;
  scrollEnabled?: boolean;
}

export default function AppGrid({ apps, favorites, query, onOpenApp, onToggleFavorite, ListHeaderComponent, scrollEnabled = true }: AppGridProps) {
  return (
    <FlatList
      data={apps}
      keyExtractor={(item) => item.id}
      numColumns={2}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.content}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={<EmptyState query={query} />}
      scrollEnabled={scrollEnabled}
      nestedScrollEnabled
      renderItem={({ item }) => (
        <View style={styles.cell}>
          <AppCard
            app={item}
            isFavorite={favorites.has(item.id)}
            isTopUsed={item.id === topUsedAppId}
            onPress={onOpenApp}
            onToggleFavorite={onToggleFavorite}
          />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 8,
  },
  row: {
    gap: 12,
  },
  cell: {
    flex: 1,
    marginBottom: 12,
  },
});
