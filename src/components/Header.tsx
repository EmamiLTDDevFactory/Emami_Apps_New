import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Modal, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Bell, Menu, ChevronDown, User, Settings, LogOut } from 'lucide-react-native';
import { colors, fonts, radii } from '../theme/tokens';
import { NOTIFICATIONS, CURRENT_USER, unreadNotificationsCount } from '../data/mockData';
import { useNotificationsUI } from '../context/NotificationsUIContext';
import Avatar from './Avatar';

interface HeaderProps {
  searchValue: string;
  onSearchChange: (v: string) => void;
  onOpenMenu: () => void;
  onSignOut: () => void;
  onOpenSettings: () => void;
}

export default function Header({ searchValue, onSearchChange, onOpenMenu, onSignOut, onOpenSettings }: HeaderProps) {
  const insets = useSafeAreaInsets();
  const { isOpen: notifOpen, openPanel: openNotifPanel, closePanel: closeNotifPanel } = useNotificationsUI();
  const [profileOpen, setProfileOpen] = useState(false);
  const unread = unreadNotificationsCount;

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 10 }]}>
      <View style={styles.row}>
        <Pressable onPress={onOpenMenu} hitSlop={10} style={styles.iconBtn}>
          <Menu size={22} color={colors.ink} />
        </Pressable>

        <View style={styles.searchBox}>
          <Search size={15} color={colors.inkSoft} />
          <TextInput
            value={searchValue}
            onChangeText={onSearchChange}
            placeholder="Search applications…"
            placeholderTextColor={colors.inkSoft}
            style={styles.searchInput}
          />
        </View>

        <Pressable onPress={openNotifPanel} hitSlop={10} style={styles.iconBtn}>
          <View>
            <Bell size={20} color={colors.inkSoft} />
            {unread > 0 && <View style={styles.dot} />}
          </View>
        </Pressable>

        <Pressable onPress={() => setProfileOpen(true)} hitSlop={8} style={styles.profileBtn}>
          <Avatar name={CURRENT_USER.name} size={30} />
          <ChevronDown size={14} color={colors.inkSoft} />
        </Pressable>
      </View>

      <View style={[styles.accentBar]} />

      <Modal visible={notifOpen} transparent animationType="fade" onRequestClose={closeNotifPanel}>
        <Pressable style={styles.backdrop} onPress={closeNotifPanel}>
          <View style={[styles.dropdown, { top: insets.top + 56, right: 60 }]}>
            <Text style={styles.dropdownTitle}>Notifications</Text>
            {NOTIFICATIONS.map((n, i) => (
              <View key={n.id} style={[styles.notifRow, i < NOTIFICATIONS.length - 1 && styles.rowBorder]}>
                <View style={[styles.notifDot, { backgroundColor: n.unread ? colors.rust : 'transparent' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.notifTitle, { fontFamily: n.unread ? fonts.sansSemiBold : fonts.sansMedium }]}>{n.title}</Text>
                  <Text style={styles.notifWhen}>{n.when}</Text>
                </View>
              </View>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal visible={profileOpen} transparent animationType="fade" onRequestClose={() => setProfileOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setProfileOpen(false)}>
          <View style={[styles.dropdown, { top: insets.top + 56, right: 16, width: 220 }]}>
            <View style={styles.profileHeader}>
              <Text style={styles.profileName}>{CURRENT_USER.name}</Text>
              <Text style={styles.profileEmail}>{CURRENT_USER.email}</Text>
            </View>
            <Pressable style={styles.menuRow} onPress={() => { setProfileOpen(false); onOpenSettings(); }}>
              <User size={15} color={colors.inkSoft} />
              <Text style={styles.menuLabel}>Profile</Text>
            </Pressable>
            <Pressable style={styles.menuRow} onPress={() => { setProfileOpen(false); onOpenSettings(); }}>
              <Settings size={15} color={colors.inkSoft} />
              <Text style={styles.menuLabel}>Settings</Text>
            </Pressable>
            <Pressable style={styles.menuRow} onPress={() => { setProfileOpen(false); onSignOut(); }}>
              <LogOut size={15} color={colors.inkSoft} />
              <Text style={styles.menuLabel}>Sign out</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.white,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 10,
  },
  iconBtn: {
    padding: 6,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.cream2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    height: 38,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: colors.ink,
    fontFamily: fonts.sansRegular,
    padding: 0,
    height: '100%',
  },
  dot: {
    position: 'absolute',
    top: -1,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.rust,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  profileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 2,
  },
  accentBar: {
    height: 3,
    backgroundColor: colors.rust,
  },
  backdrop: {
    flex: 1,
  },
  dropdown: {
    position: 'absolute',
    width: 280,
    maxWidth: 320,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
      android: { elevation: 10 },
    }),
  },
  dropdownTitle: {
    fontSize: 13.5,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  notifRow: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  notifDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  notifTitle: {
    fontSize: 13,
    color: colors.ink,
  },
  notifWhen: {
    fontSize: 11.5,
    color: colors.inkSoft,
    fontFamily: fonts.sansRegular,
    marginTop: 2,
  },
  profileHeader: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  profileName: {
    fontSize: 13.5,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
  },
  profileEmail: {
    fontSize: 11.5,
    color: colors.inkSoft,
    fontFamily: fonts.sansRegular,
    marginTop: 2,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  menuLabel: {
    fontSize: 13,
    color: colors.ink,
    fontFamily: fonts.sansMedium,
  },
});
