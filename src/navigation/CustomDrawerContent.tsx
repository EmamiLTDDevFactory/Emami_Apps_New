import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radii, catColor } from '../theme/tokens';
import { NAV, APPS } from '../data/mockData';
import { useFavorites } from '../context/FavoritesContext';
import EmpAppMark from '../components/EmpAppMark';

export default function CustomDrawerContent({ state, navigation }: DrawerContentComponentProps) {
  const insets = useSafeAreaInsets();
  const { favorites } = useFavorites();
  const favoriteApps = APPS.filter((a) => favorites.has(a.id));
  const activeRoute = state.routeNames[state.index];
  const onOpenApp = (app: (typeof APPS)[number]) =>
    (navigation as any).navigate('AppDetail', { appId: app.id });

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 16 }]}>
      <View style={styles.brandRow}>
        <EmpAppMark size={30} dark />
        <Text style={styles.brandText}>EMAMI HUB</Text>
      </View>

      {favoriteApps.length > 0 && (
        <View style={styles.quickAccess}>
          <Text style={styles.quickAccessLabel}>Quick access</Text>
          <View style={styles.quickAccessRow}>
            {favoriteApps.map((app) => {
              const Icon = app.icon;
              const c = catColor(app.cat);
              return (
                <Pressable
                  key={app.id}
                  onPress={() => onOpenApp(app)}
                  style={[styles.quickAccessBtn, { backgroundColor: c }]}
                >
                  <Icon size={14} color={colors.white} />
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      <ScrollView style={styles.nav} contentContainerStyle={{ paddingBottom: 12 }}>
        {NAV.map((item) => {
          const active = activeRoute === item.id;
          const Icon = item.icon;
          return (
            <Pressable
              key={item.id}
              onPress={() => navigation.navigate(item.id)}
              style={[
                styles.navItem,
                {
                  backgroundColor: active ? `${colors.amber}22` : 'transparent',
                  borderLeftColor: active ? colors.amber : 'transparent',
                },
              ]}
            >
              <Icon size={18} color={active ? colors.amber : `${colors.cream}cc`} strokeWidth={2} />
              <Text style={[styles.navLabel, { color: active ? colors.amber : `${colors.cream}cc`, fontFamily: active ? fonts.sansSemiBold : fonts.sansMedium }]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Text style={styles.footerText}>© {new Date().getFullYear()} Emami Limited</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.plum,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  brandText: {
    color: colors.white,
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
    letterSpacing: 0.3,
  },
  quickAccess: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  quickAccessLabel: {
    color: `${colors.cream}66`,
    fontSize: 10.5,
    fontFamily: fonts.sansBold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  quickAccessRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  quickAccessBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nav: {
    flex: 1,
    paddingHorizontal: 12,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: radii.sm + 1,
    borderLeftWidth: 3,
    marginBottom: 2,
  },
  navLabel: {
    fontSize: 13.5,
    flex: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  footerText: {
    color: `${colors.cream}80`,
    fontSize: 11,
    fontFamily: fonts.sansRegular,
  },
});
