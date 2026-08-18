import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Camera, Clock3, LogOut } from 'lucide-react-native';
import ScreenScaffold from '../components/ScreenScaffold';
import Avatar from '../components/Avatar';
import { useAuth } from '../context/AuthContext';
import { CURRENT_USER, ACTIVITY_STATS } from '../data/mockData';
import { colors, fonts, radii } from '../theme/tokens';

const STATS = [
  { label: 'Logins', value: ACTIVITY_STATS.logins },
  { label: 'Time Spent', value: ACTIVITY_STATS.timeSpent },
  { label: 'Apps Opened', value: ACTIVITY_STATS.appsOpened },
  { label: 'Downloads', value: ACTIVITY_STATS.downloads },
  { label: 'Favorites Added', value: ACTIVITY_STATS.favoritesAdded },
  { label: 'Notifications Read', value: ACTIVITY_STATS.notificationsRead },
  { label: 'Most Used App', value: ACTIVITY_STATS.mostUsedApp },
];

export default function SettingsScreen() {
  const [query, setQuery] = useState('');
  const { logout } = useAuth();
  const navigation = useNavigation();

  return (
    <ScreenScaffold searchValue={query} onSearchChange={setQuery}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Pressable style={styles.backBtn} onPress={() => navigation.navigate('Home' as never)}>
            <ArrowLeft size={13} color={colors.ink} />
            <Text style={styles.backText}>Back to Hub</Text>
          </Pressable>
          <Text style={styles.pageTitle}>My Profile</Text>
          <View style={styles.flex1} />
          <Pressable style={styles.signOutBtn} onPress={logout}>
            <LogOut size={13} color={colors.rust} />
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <View style={styles.identityRow}>
            <View style={styles.avatarCol}>
              <View style={styles.avatarRow}>
                <Avatar name={CURRENT_USER.name} size={56} />
                <Pressable style={styles.uploadBtn}>
                  <Camera size={12} color={colors.ink} />
                  <Text style={styles.uploadText}>Upload Photo</Text>
                </Pressable>
              </View>
              <Text style={styles.uploadHelper}>JPG, PNG or WebP · max 4MB · resized to 512×512</Text>
            </View>

            <View style={styles.infoCol}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{CURRENT_USER.name}</Text>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>{CURRENT_USER.role}</Text>
                </View>
              </View>
              <Text style={styles.meta}>{CURRENT_USER.mobile}</Text>
              <Text style={styles.meta}>{CURRENT_USER.email}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.metaGrid}>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Mobile</Text>
              <Text style={styles.metaValue}>{CURRENT_USER.mobile}</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Role</Text>
              <Text style={styles.metaValue}>{CURRENT_USER.role}</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Status</Text>
              <Text style={[styles.metaValue, { color: colors.green }]}>{CURRENT_USER.status}</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Last Login</Text>
              <Text style={styles.metaValue}>{CURRENT_USER.lastLogin}</Text>
            </View>
          </View>
        </View>

        <View style={styles.timeCard}>
          <View style={styles.timeIconBox}>
            <Clock3 size={15} color={colors.white} />
          </View>
          <View style={styles.flex1}>
            <Text style={styles.timeTitle}>YOUR TIME ON APP</Text>
            <Text style={styles.timeSubtitle}>
              This is your first session — keep going, your time will land here next visit.
            </Text>
          </View>
          <View style={styles.sessionPill}>
            <Text style={styles.sessionPillText}>{ACTIVITY_STATS.sessionsTotal} session total</Text>
          </View>
        </View>

        <View style={styles.activityCard}>
          <Text style={styles.activityTitle}>ACTIVITY</Text>
          <View style={styles.statsGrid}>
            {STATS.map((s) => (
              <View key={s.label} style={styles.statBox}>
                <Text style={styles.statLabel}>{s.label}</Text>
                <Text style={styles.statValue}>{s.value}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 40 },
  flex1: { flex: 1 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: colors.white,
  },
  backText: {
    fontSize: 12,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  pageTitle: {
    fontSize: 18,
    fontFamily: fonts.sansBold,
    color: colors.ink,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: `${colors.rust}40`,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: `${colors.rust}0d`,
  },
  signOutText: {
    fontSize: 12,
    fontFamily: fonts.sansSemiBold,
    color: colors.rust,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    backgroundColor: colors.white,
    padding: 20,
    marginBottom: 16,
  },
  identityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
  },
  avatarCol: {
    minWidth: 160,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.cream2,
  },
  uploadText: {
    fontSize: 11,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  uploadHelper: {
    fontSize: 10.5,
    fontFamily: fonts.sansRegular,
    color: colors.inkSoft,
    marginTop: 8,
  },
  infoCol: {
    flex: 1,
    minWidth: 200,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  name: {
    fontSize: 17,
    fontFamily: fonts.sansBold,
    color: colors.ink,
  },
  roleBadge: {
    backgroundColor: `${colors.amber}22`,
    borderRadius: radii.pill,
    paddingHorizontal: 9,
    paddingVertical: 2,
  },
  roleBadgeText: {
    fontSize: 10,
    fontFamily: fonts.sansBold,
    color: '#B45309',
  },
  meta: {
    fontSize: 12.5,
    fontFamily: fonts.sansRegular,
    color: colors.inkSoft,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 18,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  metaCell: {
    minWidth: 110,
  },
  metaLabel: {
    fontSize: 10,
    fontFamily: fonts.sansBold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.inkSoft,
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 13.5,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  timeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: '#0D9488',
    borderRadius: radii.xl,
    padding: 16,
    marginBottom: 16,
  },
  timeIconBox: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeTitle: {
    fontSize: 11.5,
    fontFamily: fonts.sansBold,
    letterSpacing: 0.5,
    color: colors.ink,
  },
  timeSubtitle: {
    fontSize: 12,
    fontFamily: fonts.sansRegular,
    color: colors.inkSoft,
    marginTop: 3,
  },
  sessionPill: {
    backgroundColor: colors.cream2,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  sessionPillText: {
    fontSize: 10.5,
    fontFamily: fonts.sansSemiBold,
    color: colors.inkSoft,
  },
  activityCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    backgroundColor: colors.white,
    padding: 20,
  },
  activityTitle: {
    fontSize: 12,
    fontFamily: fonts.sansBold,
    letterSpacing: 0.6,
    color: colors.ink,
    marginBottom: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statBox: {
    minWidth: 140,
    flexGrow: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.cream2,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: fonts.sansBold,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.inkSoft,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 16,
    fontFamily: fonts.sansBold,
    color: colors.ink,
  },
});
