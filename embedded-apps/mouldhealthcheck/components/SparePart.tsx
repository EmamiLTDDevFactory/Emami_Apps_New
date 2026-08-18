import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, Layout } from "react-native-reanimated";

import SidePane from "./SidePane";
import { colors, font, radius, gradients, shadow } from "@/constants/theme";
import GlassChip from "@/components/ui/GlassChip";

type RowType = { id: string; col1: string; col2: string; col3: string };

const FIELDS: { key: "col1" | "col2" | "col3"; label: string; placeholder: string }[] = [
  { key: "col1", label: "Spare part", placeholder: "Part name / description" },
  { key: "col2", label: "Qty / Spec", placeholder: "Quantity or specification" },
  { key: "col3", label: "Estimated cost", placeholder: "Estimated cost / vendor" },
];

export default function SparePart() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [rows, setRows] = useState<RowType[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [form, setForm] = useState({ col1: "", col2: "", col3: "" });

  const addOrUpdate = () => {
    if (!form.col1 || !form.col2 || !form.col3) {
      Alert.alert("Missing details", "Please fill all fields.");
      return;
    }
    Haptics.selectionAsync();
    if (editingId) {
      setRows((r) => r.map((it) => (it.id === editingId ? { ...it, ...form } : it)));
      setEditingId(null);
    } else {
      setRows((r) => [...r, { id: Date.now().toString(), ...form }]);
    }
    setForm({ col1: "", col2: "", col3: "" });
  };
  const edit = (item: RowType) => {
    setForm({ col1: item.col1, col2: item.col2, col3: item.col3 });
    setEditingId(item.id);
  };
  const remove = (id: string) => setRows((r) => r.filter((it) => it.id !== id));

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => setMenuOpen(true)} activeOpacity={0.8}>
            <GlassChip size={40} tint="dark" style={styles.headerBtn}>
              <Icons.List size={22} color="#fff" weight="bold" />
            </GlassChip>
          </TouchableOpacity>
          <GlassChip size={44} tint="dark" style={styles.headerIcon}>
            <Icons.Toolbox size={22} color="#fff" weight="fill" />
          </GlassChip>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.8}>
            <GlassChip size={40} tint="dark" style={styles.headerBtn}>
              <Icons.X size={20} color="#fff" weight="bold" />
            </GlassChip>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>Spare Parts</Text>
        <Text style={styles.subtitle}>Required parts with estimations</Text>
      </LinearGradient>

      <Animated.ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 110 }}>
        {/* ENTRY FORM */}
        <View style={[styles.form, shadow.card]}>
          <Text style={styles.formTitle}>{editingId ? "Edit spare part" : "Add spare part"}</Text>
          {FIELDS.map((f) => (
            <View key={f.key} style={{ marginBottom: 12 }}>
              <Text style={styles.fieldLabel}>{f.label}</Text>
              <TextInput
                placeholder={f.placeholder}
                placeholderTextColor={colors.textFaint}
                style={styles.input}
                value={form[f.key]}
                onChangeText={(t) => setForm((s) => ({ ...s, [f.key]: t }))}
              />
            </View>
          ))}
          <TouchableOpacity activeOpacity={0.9} onPress={addOrUpdate}>
            <LinearGradient colors={editingId ? gradients.sunset : gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.addBtn}>
              <Icons.PlusCircle size={20} color="#fff" weight="fill" />
              <Text style={styles.addBtnText}>{editingId ? "Update part" : "Add part"}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* LIST */}
        <Text style={styles.listHeader}>{rows.length} part{rows.length === 1 ? "" : "s"} added</Text>
        {rows.length === 0 ? (
          <View style={styles.empty}>
            <Icons.Toolbox size={48} color={colors.textFaint} weight="duotone" />
            <Text style={styles.emptyText}>No spare parts added yet.</Text>
          </View>
        ) : (
          rows.map((item, index) => (
            <Animated.View key={item.id} entering={FadeInDown.delay(index * 50)} layout={Layout.springify()} style={[styles.rowCard, shadow.soft]}>
              <View style={styles.serial}>
                <Text style={styles.serialText}>{index + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.partName}>{item.col1}</Text>
                <View style={styles.metaRow}>
                  <View style={styles.metaChip}>
                    <Icons.Stack size={12} color={colors.textMuted} weight="bold" />
                    <Text style={styles.metaText}>{item.col2}</Text>
                  </View>
                  <View style={styles.metaChip}>
                    <Icons.CurrencyInr size={12} color={colors.textMuted} weight="bold" />
                    <Text style={styles.metaText}>{item.col3}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.rowActions}>
                <TouchableOpacity onPress={() => edit(item)} style={[styles.rowBtn, { backgroundColor: colors.infoSoft }]}>
                  <Icons.PencilSimple size={17} color={colors.info} weight="bold" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => remove(item.id)} style={[styles.rowBtn, { backgroundColor: colors.dangerSoft }]}>
                  <Icons.Trash size={17} color={colors.danger} weight="bold" />
                </TouchableOpacity>
              </View>
            </Animated.View>
          ))
        )}
      </Animated.ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity style={styles.draftBtn} activeOpacity={0.85} onPress={() => Alert.alert("Draft saved", `Saved ${rows.length} part(s) to drafts.`)}>
          <Icons.FloppyDisk size={19} color={colors.textBody} weight="duotone" />
          <Text style={styles.draftText}>Draft</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.9} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); Alert.alert("Saved", `Final save applied. Total parts: ${rows.length}`); }}>
          <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveBtn}>
            <Icons.PaperPlaneTilt size={19} color="#fff" weight="fill" />
            <Text style={styles.saveText}>Final Save</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <SidePane isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 16, paddingBottom: 18, borderBottomLeftRadius: 26, borderBottomRightRadius: 26 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerBtn: { width: 40, height: 40, borderRadius: 13 },
  headerIcon: { width: 44, height: 44, borderRadius: 14 },
  title: { color: "#fff", fontSize: font.h3, fontWeight: font.black, marginTop: 14 },
  subtitle: { color: "rgba(255,255,255,0.88)", fontSize: font.sub, fontWeight: font.medium, marginTop: 4 },

  form: { backgroundColor: colors.surface, borderRadius: radius._24, borderWidth: 1, borderColor: colors.border, padding: 18, marginTop: 16 },
  formTitle: { fontSize: font.title, fontWeight: font.black, color: colors.ink, marginBottom: 14 },
  fieldLabel: { fontSize: font.caption, fontWeight: font.bold, color: colors.textMuted, marginBottom: 6 },
  input: { height: 50, borderRadius: radius._15, paddingHorizontal: 14, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surfaceAlt, fontSize: font.body, fontWeight: font.medium, color: colors.ink },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 52, borderRadius: radius._17, marginTop: 6 },
  addBtnText: { color: "#fff", fontWeight: font.bold, fontSize: font.body },

  listHeader: { fontSize: font.body, fontWeight: font.bold, color: colors.textMuted, marginTop: 24, marginBottom: 12 },
  empty: { alignItems: "center", padding: 40, borderRadius: radius._20, borderWidth: 2, borderStyle: "dashed", borderColor: colors.border, gap: 12 },
  emptyText: { color: colors.textMuted, fontSize: font.body, fontWeight: font.medium },

  rowCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surface, borderRadius: radius._20, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 12 },
  serial: { width: 36, height: 36, borderRadius: 11, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" },
  serialText: { color: colors.brand, fontWeight: font.black, fontSize: font.body },
  partName: { fontSize: font.body, fontWeight: font.bold, color: colors.ink },
  metaRow: { flexDirection: "row", gap: 8, marginTop: 6, flexWrap: "wrap" },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 8, height: 24, borderRadius: radius.pill },
  metaText: { fontSize: font.micro, color: colors.textBody, fontWeight: font.semibold },
  rowActions: { flexDirection: "row", gap: 8 },
  rowBtn: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },

  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", gap: 12, paddingHorizontal: 16, paddingTop: 14, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  draftBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 18, height: 52, borderRadius: radius._17, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surfaceAlt },
  draftText: { color: colors.textBody, fontWeight: font.bold, fontSize: font.body },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 52, borderRadius: radius._17 },
  saveText: { color: "#fff", fontWeight: font.bold, fontSize: font.body },
});
