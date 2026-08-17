import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { ChevronRight } from 'lucide-react-native';
import { colors, fonts, radii } from '../theme/tokens';
import type { NotificationItem } from '../types';

interface DashboardHeroProps {
  name: string;
  unreadCount: number;
  previewItems: NotificationItem[];
  onOpenNotifications: () => void;
}

function DotGrid() {
  const dots = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 8; col++) {
      dots.push(<Circle key={`${row}-${col}`} cx={col * 16 + 8} cy={row * 16 + 8} r={1.6} fill={colors.cream} />);
    }
  }
  return (
    <Svg width={140} height={90} style={styles.dotGrid}>
      {dots}
    </Svg>
  );
}

export default function DashboardHero({ name, unreadCount, previewItems, onOpenNotifications }: DashboardHeroProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <LinearGradient
      colors={[colors.rust, colors.plum, colors.plumDeep]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
    >
      <View style={styles.decorLayer} pointerEvents="none">
        <View style={[styles.ring, { width: 150, height: 150, borderRadius: 75, right: -30, top: -30 }]} />
        <View style={[styles.ring, { width: 90, height: 90, borderRadius: 45, right: 30, top: 40, opacity: 0.6 }]} />
        <DotGrid />
      </View>

      <View style={styles.textBlock}>
        <Text style={styles.dateLabel}>{dateLabel}</Text>
        <Text style={styles.greeting}>{greeting}, {name}</Text>
        <Text style={styles.subtitle}>Access your enterprise applications and services from one place.</Text>
      </View>

      <View style={styles.actionsRow}>
        <Pressable onPress={() => setPreviewOpen((v) => !v)} style={styles.pendingCard}>
          <Text style={styles.pendingValue}>{unreadCount}</Text>
          <Text style={styles.pendingLabel}>Unread notifications</Text>
        </Pressable>

        <Pressable onPress={onOpenNotifications} style={styles.ctaCard}>
          <Text style={styles.ctaTitle}>View notifications</Text>
          <View style={styles.ctaSubRow}>
            <Text style={styles.ctaSub}>Open now</Text>
            <ChevronRight size={12} color={colors.plumDeep} />
          </View>
        </Pressable>
      </View>

      {previewOpen && previewItems.length > 0 && (
        <View style={styles.previewPopover}>
          {previewItems.map((n, i) => (
            <View key={n.id} style={[styles.previewRow, i < previewItems.length - 1 && styles.previewRowBorder]}>
              <Text style={styles.previewText}>{n.title}</Text>
            </View>
          ))}
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: radii.xxl + 2,
    padding: 24,
    marginBottom: 24,
    overflow: 'hidden',
  },
  decorLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 130,
    overflow: 'hidden',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: `${colors.amber}33`,
  },
  dotGrid: {
    position: 'absolute',
    left: -10,
    bottom: -30,
    opacity: 0.3,
  },
  textBlock: {
    marginBottom: 20,
  },
  dateLabel: {
    color: `${colors.cream}b3`,
    fontSize: 12,
    fontFamily: fonts.sansBold,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  greeting: {
    color: colors.white,
    fontFamily: fonts.serifSemiBold,
    fontSize: 24,
  },
  subtitle: {
    color: `${colors.cream}c9`,
    fontSize: 13.5,
    fontFamily: fonts.sansRegular,
    marginTop: 8,
    lineHeight: 20,
    maxWidth: 380,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  pendingCard: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    borderRadius: radii.lg,
    paddingVertical: 12,
    paddingHorizontal: 18,
    minWidth: 140,
  },
  pendingValue: {
    color: colors.amber,
    fontSize: 24,
    fontFamily: fonts.serifSemiBold,
  },
  pendingLabel: {
    color: colors.white,
    opacity: 0.92,
    fontSize: 11.5,
    fontFamily: fonts.sansMedium,
    marginTop: 6,
  },
  ctaCard: {
    backgroundColor: colors.amber,
    borderRadius: radii.lg,
    paddingVertical: 12,
    paddingHorizontal: 20,
    minWidth: 140,
    justifyContent: 'center',
  },
  ctaTitle: {
    color: colors.plumDeep,
    fontSize: 13,
    fontFamily: fonts.sansBold,
  },
  ctaSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  ctaSub: {
    color: colors.plumDeep,
    opacity: 0.8,
    fontSize: 11,
    fontFamily: fonts.sansSemiBold,
  },
  previewPopover: {
    marginTop: 10,
    backgroundColor: colors.white,
    borderRadius: 10,
    overflow: 'hidden',
  },
  previewRow: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  previewRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  previewText: {
    fontSize: 12,
    color: colors.ink,
    fontFamily: fonts.sansRegular,
  },
});
