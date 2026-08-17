import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import ScreenScaffold from '../components/ScreenScaffold';
import FilterBar from '../components/FilterBar';
import AppGrid from '../components/AppGrid';
import { useFavorites } from '../context/FavoritesContext';
import { useFilteredApps } from '../hooks/useFilteredApps';
import { colors, fonts } from '../theme/tokens';
import type { AppItem, CategoryFilter, SortOption } from '../types';
import type { RootStackParamList } from '../navigation/types';

interface AppListScreenProps {
  title: string;
  onlyFavorites?: boolean;
}

export default function AppListScreen({ title, onlyFavorites }: AppListScreenProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { favorites, toggleFavorite } = useFavorites();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('All');
  const [sort, setSort] = useState<SortOption>('Alphabetical');

  const apps = useFilteredApps({ query, category, sort, favorites, onlyFavorites });

  const openApp = (app: AppItem) => navigation.navigate('AppDetail', { appId: app.id });

  return (
    <ScreenScaffold searchValue={query} onSearchChange={setQuery}>
      <View style={styles.wrap}>
        <Text style={styles.title}>{title}</Text>
        <FilterBar category={category} onCategoryChange={setCategory} sort={sort} onSortChange={setSort} />
        <AppGrid apps={apps} favorites={favorites} query={query} onOpenApp={openApp} onToggleFavorite={toggleFavorite} />
      </View>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  title: {
    fontFamily: fonts.serifSemiBold,
    fontSize: 22,
    color: colors.ink,
    marginBottom: 16,
  },
});
