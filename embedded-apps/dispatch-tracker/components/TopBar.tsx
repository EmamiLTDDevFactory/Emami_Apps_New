import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Ported from top_bar() in main_panel.py. Date/time/email are dropped on
 * phone width the same way the original CSS already hides
 * .topbar-dt/.topbar-sep/.topbar-email below 900px — a phone is just
 * always inside that same collapse range.
 */
export function TopBar() {
  const { session, readOnly, signOut } = useAuth();
  const isHq = readOnly;
  const initials = isHq ? 'HQ' : (session?.depot_number ?? 'D').slice(0, 2).toUpperCase();
  const avatarGradientStart = isHq ? colors.purple : colors.navy;

  return (
    <View style={styles.bar}>
      <View style={styles.leftCluster}>
        <View style={styles.logoBlock}>
          <Image source={require('@/assets/images/emami-logo.png')} style={styles.logo} resizeMode="contain" />
        </View>
        <View style={styles.wordmarkBlock}>
          <Text style={styles.wordmark}>
            emami <Text style={styles.wordmarkSub}>LIMITED</Text>
          </Text>
          <Text style={styles.system}>Dispatch Intelligence System</Text>
        </View>
        <View style={styles.panelChip}>
          <Text style={styles.panelChipText}>{isHq ? 'HQ VIEW' : 'DEPOT PANEL'}</Text>
        </View>
      </View>

      <View style={styles.rightCluster}>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
        <View style={[styles.avatar, { backgroundColor: avatarGradientStart }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Pressable style={styles.signOutBtn} onPress={signOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 52,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderBottomWidth: 2,
    borderBottomColor: colors.green,
  },
  leftCluster: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  logoBlock: { paddingRight: 10, borderRightWidth: 1, borderRightColor: colors.g200, height: 32, justifyContent: 'center' },
  logo: { height: 26, width: 60 },
  wordmarkBlock: { paddingHorizontal: 10, borderRightWidth: 1, borderRightColor: colors.g200, display: 'none' },
  wordmark: { fontSize: 13, fontWeight: '900', color: colors.navy, fontStyle: 'italic' },
  wordmarkSub: { fontSize: 8, fontWeight: '800', color: colors.teal, letterSpacing: 1 },
  system: { fontSize: 7, fontWeight: '600', color: colors.g400, letterSpacing: 0.5, textTransform: 'uppercase' },
  panelChip: { marginLeft: 10, backgroundColor: colors.navyLt, borderWidth: 1, borderColor: colors.navyBd, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  panelChipText: { fontSize: 9, fontWeight: '700', color: colors.navy, letterSpacing: 0.5, textTransform: 'uppercase' },
  rightCluster: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.greenLt, borderWidth: 1, borderColor: colors.greenBd, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green },
  liveText: { fontSize: 9, fontWeight: '700', color: colors.greenDk, letterSpacing: 0.5 },
  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  signOutBtn: { backgroundColor: colors.green, borderRadius: 6, height: 26, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  signOutText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
