import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Modal, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Bell, Menu, ChevronDown, User, Settings, LogOut, Download } from 'lucide-react-native';
import { colors, fonts, radii, shadows } from '../theme/tokens';
import { NOTIFICATIONS, CURRENT_USER, unreadNotificationsCount } from '../data/mockData';
import { useNotificationsUI } from '../context/NotificationsUIContext';
import { useIsWideScreen } from '../hooks/useIsWideScreen';
import { usePwaInstall } from '../hooks/usePwaInstall';
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
  const [searchFocused, setSearchFocused] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);
  const unread = unreadNotificationsCount;
  const isWideScreen = useIsWideScreen();
  const pwaInstall = usePwaInstall();

  const onPressInstall = async () => {
    if (pwaInstall.canPromptInstall) {
      await pwaInstall.promptInstall();
      return;
    }
    setInstallOpen(true);
  };

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 10 }]}>
      <View style={styles.row}>
        {!isWideScreen && (
          <Pressable
            onPress={onOpenMenu}
            hitSlop={10}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="Open navigation menu"
          >
            <Menu size={22} color={colors.ink} />
          </Pressable>
        )}

        <View style={styles.searchWrap}>
          <View style={[styles.searchBox, searchFocused && styles.searchBoxFocused]}>
            <Search size={15} color={searchFocused ? colors.rust : colors.inkSoft} />
            <TextInput
              value={searchValue}
              onChangeText={onSearchChange}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search anything…"
              placeholderTextColor={colors.inkSoft}
              style={styles.searchInput}
              accessibilityLabel="Search applications"
            />
          </View>
        </View>

        <Pressable
          onPress={openNotifPanel}
          hitSlop={10}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        >
          <View>
            <Bell size={20} color={colors.inkSoft} />
            {unread > 0 && <View style={styles.dot} />}
          </View>
        </Pressable>

        {pwaInstall.isSupported && (
          <Pressable
            onPress={onPressInstall}
            hitSlop={10}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="Install Emami Apps to this device"
          >
            <Download size={20} color={colors.inkSoft} />
          </Pressable>
        )}

        <Pressable
          onPress={() => setProfileOpen(true)}
          hitSlop={8}
          style={styles.profileBtn}
          accessibilityRole="button"
          accessibilityLabel={`Account menu for ${CURRENT_USER.name}`}
        >
          <View style={styles.avatarRing}>
            <Avatar name={CURRENT_USER.name} size={32} />
            <View style={styles.statusDot} />
          </View>
          <View style={styles.profileTextWrap}>
            <Text style={styles.profileBtnName} numberOfLines={1}>{CURRENT_USER.name}</Text>
            <View style={styles.profileBtnSubRow}>
              <Text style={styles.profileBtnSub}>Account</Text>
              <ChevronDown size={12} color={colors.inkSoft} />
            </View>
          </View>
        </Pressable>
      </View>

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
            <Pressable style={styles.menuRow} onPress={() => { setProfileOpen(false); onOpenSettings(); }} accessibilityRole="button" accessibilityLabel="Profile">
              <User size={15} color={colors.inkSoft} />
              <Text style={styles.menuLabel}>Profile</Text>
            </Pressable>
            <Pressable style={styles.menuRow} onPress={() => { setProfileOpen(false); onOpenSettings(); }} accessibilityRole="button" accessibilityLabel="Settings">
              <Settings size={15} color={colors.inkSoft} />
              <Text style={styles.menuLabel}>Settings</Text>
            </Pressable>
            <Pressable style={styles.menuRow} onPress={() => { setProfileOpen(false); onSignOut(); }} accessibilityRole="button" accessibilityLabel="Sign out">
              <LogOut size={15} color={colors.inkSoft} />
              <Text style={styles.menuLabel}>Sign out</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={installOpen} transparent animationType="fade" onRequestClose={() => setInstallOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setInstallOpen(false)}>
          <View style={[styles.dropdown, { top: insets.top + 56, right: 16, width: 260 }]}>
            <Text style={styles.dropdownTitle}>Install Emami Apps</Text>
            <View style={styles.installBody}>
              <Text style={styles.installText}>
                {pwaInstall.isStandalone
                  ? 'Emami Apps is already installed on this device.'
                  : !pwaInstall.isSecureContext
                    ? 'This page was opened over an insecure connection (not HTTPS), so browsers block app installs here. Open the app\'s regular https:// address (or http://localhost during development) and try again.'
                    : pwaInstall.isIos
                      ? 'Tap the Share icon in Safari (the square with an arrow), then choose "Add to Home Screen".'
                      : 'Look for the install icon (⊕ or a monitor with an arrow) at the right of your browser\'s address bar — or open the browser\'s ⋮ menu and choose "Install Emami Apps" / "Add to Home screen".'}
              </Text>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  searchWrap: {
    flex: 1,
    alignItems: 'center',
  },
  searchBox: {
    width: '100%',
    maxWidth: 460,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.appBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    height: 38,
  },
  searchBoxFocused: {
    borderColor: colors.rust,
    backgroundColor: colors.white,
    ...shadows.md,
    shadowColor: colors.rust,
    shadowOffset: { width: 0, height: 0 },
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
    gap: 8,
    padding: 2,
  },
  avatarRing: {
    padding: 2,
    borderRadius: 999,
    backgroundColor: `${colors.rust}1f`,
  },
  statusDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.green,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  profileTextWrap: {
    display: Platform.OS === 'web' ? 'flex' : 'none',
  },
  profileBtnName: {
    fontSize: 12.5,
    fontFamily: fonts.sansSemiBold,
    color: colors.ink,
    maxWidth: 110,
  },
  profileBtnSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 1,
  },
  profileBtnSub: {
    fontSize: 11,
    fontFamily: fonts.sansRegular,
    color: colors.inkSoft,
  },
  backdrop: {
    flex: 1,
  },
  dropdown: {
    position: 'absolute',
    width: 280,
    maxWidth: 320,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.xl,
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
  installBody: {
    padding: 14,
  },
  installText: {
    fontSize: 12.5,
    color: colors.inkSoft,
    fontFamily: fonts.sansRegular,
    lineHeight: 18,
  },
});
