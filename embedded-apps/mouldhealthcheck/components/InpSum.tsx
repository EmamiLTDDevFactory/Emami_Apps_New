import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useGlobalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Icons from "phosphor-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown, Layout } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, font, gradients, radius, shadow } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/config";
import { useInspection } from "@/lib/inspectionStore";
import SidePane from "./SidePane";

type TableRow = {
  id: string;
  condition: string;
  action: string;
  remarks: string;
  isEditing: boolean;
};

export default function InpSum() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const searchParams = useGlobalSearchParams();
  const { user } = useAuth();
  const { completeActive, activeCode } = useInspection();

  const materialCode = (searchParams.materialCode || searchParams.Matnr || searchParams.matnr) as string;
  const vendorCode = (searchParams.vendorCode || searchParams.Lifnr || searchParams.lifnr) as string;

  const activeMaterialCode = materialCode || activeCode || user?.matnr;
  const activeVendorCode = vendorCode || user?.vendorCode || user?.Vendor;

  const [rows, setRows] = useState<TableRow[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [inspectedBy, setInspectedBy] = useState("");
  const [inspectedError, setInspectedError] = useState(false);
  const [criticality, setCriticality] = useState<string>("");
  const [criticalityError, setCriticalityError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const inspectedOn = new Date().toLocaleDateString();

  // Pre-fill "Inspected by" with the logged-in vendor's name once it's available — only while the
  // field is still blank, so it never overwrites something the inspector already typed.
  useEffect(() => {
    if (user?.vendorName && !inspectedBy) {
      setInspectedBy(user.vendorName);
    }
  }, [user?.vendorName]);

  const addRow = () => {
    Haptics.selectionAsync();
    setRows((r) => [{ id: Date.now().toString(), condition: "", action: "", remarks: "", isEditing: true }, ...r]);
  };
  const update = (id: string, field: keyof TableRow, value: string) =>
    setRows((r) => r.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  const toggleEdit = (id: string) =>
    setRows((r) => r.map((row) => (row.id === id ? { ...row, isEditing: !row.isEditing } : row)));
  const removeRow = (id: string) => setRows((r) => r.filter((row) => row.id !== id));

  const validate = () => {
    let isValid = true;
    if (!inspectedBy.trim()) {
      setInspectedError(true);
      isValid = false;
    } else {
      setInspectedError(false);
    }
    if (!criticality) {
      setCriticalityError(true);
      isValid = false;
    } else {
      setCriticalityError(false);
    }
    if (!isValid) {
      Alert.alert("Missing information", "Please fill in all required fields (Inspector Name and Criticality) before proceeding.");
      return false;
    }
    return true;
  };

  const saveDraft = () => {
    if (!validate()) return;
    Alert.alert("Draft saved", `Saved ${rows.length} row(s) to drafts.`);
  };

  const submit = async () => {
    if (!validate()) return;
    if (rows.length === 0) {
      Alert.alert("Empty matrix", "Please add at least one row before submitting.");
      return;
    }
    if (rows.some((r) => r.isEditing)) {
      Alert.alert("Action required", "Please confirm all editing rows (green check) before submitting.");
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
      DraftFlag: " ",
      CompletedFlag: "X",
      Matnr: activeMaterialCode,
      Zcriticality: criticality,
      ZmouldItemSet: rows.map((row) => ({
        // Matnr: activeMaterialCode,
        Lifnr: activeVendorCode,
        Name1: user?.vendorName,
        ZsubDate: sapDate,
        ZmouldCat: "02",
        ZmouldCatIdH: "IM",
        ZmouldHeadIdH: "H",
        ZmouldColHead: "02",
        ZmouldColId: "IS",
        ZmouldColName: "Inspection Summary",
        ZmouldColVal1: (row.condition || " ").substring(0, 100),
        ZmouldColVal2: (row.action || " ").substring(0, 100),
        ZmouldColVal3: (row.remarks || " ").substring(0, 100),
      })),
    };
    try {
      setSubmitting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await api.post("/ZMM_MOULD_CARE_SRV/ZMouldDataHeaderSet", payload);
      if (res.status === 200 || res.status === 201) {
        router.replace("/apps/mouldhealthcheck/(tabs)");
        completeActive();
        Alert.alert("Submitted", "Inspection summary has been successfully submitted.", [
          {
            text: "Done", onPress: () => {
              //router.dismissAll();
              router.replace("/apps/mouldhealthcheck/(tabs)");
            }
          },
        ]);
        setRows([]);
        setInspectedBy("");
      } else {
        Alert.alert("Error", "Failed to submit. Please try again.");
      }
    } catch (e: any) {
      const serverError = e.response?.data?.error || e.response?.data || e.message;
      const msg = typeof serverError === "object" ? JSON.stringify(serverError) : serverError;
      Alert.alert("Submission failed", `Server returned an error:\n\n${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => setMenuOpen(true)} activeOpacity={0.8}>
            <View style={[styles.headerBtn, { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }]}>
              <Icons.List size={22} color={colors.textBody} weight="bold" />
            </View>
          </TouchableOpacity>
          <View style={[styles.headerIcon, { backgroundColor: colors.brandSoft }]}>
            <Icons.ListChecks size={22} color={colors.brand} weight="fill" />
          </View>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.8}>
            <View style={[styles.headerBtn, { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }]}>
              <Icons.X size={20} color={colors.textBody} weight="bold" />
            </View>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>Inspection Summary</Text>
        <Text style={styles.subtitle}>Condition · action · remarks matrix</Text>
      </View>

      <Animated.ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 110 }}>
        {/* INSPECTOR DETAILS */}
        <View style={[styles.infoCard, shadow.card]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoLabel}>Inspected by *</Text>
            <View style={[styles.infoInput, inspectedError && { borderColor: colors.danger }]}>
              <Icons.User size={18} color={inspectedError ? colors.danger : colors.textMuted} weight="duotone" />
              <TextInput
                style={styles.infoText}
                placeholder="Inspector name"
                placeholderTextColor={colors.textFaint}
                value={inspectedBy}
                onChangeText={(v) => {
                  setInspectedBy(v);
                  if (v.trim()) setInspectedError(false);
                }}
              />
            </View>
          </View>
          <View style={styles.dateChip}>
            <Icons.CalendarBlank size={16} color={colors.brand} weight="duotone" />
            <Text style={styles.dateChipText}>{inspectedOn}</Text>
          </View>
        </View>

        {/* CRITICALITY SELECTOR */}
        <View style={[styles.infoCard, shadow.card, { marginTop: 12, flexDirection: "column", alignItems: "stretch" }, criticalityError && { borderColor: colors.danger }]}>
          <Text style={styles.infoLabel}>Inspection Criticality *</Text>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {["OK", "Minor", "Major", "Critical"].map(c => {
              const isActive = criticality === c;
              let accentColor = colors.brand;
              if (c === "OK") accentColor = colors.success;
              if (c === "Minor") accentColor = colors.info;
              if (c === "Major") accentColor = colors.warning;
              if (c === "Critical") accentColor = colors.danger;

              return (
                <TouchableOpacity
                  key={c}
                  activeOpacity={0.8}
                  onPress={() => { setCriticality(c); setCriticalityError(false); }}
                  style={{
                    flex: 1, alignItems: "center", paddingVertical: 10, paddingHorizontal: 6,
                    borderRadius: radius._15,
                    backgroundColor: isActive ? accentColor : colors.surfaceAlt,
                    borderWidth: 1.5, borderColor: isActive ? accentColor : colors.border
                  }}
                >
                  <Text style={{ fontSize: font.sub, fontWeight: font.bold, color: isActive ? "#fff" : colors.textMuted }}>{c}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* TOOLBAR */}
        <View style={styles.toolbar}>
          <Text style={styles.rowCount}>{rows.length} row{rows.length === 1 ? "" : "s"}</Text>
          <TouchableOpacity activeOpacity={0.9} onPress={addRow}>
            <View style={styles.addBtn}>
              <Icons.Plus size={18} color={colors.brand} weight="bold" />
              <Text style={styles.addBtnText}>Add row</Text>
            </View>
          </TouchableOpacity>
        </View>

        {rows.length === 0 ? (
          <View style={styles.empty}>
            <Icons.Table size={48} color={colors.textFaint} weight="duotone" />
            <Text style={styles.emptyText}>The matrix is empty. Tap “Add row” to begin.</Text>
          </View>
        ) : (
          rows.map((row, index) => (
            <Animated.View key={row.id} entering={FadeInDown.delay(index * 40)} layout={Layout.springify()} style={[styles.rowCard, shadow.soft, row.isEditing && { borderColor: colors.brand }]}>
              {row.isEditing ? (
                <>
                  <RowInput icon={<Icons.Wrench size={16} color={colors.textMuted} weight="duotone" />} placeholder="Condition" value={row.condition} onChangeText={(v) => update(row.id, "condition", v)} />
                  <RowInput icon={<Icons.Lightning size={16} color={colors.textMuted} weight="duotone" />} placeholder="Action" value={row.action} onChangeText={(v) => update(row.id, "action", v)} />
                  <RowInput icon={<Icons.NotePencil size={16} color={colors.textMuted} weight="duotone" />} placeholder="Remarks" value={row.remarks} onChangeText={(v) => update(row.id, "remarks", v)} />
                </>
              ) : (
                <>
                  <RowRead label="Condition" value={row.condition} />
                  <RowRead label="Action" value={row.action} />
                  <RowRead label="Remarks" value={row.remarks} />
                </>
              )}
              <View style={styles.rowActions}>
                <TouchableOpacity onPress={() => toggleEdit(row.id)} style={[styles.rowBtn, { backgroundColor: row.isEditing ? colors.successSoft : colors.infoSoft }]}>
                  {row.isEditing ? <Icons.Check size={18} color={colors.success} weight="bold" /> : <Icons.PencilSimple size={18} color={colors.info} weight="bold" />}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeRow(row.id)} style={[styles.rowBtn, { backgroundColor: colors.dangerSoft }]}>
                  <Icons.Trash size={18} color={colors.danger} weight="bold" />
                </TouchableOpacity>
              </View>
            </Animated.View>
          ))
        )}
      </Animated.ScrollView>

      {/* BOTTOM BAR */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity style={styles.draftBtn} activeOpacity={0.85} onPress={saveDraft} disabled={submitting}>
          <Icons.FloppyDisk size={19} color={colors.textBody} weight="duotone" />
          <Text style={styles.draftText}>Draft</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.9} onPress={submit} disabled={submitting}>
          <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submitBtn}>
            {submitting ? <ActivityIndicator color="#fff" /> : (
              <>
                <Icons.PaperPlaneTilt size={19} color="#fff" weight="fill" />
                <Text style={styles.submitText}>Save & Submit</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <SidePane isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
    </View>
  );
}

const RowInput = ({ icon, ...rest }: { icon: React.ReactNode } & React.ComponentProps<typeof TextInput>) => (
  <View style={styles.rowInput}>
    {icon}
    <TextInput placeholderTextColor={colors.textFaint} style={styles.rowInputText} {...rest} />
  </View>
);

const RowRead = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.rowRead}>
    <Text style={styles.rowReadLabel}>{label}</Text>
    <Text style={styles.rowReadValue}>{value || "—"}</Text>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 16, paddingBottom: 18, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerBtn: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  headerIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  title: { color: colors.ink, fontSize: font.h3, fontWeight: font.black, marginTop: 14 },
  subtitle: { color: colors.textMuted, fontSize: font.sub, fontWeight: font.medium, marginTop: 4 },

  infoCard: { flexDirection: "row", alignItems: "flex-end", gap: 12, backgroundColor: colors.surface, borderRadius: radius._20, borderWidth: 1, borderColor: colors.border, padding: 14, marginTop: 16 },
  infoLabel: { fontSize: font.caption, fontWeight: font.bold, color: colors.textMuted, marginBottom: 6 },
  infoInput: { flexDirection: "row", alignItems: "center", gap: 8, height: 46, paddingHorizontal: 12, borderRadius: radius._15, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surfaceAlt },
  infoText: { flex: 1, fontSize: font.body, fontWeight: font.medium, color: colors.ink, padding: 0 },
  dateChip: { flexDirection: "row", alignItems: "center", gap: 6, height: 46, paddingHorizontal: 12, borderRadius: radius._15, backgroundColor: colors.brandSoft },
  dateChipText: { fontSize: font.sub, fontWeight: font.bold, color: colors.brand },

  toolbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 20, marginBottom: 12 },
  rowCount: { fontSize: font.body, fontWeight: font.bold, color: colors.textMuted },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.brandSoft, borderWidth: 1, borderColor: colors.brandSoft2, paddingHorizontal: 16, height: 42, borderRadius: radius.pill },
  addBtnText: { color: colors.brand, fontWeight: font.bold, fontSize: font.body },

  empty: { alignItems: "center", padding: 40, marginTop: 8, borderRadius: radius._20, borderWidth: 2, borderStyle: "dashed", borderColor: colors.border, gap: 12 },
  emptyText: { color: colors.textMuted, fontSize: font.body, fontWeight: font.medium, textAlign: "center" },

  rowCard: { backgroundColor: colors.surface, borderRadius: radius._20, borderWidth: 1.5, borderColor: colors.border, padding: 14, marginBottom: 12, gap: 10 },
  rowInput: { flexDirection: "row", alignItems: "center", gap: 8, height: 44, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceAlt },
  rowInputText: { flex: 1, fontSize: font.sub, fontWeight: font.medium, color: colors.ink, padding: 0 },
  rowRead: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 4 },
  rowReadLabel: { fontSize: font.caption, fontWeight: font.bold, color: colors.textFaint, textTransform: "uppercase" },
  rowReadValue: { flex: 1, textAlign: "right", fontSize: font.sub, fontWeight: font.semibold, color: colors.ink },
  rowActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 2 },
  rowBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },

  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", gap: 12, paddingHorizontal: 16, paddingTop: 14, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  draftBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 18, height: 52, borderRadius: radius._17, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surfaceAlt },
  draftText: { color: colors.textBody, fontWeight: font.bold, fontSize: font.body },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 52, borderRadius: radius._17 },
  submitText: { color: "#fff", fontWeight: font.bold, fontSize: font.body },
});
