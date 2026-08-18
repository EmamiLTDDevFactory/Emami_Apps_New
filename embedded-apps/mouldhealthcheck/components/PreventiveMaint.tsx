import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeInRight, Layout } from "react-native-reanimated";
import DateTimePicker from "@react-native-community/datetimepicker";

import SidePane from "./SidePane";
import { colors, font, radius, gradients, shadow } from "@/constants/theme";
import GlassChip from "@/components/ui/GlassChip";

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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

  const addTask = () => {
    Haptics.selectionAsync();
    setTasks((t) => [{ id: Date.now().toString(), description: "", isCompleted: "", priority: "", dueDate: new Date(), showDatePicker: false }, ...t]);
  };
  const update = (id: string, updates: Partial<Task>) =>
    setTasks((p) => p.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  const remove = (id: string) => setTasks((p) => p.filter((t) => t.id !== id));

  const submit = (isDraft: boolean) => {
    if (tasks.length === 0) {
      Alert.alert("Empty", "Please add at least one task.");
      return;
    }
    if (!isDraft) {
      const incomplete = tasks.some((t) => !t.description || !t.isCompleted || (t.isCompleted === "Yes" && !t.priority));
      if (incomplete) {
        Alert.alert("Incomplete", "Please fill all required fields in each task.");
        return;
      }
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(isDraft ? "Draft saved" : "Submitted", isDraft ? "Task progress stored locally." : "Maintenance plan submitted successfully.");
  };

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
            <Icons.Wrench size={22} color="#fff" weight="fill" />
          </GlassChip>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.8}>
            <GlassChip size={40} tint="dark" style={styles.headerBtn}>
              <Icons.X size={20} color="#fff" weight="bold" />
            </GlassChip>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>Preventive Maintenance</Text>
        <Text style={styles.subtitle}>Required or not — schedule tasks</Text>
      </LinearGradient>

      <Animated.ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 110 }}>
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
      </Animated.ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity style={styles.draftBtn} activeOpacity={0.85} onPress={() => submit(true)}>
          <Icons.FloppyDisk size={19} color={colors.textBody} weight="duotone" />
          <Text style={styles.draftText}>Draft</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.9} onPress={() => submit(false)}>
          <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveBtn}>
            <Icons.Check size={19} color="#fff" weight="bold" />
            <Text style={styles.saveText}>Finalize Plan</Text>
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
  draftBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 18, height: 52, borderRadius: radius._17, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surfaceAlt },
  draftText: { color: colors.textBody, fontWeight: font.bold, fontSize: font.body },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 52, borderRadius: radius._17 },
  saveText: { color: "#fff", fontWeight: font.bold, fontSize: font.body },
});
