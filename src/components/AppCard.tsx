import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Star } from 'lucide-react-native';
import type { AppItem } from '../types';
import { colors, fonts, radii, appColor } from '../theme/tokens';

interface AppCardProps {
  app: AppItem;
  isFavorite: boolean;
  isTopUsed: boolean;
  onPress: (app: AppItem) => void;
  onToggleFavorite: (id: string) => void;
}

export default function AppCard({ app, isFavorite, isTopUsed, onPress, onToggleFavorite }: AppCardProps) {
  const Icon = app.icon;
  const accent = appColor(app.id);

  return (
    <Pressable
      onPress={() => onPress(app)}
      style={({ pressed }) => [
        styles.card,
        { shadowColor: accent, shadowOpacity: pressed ? 0.18 : 0.1, transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
      android_ripple={{ color: `${accent}14` }}
    >
      <View style={styles.headerRow}>
        <View style={[styles.iconBoxShadow, { shadowColor: accent }]}>
          <LinearGradient
            colors={[`${accent}33`, `${accent}12`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconBox}
          >
            <Icon size={19} color={accent} strokeWidth={2.1} />
          </LinearGradient>
        </View>
        <Pressable hitSlop={10} onPress={() => onToggleFavorite(app.id)} style={styles.favBtn}>
          <Star size={16} color={isFavorite ? colors.amber : colors.border} fill={isFavorite ? colors.amber : 'transparent'} strokeWidth={1.8} />
        </Pressable>
      </View>

      <Text style={styles.title} numberOfLines={1}>{app.name}</Text>

      {isTopUsed && (
        <View style={[styles.miniBadge, { backgroundColor: `${accent}14` }]}>
          <Text style={[styles.miniBadgeText, { color: accent }]}>Most used</Text>
        </View>
      )}

      <Text style={styles.desc} numberOfLines={2}>{app.desc}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: 16,
    minHeight: 150,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  iconBoxShadow: {
    borderRadius: radii.md,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favBtn: {
    padding: 4,
  },
  title: {
    fontSize: 14.5,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    marginTop: 14,
  },
  miniBadge: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 6,
  },
  miniBadgeText: {
    fontSize: 9,
    fontFamily: fonts.sansBold,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  desc: {
    fontSize: 12.5,
    color: colors.inkSoft,
    fontFamily: fonts.sansRegular,
    lineHeight: 18,
    marginTop: 8,
  },
});
