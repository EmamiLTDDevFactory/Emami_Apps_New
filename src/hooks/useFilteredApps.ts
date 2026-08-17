import { useMemo } from 'react';
import { APPS } from '../data/mockData';
import type { CategoryFilter, SortOption } from '../types';

interface UseFilteredAppsOptions {
  query: string;
  category: CategoryFilter;
  sort: SortOption;
  favorites?: Set<string>;
  onlyFavorites?: boolean;
}

export function useFilteredApps({ query, category, sort, favorites, onlyFavorites }: UseFilteredAppsOptions) {
  return useMemo(() => {
    let list = APPS.filter(
      (a) => (category === 'All' || a.cat === category) && a.name.toLowerCase().includes(query.toLowerCase())
    );
    if (onlyFavorites && favorites) {
      list = list.filter((a) => favorites.has(a.id));
    }
    if (sort === 'Alphabetical') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'Most Used') list = [...list].sort((a, b) => b.uses - a.uses);
    return list;
  }, [query, category, sort, favorites, onlyFavorites]);
}
