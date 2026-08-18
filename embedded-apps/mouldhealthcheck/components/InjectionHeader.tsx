import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";

import { api } from "@/lib/config";
import { colors, font, radius, gradients, shadow } from "@/constants/theme";
import EmptyState from "@/components/ui/EmptyState";
import GlassChip from "@/components/ui/GlassChip";

type Module = { id: string; title: string; route: string };

export default function InjectionHeader() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<Module[]>([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/ZMM_MOULD_CARE_SRV/ZMouldHeaderSet", { params: { ZmouldCatId: "IM", ZmouldHeadId: "H" } });
      const arr = data?.dropdowns || [];
      setModules(arr.map((it: any, i: number) => ({ id: String(i + 1), title: it.Zmouldfield, route: it.Zroute || "" })));
    } catch {
      setModules([]);
    } finally {
      setLoading(false);
    }
  };

  const open = (m: Module) => {
    Haptics.selectionAsync();
    if (m.route) router.push(m.route as any);
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <GlassChip size={52} tint="dark" style={styles.headerIcon}>
            <Icons.ClipboardText size={26} color="#fff" weight="fill" />
          </GlassChip>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Inspection modules</Text>
            <Text style={styles.subtitle}>{modules.length} checklists · tap to begin</Text>
          </View>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.8}>
            <GlassChip size={40} tint="dark" style={styles.closeBtn}>
              <Icons.X size={20} color="#fff" weight="bold" />
            </GlassChip>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <Animated.ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 110 }}>
        {modules.length === 0 ? (
          <EmptyState title="No modules available" message="Pull to refresh once modules are configured." />
        ) : (
          modules.map((m, i) => (
            <Animated.View key={m.id} entering={FadeInDown.delay(i * 60).duration(450)}>
              <TouchableOpacity activeOpacity={0.9} onPress={() => open(m)} style={[styles.card, shadow.soft]}>
                <View style={styles.cardIcon}>
                  <Icons.CheckCircle size={22} color={colors.brand} weight="duotone" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle} numberOfLines={2}>{m.title}</Text>
                  <Text style={styles.cardSub}>Tap to open module</Text>
                </View>
                <Icons.CaretRight size={20} color={colors.textFaint} weight="bold" />
              </TouchableOpacity>
            </Animated.View>
          ))
        )}
      </Animated.ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity style={styles.draftBtn} activeOpacity={0.85} onPress={() => Alert.alert("Draft saved", "Your draft has been saved.")}>
          <Icons.NotePencil size={19} color={colors.textBody} weight="duotone" />
          <Text style={styles.draftText}>Draft</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.9} onPress={() => Alert.alert("Saved", "Your data has been saved successfully.")}>
          <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveBtn}>
            <Icons.FloppyDisk size={19} color="#fff" weight="fill" />
            <Text style={styles.saveText}>Save</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  loader: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  header: { paddingHorizontal: 16, paddingBottom: 20, borderBottomLeftRadius: 26, borderBottomRightRadius: 26 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIcon: { width: 52, height: 52, borderRadius: 16 },
  closeBtn: { width: 40, height: 40, borderRadius: 13 },
  title: { color: "#fff", fontSize: font.h3, fontWeight: font.black },
  subtitle: { color: "rgba(255,255,255,0.88)", fontSize: font.sub, fontWeight: font.medium, marginTop: 2 },

  card: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: colors.surface, borderRadius: radius._20, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 12 },
  cardIcon: { width: 48, height: 48, borderRadius: 15, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: font.body, fontWeight: font.bold, color: colors.ink, lineHeight: 20 },
  cardSub: { fontSize: font.caption, color: colors.textMuted, marginTop: 2 },

  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", gap: 12, paddingHorizontal: 16, paddingTop: 14, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  draftBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 18, height: 52, borderRadius: radius._17, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surfaceAlt },
  draftText: { color: colors.textBody, fontWeight: font.bold, fontSize: font.body },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 52, borderRadius: radius._17 },
  saveText: { color: "#fff", fontWeight: font.bold, fontSize: font.body },
});
