import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LogOut } from 'lucide-react-native';
import ScreenScaffold from '../components/ScreenScaffold';
import Avatar from '../components/Avatar';
import { useAuth } from '../context/AuthContext';
import { CURRENT_USER } from '../data/mockData';
import { colors, fonts, radii } from '../theme/tokens';

export default function SettingsScreen() {
  const [query, setQuery] = useState('');
  const { logout } = useAuth();

  return (
    <ScreenScaffold searchValue={query} onSearchChange={setQuery}>
      <View style={styles.wrap}>
        <Text style={styles.title}>Settings</Text>

        <View style={styles.profileCard}>
          <Avatar name={CURRENT_USER.name} size={48} />
          <View style={styles.flex1}>
            <Text style={styles.name}>{CURRENT_USER.name}</Text>
            <Text style={styles.email}>{CURRENT_USER.email}</Text>
          </View>
        </View>

        <Pressable style={styles.signOutBtn} onPress={logout}>
          <LogOut size={16} color={colors.rust} />
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </View>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 16 },
  title: {
    fontFamily: fonts.serifSemiBold,
    fontSize: 22,
    color: colors.ink,
    marginBottom: 20,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    padding: 16,
    marginBottom: 16,
  },
  flex1: { flex: 1 },
  name: {
    fontSize: 15,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  email: {
    fontSize: 12.5,
    color: colors.inkSoft,
    fontFamily: fonts.sansRegular,
    marginTop: 2,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: `${colors.rust}55`,
    borderRadius: radii.md,
    paddingVertical: 13,
    backgroundColor: `${colors.rust}10`,
  },
  signOutText: {
    fontSize: 14,
    fontFamily: fonts.sansSemiBold,
    color: colors.rust,
  },
});
