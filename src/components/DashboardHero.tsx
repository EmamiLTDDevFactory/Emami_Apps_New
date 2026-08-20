import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '../theme/tokens';

interface DashboardHeroProps {
  name: string;
  lastLogin?: string;
}

// A flat utility page header, not a marketing hero — no gradient band, no
// second search box (Header already has the one working search input).
export default function DashboardHero({ name, lastLogin }: DashboardHeroProps) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <View style={styles.wrap}>
      <View style={styles.flex1}>
        <Text style={styles.greeting}>{greeting}, {name}</Text>
        <Text style={styles.subtitle}>Your single place to reach every application you use.</Text>
      </View>
      {lastLogin && <Text style={styles.lastLogin}>Last login: {lastLogin}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingBottom: 18,
    marginBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  flex1: {
    flex: 1,
  },
  greeting: {
    fontFamily: fonts.sansBold,
    fontSize: 19,
    color: colors.ink,
  },
  subtitle: {
    fontFamily: fonts.sansRegular,
    fontSize: 12.5,
    color: colors.inkSoft,
    marginTop: 3,
  },
  lastLogin: {
    fontFamily: fonts.sansRegular,
    fontSize: 11.5,
    color: colors.inkSoft,
    marginTop: 2,
  },
});
