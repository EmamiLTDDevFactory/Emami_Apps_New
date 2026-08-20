import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Mail, Plus, ShieldCheck, Trash2, Info, Check } from 'lucide-react-native';
import ScreenScaffold from '../components/ScreenScaffold';
import { APPS, AUTHORIZED_USERS, type UserAccessEntry } from '../data/mockData';
import { colors, fonts, radii, appColor } from '../theme/tokens';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function UserAccessScreen() {
  const [query, setQuery] = useState('');
  const navigation = useNavigation();

  const [users, setUsers] = useState<UserAccessEntry[]>(AUTHORIZED_USERS);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const addUser = () => {
    const value = input.trim().toLowerCase();
    if (!value) return;
    if (!EMAIL_RE.test(value)) {
      setError('Enter a valid email address.');
      return;
    }
    if (users.some((u) => u.email === value)) {
      setError('This email already has access.');
      return;
    }
    // New users start with no modules granted — admin picks exactly which
    // apps this person should see, rather than defaulting to full access.
    setUsers((prev) => [...prev, { email: value, appIds: [] }]);
    setInput('');
    setError('');
  };

  const removeUser = (email: string) => {
    setUsers((prev) => prev.filter((u) => u.email !== email));
  };

  const toggleApp = (email: string, appId: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.email === email
          ? {
              ...u,
              appIds: u.appIds.includes(appId)
                ? u.appIds.filter((id) => id !== appId)
                : [...u.appIds, appId],
            }
          : u
      )
    );
  };

  return (
    <ScreenScaffold searchValue={query} onSearchChange={setQuery}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Pressable style={styles.backBtn} onPress={() => navigation.navigate('Home' as never)}>
            <ArrowLeft size={13} color={colors.ink} />
            <Text style={styles.backText}>Back to Hub</Text>
          </Pressable>
          <Text style={styles.pageTitle}>Manage Access</Text>
        </View>

        <View style={styles.noticeCard}>
          <Info size={15} color={colors.rust} />
          <Text style={styles.noticeText}>
            This is an early preview. Per-app access set here isn't enforced by any backend
            yet — full role-based permissions, invite emails and SSO sync are being designed next.
          </Text>
        </View>

        <View style={[styles.baseCard, styles.card]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardIconBox}>
              <ShieldCheck size={15} color={colors.rust} />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.cardTitle}>Authorized Users</Text>
              <Text style={styles.cardSubtitle}>Grant each person access to specific apps</Text>
            </View>
          </View>

          <View style={styles.addRow}>
            <View style={styles.inputWrap}>
              <Mail size={14} color={colors.inkSoft} />
              <TextInput
                value={input}
                onChangeText={(v) => { setInput(v); if (error) setError(''); }}
                onSubmitEditing={addUser}
                placeholder="name@emamigroup.com"
                placeholderTextColor={colors.inkSoft}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
                accessibilityLabel="Email address to grant access"
              />
            </View>
            <Pressable style={styles.addBtn} onPress={addUser} accessibilityRole="button" accessibilityLabel="Add user">
              <Plus size={14} color={colors.white} />
              <Text style={styles.addBtnText}>Add</Text>
            </Pressable>
          </View>
          {!!error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.list}>
            {users.map((user, i) => (
              <View key={user.email} style={[styles.userRow, i < users.length - 1 && styles.userRowBorder]}>
                <View style={styles.userHeaderRow}>
                  <Text style={styles.userEmail}>{user.email}</Text>
                  <View style={styles.userHeaderRight}>
                    <Text style={styles.userCount}>{user.appIds.length}/{APPS.length} apps</Text>
                    <Pressable
                      onPress={() => removeUser(user.email)}
                      hitSlop={8}
                      style={styles.removeBtn}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${user.email}`}
                    >
                      <Trash2 size={14} color={colors.rust} />
                    </Pressable>
                  </View>
                </View>

                <View style={styles.appChipsRow}>
                  {APPS.map((app) => {
                    const granted = user.appIds.includes(app.id);
                    const accent = appColor(app.id);
                    const Icon = app.icon;
                    return (
                      <Pressable
                        key={app.id}
                        onPress={() => toggleApp(user.email, app.id)}
                        style={[
                          styles.appChip,
                          { borderColor: granted ? accent : colors.border },
                          granted && { backgroundColor: `${accent}14` },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`${granted ? 'Revoke' : 'Grant'} ${app.name} access for ${user.email}`}
                        accessibilityState={{ selected: granted }}
                      >
                        <Icon size={12.5} color={granted ? accent : colors.inkSoft} />
                        <Text style={[styles.appChipText, { color: granted ? accent : colors.inkSoft }]}>
                          {app.name}
                        </Text>
                        {granted && <Check size={12} color={accent} />}
                      </Pressable>
                    );
                  })}
                </View>
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
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderColor: `${colors.rust}33`,
    backgroundColor: `${colors.rust}0d`,
    borderRadius: radii.lg,
    padding: 14,
    marginBottom: 16,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    fontFamily: fonts.sansRegular,
    color: colors.ink,
    lineHeight: 17,
  },
  baseCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    backgroundColor: colors.white,
  },
  card: {
    padding: 20,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },
  cardIconBox: {
    width: 30,
    height: 30,
    borderRadius: radii.md,
    backgroundColor: `${colors.rust}14`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14.5,
    fontFamily: fonts.sansBold,
    color: colors.ink,
  },
  cardSubtitle: {
    fontSize: 12,
    fontFamily: fonts.sansRegular,
    color: colors.inkSoft,
    marginTop: 1,
  },
  addRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingHorizontal: 12,
    height: 40,
    backgroundColor: colors.appBg,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: colors.ink,
    fontFamily: fonts.sansRegular,
    padding: 0,
    height: '100%',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radii.lg,
    paddingHorizontal: 16,
    height: 40,
    backgroundColor: colors.rust,
  },
  addBtnText: {
    fontSize: 13,
    fontFamily: fonts.sansSemiBold,
    color: colors.white,
  },
  errorText: {
    fontSize: 11.5,
    fontFamily: fonts.sansMedium,
    color: '#C0392B',
    marginTop: 8,
  },
  list: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  userRow: {
    padding: 14,
  },
  userRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  userHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  userHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userEmail: {
    fontSize: 13,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  userCount: {
    fontSize: 11,
    fontFamily: fonts.sansMedium,
    color: colors.inkSoft,
  },
  removeBtn: {
    padding: 4,
  },
  appChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  appChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.appBg,
  },
  appChipText: {
    fontSize: 11.5,
    fontFamily: fonts.sansMedium,
  },
});
