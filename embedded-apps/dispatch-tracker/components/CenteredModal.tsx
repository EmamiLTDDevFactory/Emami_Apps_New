import { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadow } from '@/constants/theme';

/** Ported from _modal_css() — centered card over a dimmed backdrop, used by every dialog. */
export function CenteredModal({
  visible,
  onClose,
  children,
  maxWidth = 540,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: number;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.centerWrap} pointerEvents="box-none">
          <Pressable onPress={(e) => e.stopPropagation()} style={[styles.card, shadow.lg, { maxWidth }]}>
            <ScrollView keyboardShouldPersistTaps="handled">{children}</ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

export function ModalHeader({
  iconBg,
  icon,
  title,
  titleColor,
  subtitle,
}: {
  iconBg: string;
  icon: string;
  title: string;
  titleColor: string;
  subtitle: string;
}) {
  return (
    <View style={styles.header}>
      <View style={[styles.iconChip, { backgroundColor: iconBg }]}>
        <Text style={{ fontSize: 18 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  centerWrap: { width: '100%', alignItems: 'center' },
  card: { width: '100%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: 20, maxHeight: '85%' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  iconChip: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '800' },
  subtitle: { fontSize: 11, color: colors.g400, marginTop: 2 },
});
