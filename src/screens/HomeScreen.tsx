import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import ScreenScaffold from '../components/ScreenScaffold';
import DashboardHero from '../components/DashboardHero';
import SummaryStrip, { SummaryTarget } from '../components/SummaryStrip';
import FilterBar from '../components/FilterBar';
import AppGrid from '../components/AppGrid';
import { useFavorites } from '../context/FavoritesContext';
import { useNotificationsUI } from '../context/NotificationsUIContext';
import { useFilteredApps } from '../hooks/useFilteredApps';
import { RECENT, NOTIFICATIONS, appById, CURRENT_USER, unreadNotificationsCount } from '../data/mockData';
import { colors, fonts, radii, catColor } from '../theme/tokens';
import type { AppItem, CategoryFilter, SortOption } from '../types';
import type { RootStackParamList } from '../navigation/types';

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { favorites, toggleFavorite } = useFavorites();
  const { openPanel: openNotifications } = useNotificationsUI();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('All');
  const [sort, setSort] = useState<SortOption>('Alphabetical');

  const apps = useFilteredApps({ query, category, sort });
  const previewItems = NOTIFICATIONS.filter((n) => n.unread).slice(0, 2);

  const openApp = (app: AppItem) => navigation.navigate('AppDetail', { appId: app.id });

  const handleSummaryNavigate = (target: SummaryTarget) => {
    if (target === 'notifications') {
      openNotifications();
    } else {
      navigation.navigate('Main', { screen: target });
    }
  };

  return (
    <ScreenScaffold searchValue={query} onSearchChange={setQuery}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <DashboardHero
          name={CURRENT_USER.name.split(' ')[0]}
          unreadCount={unreadNotificationsCount}
          previewItems={previewItems}
          onOpenNotifications={openNotifications}
        />

        <SummaryStrip favCount={favorites.size} unreadCount={unreadNotificationsCount} onNavigate={handleSummaryNavigate} />

        <Text style={styles.sectionTitle}>My Applications</Text>
        <FilterBar category={category} onCategoryChange={setCategory} sort={sort} onSortChange={setSort} />
        <AppGrid
          apps={apps}
          favorites={favorites}
          query={query}
          onOpenApp={openApp}
          onToggleFavorite={toggleFavorite}
          scrollEnabled={false}
        />

        <Text style={[styles.sectionTitle, styles.recentTitle]}>Recently Used</Text>
        <View style={styles.recentList}>
          {RECENT.map((r, i) => {
            const app = appById(r.id);
            if (!app) return null;
            const Icon = app.icon;
            const accent = catColor(app.cat);
            return (
              <Pressable
                key={r.id}
                onPress={() => openApp(app)}
                style={[styles.recentRow, i < RECENT.length - 1 && styles.recentRowBorder]}
              >
                <View style={[styles.recentIcon, { backgroundColor: `${accent}1f` }]}>
                  <Icon size={16} color={accent} />
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.recentName}>{app.name}</Text>
                  <Text style={styles.recentWhen}>{r.when}</Text>
                </View>
                <ChevronRight size={15} color={colors.inkSoft} />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: fonts.sansBold,
    color: colors.ink,
    marginBottom: 14,
  },
  recentTitle: {
    marginTop: 8,
  },
  recentList: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  recentRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  recentIcon: {
    width: 34,
    height: 34,
    borderRadius: radii.sm + 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex1: {
    flex: 1,
  },
  recentName: {
    fontSize: 13.5,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  recentWhen: {
    fontSize: 11.5,
    color: colors.inkSoft,
    fontFamily: fonts.sansRegular,
    marginTop: 2,
  },
});
