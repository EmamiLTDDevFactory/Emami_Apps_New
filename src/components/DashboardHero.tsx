import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, Search, Sparkles } from 'lucide-react-native';
import { colors, fonts, radii, gradients } from '../theme/tokens';

interface DashboardHeroProps {
  name: string;
  searchValue: string;
  onSearchChange: (v: string) => void;
}

export default function DashboardHero({ name, searchValue, onSearchChange }: DashboardHeroProps) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <View style={styles.wrap}>
      <Text style={styles.greeting}>{greeting}, {name} 👋</Text>
      <Text style={styles.subtitle}>
        Welcome to Emami Hub — your single place to reach every application you use.
      </Text>

      <View style={styles.askCard}>
        <View style={styles.askLabelRow}>
          <Sparkles size={13} color={colors.rust} />
          <Text style={styles.askLabel}>Find an application</Text>
        </View>
        <View style={styles.askBox}>
          <Search size={16} color={colors.inkSoft} />
          <TextInput
            value={searchValue}
            onChangeText={onSearchChange}
            placeholder="Search by app name, category…"
            placeholderTextColor={colors.inkSoft}
            style={styles.askInput}
          />
          <Pressable style={styles.askBtnShadow} hitSlop={8}>
            <LinearGradient
              colors={gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.askBtn}
            >
              <ArrowRight size={16} color={colors.white} />
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 28,
  },
  greeting: {
    fontFamily: fonts.sansBold,
    fontSize: 22,
    color: colors.ink,
  },
  subtitle: {
    fontFamily: fonts.sansRegular,
    fontSize: 13.5,
    color: colors.inkSoft,
    marginTop: 5,
    marginBottom: 20,
    lineHeight: 20,
  },
  askCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xxl,
    padding: 14,
    shadowColor: colors.plumDeep,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  askLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  askLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 12.5,
    color: colors.ink,
  },
  askBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.cream2,
    borderRadius: radii.pill,
    paddingLeft: 14,
    paddingRight: 6,
    height: 46,
  },
  askInput: {
    flex: 1,
    fontSize: 13.5,
    color: colors.ink,
    fontFamily: fonts.sansRegular,
    height: '100%',
  },
  askBtnShadow: {
    borderRadius: 17,
    shadowColor: colors.rust,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  askBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
