import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeInRight, Layout } from "react-native-reanimated";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useGlobalSearchParams } from "expo-router";

import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/config";
import { useInspection } from "@/lib/inspectionStore";

import SidePane from "./SidePane";
import { colors, font, radius, gradients, shadow } from "@/constants/theme";

type Task = {
  id: string;
  description: string;
  isCompleted: string; // "Yes" | "No" | ""
  priority: string; // "Low" | "Medium" | "High"
  dueDate: Date;
  showDatePicker: boolean;
};

const PRIORITY_TINT: Record<string, string> = { Low: colors.success, Medium: colors.warning, High: colors.danger };

export default function PreventiveMaint() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const searchParams = useGlobalSearchParams();
  const { user } = useAuth();
  const { activeCode } = useInspection();

  const materialCode = (searchParams.materialCode || searchParams.Matnr || searchParams.matnr) as string;
  const vendorCode = (searchParams.vendorCode || searchParams.Lifnr || searchParams.lifnr) as string;

  const activeMaterialCode = materialCode || activeCode || user?.matnr;
  const activeVendorCode = vendorCode || user?.vendorCode || user?.Vendor;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
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
      const savedTasks: Task[] = [];
      rawSavedData.forEach((savedItem: any) => {
        if (savedItem.ZmouldColId === "PM") {
          const isYes = savedItem.ZmouldColVal2?.trim() === "Yes";
          const val3 = savedItem.ZmouldColVal3?.trim();
          let parsedDate = new Date();
          if (!isYes && val3) {
            const d = new Date(val3);
            if (!isNaN(d.getTime())) parsedDate = d;
          }

          savedTasks.push({
            id: Date.now().toString() + Math.random(),
            description: savedItem.ZmouldColVal1?.trim() || "",
            isCompleted: savedItem.ZmouldColVal2?.trim() || "",
            priority: isYes ? val3 : "",
            dueDate: parsedDate,
            showDatePicker: false
          });
        }
      });
      if (savedTasks.length > 0) {
        setTasks(savedTasks);
      }
    } catch (e) {
      console.log("Failed to load PM drafts", e);
    } finally {
      setLoading(false);
    }
  };

  const addTask = () => {
    Haptics.selectionAsync();
    setTasks((t) => [{ id: Date.now().toString(), description: "", isCompleted: "", priority: "", dueDate: new Date(), showDatePicker: false }, ...t]);
  };
  const update = (id: string, updates: Partial<Task>) =>
    setTasks((p) => p.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  const remove = (id: string) => setTasks((p) => p.filter((t) => t.id !== id));

  const submit = async () => {
    if (tasks.length === 0) {
      Alert.alert("Empty", "Please add at least one task.");
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
      ZmouldItemSet: tasks.map((task) => ({
        Lifnr: activeVendorCode,
        Name1: user?.vendorName,
        ZsubDate: sapDate,
        ZmouldCat: "02",
        ZmouldCatIdH: "IM",
        ZmouldHeadIdH: "H",
        ZmouldColHead: "02",
        ZmouldColId: "PM",
        ZmouldColName: "Preventive Maintenance",
        ZmouldColVal1: (task.description || " ").substring(0, 100),
        ZmouldColVal2: (task.isCompleted || " ").substring(0, 100),
        ZmouldColVal3: (task.isCompleted === "Yes" ? task.priority : task.dueDate.toLocaleDateString()).substring(0, 100),
      })),
    };

    try {
      setSubmitting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await api.post("/ZMM_MOULD_CARE_SRV/ZMouldDataHeaderSet", payload);
      if (res.status === 200 || res.status === 201) {
        Alert.alert("Draft saved", "Task progress stored successfully.");
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
            <Icons.Wrench size={22} color={colors.brand} weight="fill" />
          </View>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.8}>
            <View style={[styles.headerBtn, { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }]}>
              <Icons.X size={20} color={colors.textBody} weight="bold" />
            </View>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>Preventive Maintenance</Text>
        <Text style={styles.subtitle}>Required or not — schedule tasks</Text>
      </View>

      <Animated.ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 110 }}>
        {loading ? (
          <View style={{ alignItems: 'center', marginTop: 40, gap: 12 }}>
            <ActivityIndicator size="large" color={colors.brand} />
            <Text style={{ color: colors.textMuted, fontWeight: font.medium }}>Loading drafts...</Text>
          </View>
        ) : (
          <>
            <TouchableOpacity activeOpacity={0.9} onPress={addTask}>
              <View style={styles.addBtn}>
                <Icons.Plus size={20} color={colors.brand} weight="bold" />
                <Text style={styles.addBtnText}>Add maintenance task</Text>
              </View>
            </TouchableOpacity>

            {tasks.length === 0 ? (
              <View style={styles.empty}>
                <Icons.Wrench size={48} color={colors.textFaint} weight="duotone" />
                <Text style={styles.emptyText}>No tasks yet. Add a maintenance task to begin.</Text>
              </View>
            ) : (
          tasks.map((task, index) => {
            const canChoose = task.description.trim().length > 0;
            const isYes = task.isCompleted === "Yes";
            const isNo = task.isCompleted === "No";
            return (
              <Animated.View
                key={task.id}
                entering={FadeInDown.delay(index * 50)}
                layout={Layout.springify()}
                style={[styles.card, shadow.soft, isYes && { borderLeftColor: colors.success }, isNo && { borderLeftColor: colors.danger }]}
              >
                <View style={styles.cardHead}>
                  <View style={styles.descBox}>
                    <Icons.ClipboardText size={16} color={colors.textMuted} weight="duotone" />
                    <TextInput
                      placeholder="Task description…"
                      placeholderTextColor={colors.textFaint}
                      value={task.description}
                      onChangeText={(txt) => update(task.id, { description: txt })}
                      style={styles.descInput}
                    />
                  </View>
                  <TouchableOpacity onPress={() => remove(task.id)} style={styles.trash}>
                    <Icons.Trash size={18} color={colors.danger} weight="bold" />
                  </TouchableOpacity>
                </View>

                {canChoose && (
                  <Animated.View entering={FadeInRight} style={styles.statusRow}>
                    <Text style={styles.label}>Maintenance required?</Text>
                    <View style={styles.segment}>
                      <TouchableOpacity onPress={() => update(task.id, { isCompleted: "Yes", priority: "" })} style={[styles.segBtn, isYes && { backgroundColor: colors.success }]}>
                        <Text style={[styles.segText, { color: isYes ? "#fff" : colors.textMuted }]}>YES</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => update(task.id, { isCompleted: "No", priority: "" })} style={[styles.segBtn, isNo && { backgroundColor: colors.danger }]}>
                        <Text style={[styles.segText, { color: isNo ? "#fff" : colors.textMuted }]}>NO</Text>
                      </TouchableOpacity>
                    </View>
                  </Animated.View>
                )}

                {isYes && (
                  <Animated.View entering={FadeInDown} style={{ marginTop: 16 }}>
                    <Text style={styles.label}>Priority</Text>
                    <View style={styles.priorityRow}>
                      {["Low", "Medium", "High"].map((p) => {
                        const active = task.priority === p;
                        return (
                          <TouchableOpacity key={p} onPress={() => update(task.id, { priority: p })} style={[styles.pPill, active && { backgroundColor: PRIORITY_TINT[p], borderColor: PRIORITY_TINT[p] }]}>
                            <Text style={[styles.pText, { color: active ? "#fff" : colors.textMuted }]}>{p}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </Animated.View>
                )}

                {isNo && (
                  <Animated.View entering={FadeInDown} style={{ marginTop: 16 }}>
                    <Text style={styles.label}>Re-schedule date</Text>
                    <TouchableOpacity onPress={() => update(task.id, { showDatePicker: true })} style={styles.dateBtn}>
                      <Icons.Calendar size={18} color={colors.brand} weight="fill" />
                      <Text style={styles.dateText}>{task.dueDate.toLocaleDateString()}</Text>
                    </TouchableOpacity>
                    {task.showDatePicker && (
                      <DateTimePicker
                        value={task.dueDate}
                        mode="date"
                        display="default"
                        onChange={(_e, d) => update(task.id, { showDatePicker: false, dueDate: d || new Date() })}
                      />
                    )}
                  </Animated.View>
                )}
              </Animated.View>
            );
          })
        )}
        </>
        )}
      </Animated.ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.85} onPress={submit} disabled={submitting}>
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

  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.brandSoft, borderWidth: 1.5, borderColor: colors.brandSoft2, height: 52, borderRadius: radius._17 },
  addBtnText: { color: colors.brand, fontWeight: font.bold, fontSize: font.body },

  empty: { alignItems: "center", padding: 40, marginTop: 16, borderRadius: radius._20, borderWidth: 2, borderStyle: "dashed", borderColor: colors.border, gap: 12 },
  emptyText: { color: colors.textMuted, fontSize: font.body, fontWeight: font.medium, textAlign: "center" },

  card: { backgroundColor: colors.surface, borderRadius: radius._20, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 5, borderLeftColor: colors.brand, padding: 14, marginTop: 14 },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  descBox: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, height: 46, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceAlt },
  descInput: { flex: 1, fontSize: font.sub, fontWeight: font.medium, color: colors.ink, padding: 0 },
  trash: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.dangerSoft, alignItems: "center", justifyContent: "center" },

  label: { fontSize: font.caption, fontWeight: font.bold, color: colors.textMuted, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.3 },
  statusRow: { marginTop: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  segment: { flexDirection: "row", backgroundColor: colors.surfaceAlt, borderRadius: 12, padding: 4, width: 140 },
  segBtn: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 9 },
  segText: { fontSize: font.caption, fontWeight: font.bold },

  priorityRow: { flexDirection: "row", gap: 10 },
  pPill: { flex: 1, paddingVertical: 11, alignItems: "center", borderRadius: 12, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  pText: { fontSize: font.sub, fontWeight: font.bold },

  dateBtn: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceAlt },
  dateText: { fontSize: font.body, fontWeight: font.bold, color: colors.ink },

  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", gap: 12, paddingHorizontal: 16, paddingTop: 14, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  draftBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 52, borderRadius: radius._17 },
  draftTextSubmit: { color: "#fff", fontWeight: font.bold, fontSize: font.body },
});
