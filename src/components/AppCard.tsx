import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Star, ChevronRight } from 'lucide-react-native';
import type { AppItem } from '../types';
import { colors, fonts, radii, catColor } from '../theme/tokens';

interface AppCardProps {
  app: AppItem;
  isFavorite: boolean;
  isTopUsed: boolean;
  onPress: (app: AppItem) => void;
  onToggleFavorite: (id: string) => void;
}

export default function AppCard({ app, isFavorite, isTopUsed, onPress, onToggleFavorite }: AppCardProps) {
  const Icon = app.icon;
  const accent = catColor(app.cat);

  return (
    <Pressable
      onPress={() => onPress(app)}
      style={({ pressed }) => [styles.pressWrap, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
      android_ripple={{ color: `${accent}22` }}
    >
      <LinearGradient
        colors={[`${accent}38`, colors.white]}
        locations={[0, 0.65]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={[styles.card, { borderColor: `${accent}40` }]}
      >
      <View style={[styles.topAccent, { backgroundColor: accent }]} />

      <View style={styles.headerRow}>
        <View style={[styles.iconBox, { backgroundColor: accent, shadowColor: accent }]}>
          <Icon size={21} color={colors.white} strokeWidth={2} />
        </View>
        <Pressable
          hitSlop={10}
          onPress={() => onToggleFavorite(app.id)}
          style={styles.favBtn}
        >
          <Star size={18} color={isFavorite ? colors.amber : colors.border} fill={isFavorite ? colors.amber : 'transparent'} strokeWidth={1.8} />
        </Pressable>
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>{app.name}</Text>
        </View>
        <View style={styles.tagsRow}>
          {isTopUsed && (
            <View style={[styles.miniBadge, { backgroundColor: `${colors.rust}17`, borderColor: `${colors.rust}33` }]}>
              <Text style={[styles.miniBadgeText, { color: colors.rust }]}>Most used</Text>
            </View>
          )}
          {app.isNew && (
            <View style={[styles.miniBadge, { backgroundColor: colors.greenTint, borderColor: colors.greenBorder }]}>
              <Text style={[styles.miniBadgeText, { color: colors.green }]}>New</Text>
            </View>
          )}
        </View>
        <Text style={styles.desc} numberOfLines={2}>{app.desc}</Text>
      </View>

      <View style={styles.footerRow}>
        <View style={[styles.catBadge, { backgroundColor: `${accent}22`, borderColor: `${accent}55` }]}>
          <Text style={[styles.catBadgeText, { color: accent }]}>{app.cat}</Text>
        </View>
        <View style={styles.openRow}>
          <Text style={[styles.openText, { color: accent }]}>Open</Text>
          <ChevronRight size={14} color={accent} />
        </View>
      </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressWrap: {
    flex: 1,
    borderRadius: radii.xl,
    shadowColor: colors.ink,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  card: {
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: 16,
    minHeight: 172,
    overflow: 'hidden',
    flex: 1,
  },
  topAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  favBtn: {
    padding: 4,
  },
  body: {
    flex: 1,
    marginTop: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 15,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  miniBadge: {
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  miniBadgeText: {
    fontSize: 9.5,
    fontFamily: fonts.sansBold,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  desc: {
    fontSize: 13,
    color: colors.inkSoft,
    fontFamily: fonts.sansRegular,
    lineHeight: 18.5,
    marginTop: 8,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  catBadge: {
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  catBadgeText: {
    fontSize: 10.5,
    fontFamily: fonts.sansBold,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  openRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  openText: {
    fontSize: 12.5,
    fontFamily: fonts.sansSemiBold,
  },
});
