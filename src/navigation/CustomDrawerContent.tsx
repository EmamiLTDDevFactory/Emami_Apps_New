import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, radii, appColor, gradients } from '../theme/tokens';
import { NAV, APPS } from '../data/mockData';
import { useFavorites } from '../context/FavoritesContext';
import EmpAppMark from '../components/EmpAppMark';

const NAV_COLORS: Record<string, string> = {
  Home: colors.rust,
  MyApplications: '#2563EB',
  Favorites: '#F59E0B',
  Recent: '#0D9488',
  AllApplications: '#7C3AED',
  Help: '#DB2777',
  Settings: '#6B7280',
};

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
        <EmpAppMark size={34} />
        <Text style={styles.brandText}>EMAMI HUB</Text>
      </View>

      {favoriteApps.length > 0 && (
        <View style={styles.quickAccess}>
          <Text style={styles.quickAccessLabel}>Quick access</Text>
          <View style={styles.quickAccessRow}>
            {favoriteApps.map((app) => {
              const Icon = app.icon;
              const c = appColor(app.id);
              return (
                <Pressable
                  key={app.id}
                  onPress={() => onOpenApp(app)}
                  style={[
                    styles.quickAccessBtn,
                    { backgroundColor: `${c}1a`, shadowColor: c },
                  ]}
                >
                  <Icon size={14} color={c} />
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
          const itemColor = NAV_COLORS[item.id] ?? colors.rust;
          return (
            <Pressable
              key={item.id}
              onPress={() => navigation.navigate(item.id)}
              style={[styles.navItemShadow, active && styles.navItemActiveShadow]}
            >
              <View style={styles.navItem}>
                {active && (
                  <LinearGradient
                    colors={gradients.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradientFill}
                  />
                )}
                <View style={[styles.navIconBox, { backgroundColor: active ? 'rgba(255,255,255,0.2)' : `${itemColor}16` }]}>
                  <Icon size={15} color={active ? colors.white : itemColor} strokeWidth={2.2} />
                </View>
                <Text style={[styles.navLabel, { color: active ? colors.white : colors.ink, fontFamily: active ? fonts.sansBold : fonts.sansMedium }]}>
                  {item.label}
                </Text>
              </View>
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
    backgroundColor: colors.white,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  brandText: {
    color: colors.ink,
    fontFamily: fonts.sansBold,
    fontSize: 14,
    letterSpacing: 0.3,
  },
  quickAccess: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  quickAccessLabel: {
    color: colors.inkSoft,
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
    shadowOpacity: 0.25,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  nav: {
    flex: 1,
    paddingHorizontal: 12,
  },
  navItemShadow: {
    borderRadius: radii.lg,
    marginBottom: 4,
  },
  navItemActiveShadow: {
    shadowColor: colors.rust,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  gradientFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radii.lg,
  },
  navIconBox: {
    width: 30,
    height: 30,
    borderRadius: radii.sm + 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    fontSize: 13,
    flex: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: {
    color: colors.inkSoft,
    fontSize: 11,
    fontFamily: fonts.sansRegular,
  },
});
