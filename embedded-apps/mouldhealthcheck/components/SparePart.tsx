import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, Layout } from "react-native-reanimated";
import { useGlobalSearchParams } from "expo-router";

import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/config";
import { useInspection } from "@/lib/inspectionStore";

import SidePane from "./SidePane";
import { colors, font, radius, gradients, shadow } from "@/constants/theme";

type RowType = { id: string; col1: string; col2: string; col3: string };

const FIELDS: { key: "col1" | "col2" | "col3"; label: string; placeholder: string }[] = [
  { key: "col1", label: "Spare part", placeholder: "Part name / description" },
  { key: "col2", label: "Qty / Spec", placeholder: "Quantity or specification" },
  { key: "col3", label: "Estimated cost", placeholder: "Estimated cost / vendor" },
];

export default function SparePart() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const searchParams = useGlobalSearchParams();
  const { user } = useAuth();
  const { activeCode } = useInspection();

  const materialCode = (searchParams.materialCode || searchParams.Matnr || searchParams.matnr) as string;
  const vendorCode = (searchParams.vendorCode || searchParams.Lifnr || searchParams.lifnr) as string;

  const activeMaterialCode = materialCode || activeCode || user?.matnr;
  const activeVendorCode = vendorCode || user?.vendorCode || user?.Vendor;

  const [rows, setRows] = useState<RowType[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [form, setForm] = useState({ col1: "", col2: "", col3: "" });
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    loadDrafts();
  }, [activeMaterialCode, activeVendorCode]);

  const loadDrafts = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/ZMM_MOULD_CARE_SRV/ZMouldGetDataSet", {
        params: { $filter: `Matnr eq '${activeMaterialCode}' and Lifnr eq '${activeVendorCode}'`, $format: "json" }
      });
      const rawSavedData = data?.d?.results || [];
      const savedRows: RowType[] = [];
      rawSavedData.forEach((savedItem: any) => {
        if (savedItem.ZmouldColId === "SP") {
          savedRows.push({
            id: Date.now().toString() + Math.random(),
            col1: savedItem.ZmouldColVal1?.trim() || "",
            col2: savedItem.ZmouldColVal2?.trim() || "",
            col3: savedItem.ZmouldColVal3?.trim() || "",
          });
        }
      });
      if (savedRows.length > 0) {
        setRows(savedRows);
      }
    } catch (e) {
      console.log("Failed to load SP drafts", e);
    } finally {
      setLoading(false);
    }
  };

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

  const saveDraft = async () => {
    if (rows.length === 0) {
      Alert.alert("Empty", "Please add at least one spare part before saving.");
      return;
    }

    const sapDate = "/Date(" + Date.now() + ")/";
    const payload = {
      Lifnr: activeVendorCode,
      Name1: user?.vendorName,
      ZsubDate: sapDate,
      CreatedBy: user?.Email,
      CreatedOn: sapDate,
      ChangedBy: user?.Email,
      ChangedOn: sapDate,
      DraftFlag: "X",
      CompletedFlag: " ",
      Matnr: activeMaterialCode,
      ZmouldItemSet: rows.map((row) => ({
        Lifnr: activeVendorCode,
        Name1: user?.vendorName,
        ZsubDate: sapDate,
        ZmouldCat: "02",
        ZmouldCatIdH: "IM",
        ZmouldHeadIdH: "H",
        ZmouldColHead: "02",
        ZmouldColId: "SP",
        ZmouldColName: "Spare Parts",
        ZmouldColVal1: (row.col1 || " ").substring(0, 100),
        ZmouldColVal2: (row.col2 || " ").substring(0, 100),
        ZmouldColVal3: (row.col3 || " ").substring(0, 100),
      })),
    };

    try {
      setSubmitting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await api.post("/ZMM_MOULD_CARE_SRV/ZMouldDataHeaderSet", payload);
      if (res.status === 200 || res.status === 201) {
        Alert.alert("Draft saved", `Saved ${rows.length} part(s) to drafts.`);
      } else {
        Alert.alert("Error", "Failed to save draft. Please try again.");
      }
    } catch (e: any) {
      const serverError = e.response?.data?.error || e.response?.data || e.message;
      const msg = typeof serverError === "object" ? JSON.stringify(serverError) : serverError;
      Alert.alert("Save failed", `Server returned an error:\n\n${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => setMenuOpen(true)} activeOpacity={0.8}>
            <View style={[styles.headerBtn, { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }]}>
              <Icons.List size={22} color={colors.textBody} weight="bold" />
            </View>
          </TouchableOpacity>
          <View style={[styles.headerIcon, { backgroundColor: colors.brandSoft }]}>
            <Icons.Toolbox size={22} color={colors.brand} weight="fill" />
          </View>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.8}>
            <View style={[styles.headerBtn, { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }]}>
              <Icons.X size={20} color={colors.textBody} weight="bold" />
            </View>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>Spare Parts</Text>
        <Text style={styles.subtitle}>Required parts with estimations</Text>
      </View>

      <Animated.ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 110 }}>
        {loading ? (
          <View style={{ alignItems: 'center', marginTop: 40, gap: 12 }}>
            <ActivityIndicator size="large" color={colors.brand} />
            <Text style={{ color: colors.textMuted, fontWeight: font.medium }}>Loading drafts...</Text>
          </View>
        ) : (
          <>
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
        </>
        )}
      </Animated.ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.85} onPress={saveDraft} disabled={submitting}>
          <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.draftBtn}>
            <Icons.FloppyDisk size={19} color="#fff" weight="bold" />
            <Text style={styles.draftTextSubmit}>Save Draft</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <SidePane isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 16, paddingBottom: 18, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerBtn: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  headerIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  title: { color: colors.ink, fontSize: font.h3, fontWeight: font.black, marginTop: 14 },
  subtitle: { color: colors.textMuted, fontSize: font.sub, fontWeight: font.medium, marginTop: 4 },

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
  draftBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 52, borderRadius: radius._17 },
  draftTextSubmit: { color: "#fff", fontWeight: font.bold, fontSize: font.body },
});
