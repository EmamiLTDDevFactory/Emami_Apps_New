import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LayoutGrid, Star, Clock, Bell } from 'lucide-react-native';
import { colors, fonts, radii } from '../theme/tokens';
import { APPS, RECENT } from '../data/mockData';

export type SummaryTarget = 'AllApplications' | 'Favorites' | 'Recent' | 'notifications';

interface SummaryStripProps {
  favCount: number;
  unreadCount: number;
  onNavigate: (target: SummaryTarget) => void;
}

export default function SummaryStrip({ favCount, unreadCount, onNavigate }: SummaryStripProps) {
  const items: {
    label: string;
    value: number;
    icon: typeof LayoutGrid;
    accent: string;
    tint: string;
    target: SummaryTarget;
  }[] = [
    { label: 'Applications Available', value: APPS.length, icon: LayoutGrid, accent: colors.rust, tint: `${colors.rust}17`, target: 'AllApplications' },
    { label: 'Favorites', value: favCount, icon: Star, accent: colors.amber, tint: `${colors.amber}20`, target: 'Favorites' },
    { label: 'Recently Used', value: RECENT.length, icon: Clock, accent: colors.plum, tint: `${colors.plum}14`, target: 'Recent' },
    { label: 'Unread Notifications', value: unreadCount, icon: Bell, accent: '#A6472B', tint: '#A6472B17', target: 'notifications' },
  ];

  return (
    <View style={styles.grid}>
      {items.map((it) => (
        <Pressable
          key={it.label}
          onPress={() => onNavigate(it.target)}
          style={({ pressed }) => [
            styles.tile,
            { transform: [{ scale: pressed ? 0.98 : 1 }] },
          ]}
        >
          <View style={[styles.topAccent, { backgroundColor: it.accent }]} />
          <View style={styles.tileRow}>
            <View>
              <Text style={styles.value}>{it.value}</Text>
              <Text style={styles.label}>{it.label}</Text>
            </View>
            <View style={[styles.iconBox, { backgroundColor: it.tint }]}>
              <it.icon size={17} color={it.accent} strokeWidth={2} />
            </View>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 30,
  },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: colors.white,
    overflow: 'hidden',
    shadowColor: colors.ink,
    shadowOpacity: 0.03,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  topAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  tileRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  value: {
    fontSize: 26,
    fontFamily: fonts.serifSemiBold,
    color: colors.ink,
  },
  label: {
    fontSize: 12,
    color: colors.inkSoft,
    fontFamily: fonts.sansMedium,
    marginTop: 6,
    maxWidth: 130,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
