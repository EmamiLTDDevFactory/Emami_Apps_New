import SidePane from "@/components/SidePane";
import EmptyState from "@/components/ui/EmptyState";
import GlassChip from "@/components/ui/GlassChip";
import { colors, font, gradients, radius, shadow } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/config";
import { useInspection } from "@/lib/inspectionStore";
import GlassSurface from "@/components/ui/GlassSurface";
import { DonutChart } from "@/components/ui/charts";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useGlobalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Icons from "phosphor-react-native";
import React, { ReactNode, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  Layout,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
 
type Item = { id: string; task: string; remarks: string; decision: "" | "Yes" | "No"; photos: { uri: string; base64?: string; name: string; type: string }[] };

type Props = {
  /** 2-letter module code (== ZmouldHeadId on /dropdown and ZmouldColId on /submit). */
  code: string;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
};

const ChecklistSwitch = ({ value, onChange }: { value: "" | "Yes" | "No", onChange: (v: "Yes" | "No") => void }) => {
  const bgStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: withTiming(value === "Yes" ? colors.success : value === "No" ? colors.danger : colors.border)
    };
  });
  
  const thumbStyle = useAnimatedStyle(() => {
    const translate = value === "Yes" ? 28 : value === "No" ? 4 : 16;
    return {
      transform: [{ translateX: withTiming(translate) }]
    };
  });

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ width: 56, height: 32, borderRadius: 16 }}>
         <Animated.View style={[{ position: 'absolute', width: 56, height: 32, borderRadius: 16 }, bgStyle]} />
         <View style={{ flexDirection: 'row', flex: 1 }}>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => onChange("No")} />
            <TouchableOpacity style={{ flex: 1 }} onPress={() => onChange("Yes")} />
         </View>
         <Animated.View style={[{ position: 'absolute', width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', top: 4, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 2 }, thumbStyle]} pointerEvents="none" />
      </View>
      <Text style={{ fontSize: 13, fontWeight: '700', color: value === "Yes" ? colors.success : value === "No" ? colors.danger : colors.textMuted, width: 45 }}>
         {value === "Yes" ? "OK" : value === "No" ? "Issue" : "—"}
      </Text>
    </View>
  );
};
 
/**
* Shared YES/NO + remarks inspection checklist used by every mould subsystem.
* Records live progress to the inspection store and lets the user attach defect
* photos to any item marked "No".
*/
export default function InspectionChecklist({ code, title, subtitle, icon }: Props) {
  const { user } = useAuth();
  const { recordModule, addPhotos, activeCode } = useInspection();
  const insets = useSafeAreaInsets();
  const router = useRouter();
 
  // Extract the parameters passed from DashboardScreen or SidePane
  const searchParams = useGlobalSearchParams();
  const materialCode = (searchParams.materialCode || searchParams.Matnr || searchParams.matnr) as string;
  const vendorCode = (searchParams.vendorCode || searchParams.Lifnr || searchParams.lifnr) as string;
  
  const activeMaterialCode = materialCode || activeCode || user?.matnr;
  const activeVendorCode = vendorCode || user?.vendorCode || user?.Vendor;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<Item[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
 
  useEffect(() => {
    load();
  }, [user?.Email]);
 
const load = async () => {
    try {
      setLoading(true);
      console.log("Loading checklist for module:", user);
      // 1. Fetch both the template and the saved draft concurrently
    //   const [dropdownRes, detailsRes] = await Promise.all([
    //     //api.get("/dropdown", { params: { ZmouldCatId: "02", ZmouldHeadId: code } }),
    //  //   api.get("/getdetails", { params: { Matnr: user?.matnr, Lifnr: user?.vendorCode } }).catch(() => ({ data: null }))
     
    //     api.get("/ZMouldDropDownSet", { params: { 
    //       "$filter": `ZmouldCatId eq '02' and ZmouldHeadId eq '${code}'`,
    //       "$format": "json",
    //     } }),

    //     api.get("/ZMouldGetDataSet", { params: { 
 
      // 2. Extract the template questions
      const [{ data }, { data: data1 }] = await Promise.all([
        api.get("/ZMM_MOULD_CARE_SRV/ZMouldDropDownSet", {
          params: { $filter: `ZmouldCatId eq '02' and ZmouldHeadId eq '${code}'`, $format: "json" }
        }),
        api.get("/ZMM_MOULD_CARE_SRV/ZMouldGetDataSet", {
          params: { $filter: `Matnr eq '${activeMaterialCode}' and Lifnr eq '${activeVendorCode}'`, $format: "json" }
        }).catch(() => ({ data: null }))
      ]);

      const templateQuestions = data?.d?.results || [];
      const rawSavedData = data1?.d?.results || [];
 
      // 4. Create a Lookup Dictionary to map the keys to task names
      const savedDataMap: Record<string, { decision: string; remarks: string }> = {};
      rawSavedData.forEach((savedItem: any) => {
        // IMPORTANT: Only map data that belongs to the current module being viewed
        if (savedItem.ZmouldColId === code) {
          const taskName = savedItem.ZmouldColName?.trim();
          if (taskName) {
            savedDataMap[taskName] = {
              decision: savedItem.ZmouldColVal1?.trim() || "",
              remarks: savedItem.ZmouldColVal2?.trim() || "",
            };
          }
        }
      });
 
      // 5. Merge the standard Template with our new Dictionary
      const finalItems: Item[] = templateQuestions.map((d: any, i: number) => {
        // The template uses CamelCase 'ZmouldField'
        const currentTaskName = d.ZmouldField?.trim();
        // Look for a match in our saved drafts dictionary  
        const savedMatch = savedDataMap[currentTaskName];
 
        // Ensure the decision is strictly "Yes" or "No" to avoid UI toggle bugs
        // Defaulting to "Yes" (Condition OK) per user request
        let validDecision: "" | "Yes" | "No" = "Yes";
        if (savedMatch?.decision === "Yes" || savedMatch?.decision === "No") {
          validDecision = savedMatch.decision;
        }
 
        return {
          id: String(i + 1),
          task: d.ZmouldField,
          decision: validDecision,
          remarks: savedMatch?.remarks || "",
          photos: [] // Placeholder, as images aren't currently returned as binary blobs
        };
      });
 
      // 6. Update the React UI state!
      setData(finalItems);
 
    } catch (error) {
      console.error("Failed to load checklist:", error);
      Alert.alert("Error", "Could not load the checklist data.");
      setData([]);
    } finally {
      setLoading(false);
    }
  };
 
  const total = data.length;
  const yes = data.filter((d) => d.decision === "Yes").length;
  const no = data.filter((d) => d.decision === "No").length;
  const answered = yes + no;
  const pct = total ? Math.round((answered / total) * 100) : 0;
 
  // record progress for the active mould as the user works
  useEffect(() => {
    if (total > 0) recordModule(code, answered, total);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answered, total, code]);
 
  const setDecision = (id: string, decision: "Yes" | "No") => {
    Haptics.selectionAsync();
    setData((p) => p.map((it) => (it.id === id ? { ...it, decision } : it)));
  };
  const setRemarks = (id: string, remarks: string) =>
    setData((p) => p.map((it) => (it.id === id ? { ...it, remarks } : it)));
  const reset = (id: string) =>
    setData((p) => p.map((it) => (it.id === id ? { ...it, decision: "", remarks: "", photos: [] } : it)));
 
  // ---- photo & file capture for defects ----
  const launchPicker = async (mode: "camera" | "library" | "document", id: string) => {
    try {
      let uri = "";
      let base64: string | undefined = "";
      let name = "attachment";
      let type = "image/jpeg";

      if (mode === "camera") {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert("Permission needed", "Camera access is required to capture defect photos.");
          return;
        }
        const result = await ImagePicker.launchCameraAsync({ quality: 0.6, mediaTypes: ["images"], base64: true });
        if (result.canceled || !result.assets?.length) return;
        uri = result.assets[0].uri;
        base64 = result.assets[0].base64 || undefined;
        name = result.assets[0].fileName || "photo.jpg";
      } else if (mode === "library") {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert("Permission needed", "Photo library access is required.");
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.6, mediaTypes: ["images"], base64: true });
        if (result.canceled || !result.assets?.length) return;
        uri = result.assets[0].uri;
        base64 = result.assets[0].base64 || undefined;
        name = result.assets[0].fileName || "photo.jpg";
      } else if (mode === "document") {
        const result = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
        if (result.canceled || !result.assets?.length) return;
        const asset = result.assets[0];
        uri = asset.uri;
        name = asset.name;
        type = asset.mimeType || "application/octet-stream";

        // Read Base64
        if (Platform.OS === 'web') {
          try {
            const res = await fetch(uri);
            const blob = await res.blob();
            base64 = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.readAsDataURL(blob);
              reader.onloadend = () => {
                const b64 = reader.result as string;
                resolve(b64.split(",")[1]); // Strip data URL scheme
              };
            });
          } catch (e) {
            console.warn("Failed to convert file to base64 on web", e);
          }
        } else {
          try {
            base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
          } catch (e) {
            console.warn("Failed to read file", e);
          }
        }
      }

      if (uri) {
        setData((p) => p.map((it) => (it.id === id ? { ...it, photos: [...it.photos, { uri, base64, name, type }] } : it)));
        addPhotos(1);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not attach the file.");
    }
  };
 
  const attachPhoto = (id: string) => {
    if (Platform.OS === 'web') {
      launchPicker("document", id);
    } else {
      Alert.alert("Add attachment", "Capture a new photo or pick a file.", [
        { text: "Take photo", onPress: () => launchPicker("camera", id) },
        { text: "Choose from gallery", onPress: () => launchPicker("library", id) },
        { text: "Choose file/PDF", onPress: () => launchPicker("document", id) },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  };
 
  const removePhoto = (id: string, uri: string) =>
    setData((p) => p.map((it) => (it.id === id ? { ...it, photos: it.photos.filter((u) => u.uri !== uri) } : it)));
 
  const saveDraft = async () => {
    console.log(user);
    // let matnr = user?.matnr;
    try {
      setSaving(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
        ZmouldItemSet: data.map((item) => ({
          //Matnr: activeMaterialCode,
          Lifnr: activeVendorCode,
          Name1: user?.vendorName,
          ZsubDate: sapDate,
          ZmouldCat: "02",
          ZmouldCatIdH: "IM",
          ZmouldHeadIdH: "H",
          ZmouldColHead: "02",
          ZmouldColId: code,
          ZmouldColName: item.task.substring(0, 100),
          ZmouldColVal1: (item.decision || " ").substring(0, 100),
          ZmouldColVal2: (item.remarks || " ").substring(0, 100),
          ZmouldColVal3: item.photos.length ? `${item.photos.length} attachment(s)` : " ",
          // Attachments: item.photos.map(p => ({
          //   name: p.name,
          //   type: p.type,
          //   base64: p.base64
          // }))
        })),
      };
      
      // DEBUG: Alert to verify material code
      Alert.alert("Debug Payload", `Matnr: ${activeMaterialCode} | Vendor: ${activeVendorCode}`);

      const res = await api.post("/ZMM_MOULD_CARE_SRV/ZMouldDataHeaderSet", payload);
      if (res.status === 200 || res.status === 201) {
        Alert.alert("Draft saved", "Your progress has been securely saved.");
      } else {
        Alert.alert("Error", "Failed to save draft. Please try again.");
      }
    } catch {
      Alert.alert("Network error", "Could not reach the server to save your draft.");
    } finally {
      setSaving(false);
    }
  };
 
  if (loading) {
    return (
<View style={styles.loader}>
<ActivityIndicator size="large" color={colors.brand} />
<Text style={styles.loaderText}>Loading checklist…</Text>
</View>
    );
  }
 
  return (
<View style={styles.root}>
<StatusBar style="light" />      {/* HEADER */}
<LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: insets.top + 10 }]}>
<View style={styles.headerRow}>
<TouchableOpacity onPress={() => setMenuOpen(true)} activeOpacity={0.8}>
  <GlassChip size={40} tint="dark" style={styles.headerBtn}>
    <Icons.List size={22} color="#fff" weight="bold" />
  </GlassChip>
</TouchableOpacity>
<GlassChip size={44} tint="dark" style={styles.headerIcon}>{icon ?? <Icons.ClipboardText size={22} color="#fff" weight="fill" />}</GlassChip>
<TouchableOpacity onPress={() => router.back()} activeOpacity={0.8}>
  <GlassChip size={40} tint="dark" style={styles.headerBtn}>
    <Icons.X size={20} color="#fff" weight="bold" />
  </GlassChip>
</TouchableOpacity>
</View>
<Text style={styles.title}>{title}</Text>
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
 
        {/* progress */}
<View style={styles.progressWrap}>
<View style={styles.progressTrack}>
<ProgressFill pct={pct} />
</View>
<Text style={styles.progressText}>{answered}/{total}</Text>
</View>
</LinearGradient>
 
      {/* STAT STRIP */}
<View style={styles.stripWrap}>
<View style={[styles.strip, shadow.card]}>
<StripStat value={total} label="Total" color={colors.info} />
<View style={styles.stripDivider} />
<StripStat value={yes} label="Yes" color={colors.success} />
<View style={styles.stripDivider} />
<StripStat value={no} label="No" color={colors.danger} />
</View>
</View>
 
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 110 }}
>
        {data.length === 0 ? (
<EmptyState title="No checklist items" message="This module has no inspection points to fill." />
        ) : (
          data.map((item, index) => {
            const isYes = item.decision === "Yes";
            const isNo = item.decision === "No";
            return (
<Animated.View
                key={item.id}
                entering={FadeInDown.delay(index * 40).duration(400)}
                layout={Layout.springify()}
                style={[
                  styles.card,
                  shadow.soft,
                  isYes && { borderLeftColor: colors.success },
                  isNo && { borderLeftColor: colors.danger },
                  { backgroundColor: 'transparent', overflow: 'hidden' }
                ]}
>
<GlassSurface tint="light" intensity="chip" borderRadius={0} style={StyleSheet.absoluteFillObject as any} />
<View style={styles.cardHead}>
<Text style={styles.taskNo}>{index + 1}</Text>
<Text style={styles.task}>{item.task}</Text>
                  {(isYes || isNo || item.remarks) && (
<TouchableOpacity onPress={() => reset(item.id)} hitSlop={8} style={styles.resetBtn}>
<Icons.ArrowCounterClockwise size={16} color={colors.textMuted} weight="bold" />
</TouchableOpacity>
                  )}
</View>
 
                <View style={styles.actionRow}>
                  <ChecklistSwitch value={item.decision} onChange={(v) => setDecision(item.id, v)} />
 
                  <View style={styles.remarks}>
<Icons.NotePencil size={16} color={colors.textFaint} weight="duotone" />
<TextInput
                      placeholder="Add remarks…"
                      placeholderTextColor={colors.textFaint}
                      value={item.remarks}
                      onChangeText={(v) => setRemarks(item.id, v)}
                      style={styles.remarksInput}
                    />
</View>
</View>
 
                {/* DEFECT PHOTOS — shown when the item is flagged "No" */}
                {isNo && (
<Animated.View entering={FadeInDown.duration(300)} style={styles.photoSection}>
<View style={styles.photoHeaderRow}>
<Icons.Camera size={15} color={colors.danger} weight="fill" />
<Text style={styles.photoHeader}>Defect evidence{item.photos.length ? ` (${item.photos.length})` : ""}</Text>
</View>
<View style={styles.photoStrip}>
                      {item.photos.map((photo, pIdx) => (
                        <View key={pIdx} style={styles.thumbWrap}>
                          {photo.type && photo.type.startsWith('image/') ? (
                            <Image source={{ uri: photo.uri }} style={styles.thumb} />
                          ) : (
                            <View style={[styles.thumb, { backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' }]}>
                              <Icons.FilePdf size={24} color={colors.danger} />
                              <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: 4, paddingHorizontal: 2, textAlign: 'center' }} numberOfLines={2}>{photo.name}</Text>
                            </View>
                          )}
                          <TouchableOpacity style={styles.thumbRemove} onPress={() => removePhoto(item.id, photo.uri)} hitSlop={6}>
                            <Icons.X size={11} color="#fff" weight="bold" />
                          </TouchableOpacity>
                        </View>
                      ))}
<TouchableOpacity style={styles.addPhoto} onPress={() => attachPhoto(item.id)} activeOpacity={0.8}>
<Icons.Plus size={20} color={colors.danger} weight="bold" />
<Text style={styles.addPhotoText}>Attach</Text>
</TouchableOpacity>
</View>
</Animated.View>
                )}
</Animated.View>
            );
          })
        )}
</Animated.ScrollView>
 
      {/* BOTTOM BAR */}
<View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
<TouchableOpacity style={styles.menuBtn} activeOpacity={0.85} onPress={() => setMenuOpen(true)}>
<Icons.SquaresFour size={20} color={colors.brand} weight="bold" />
<Text style={styles.menuBtnText}>Modules</Text>
</TouchableOpacity>
<TouchableOpacity style={{ flex: 1 }} activeOpacity={0.9} onPress={saveDraft} disabled={saving}>
<LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveBtn}>
            {saving ? (
<ActivityIndicator color="#fff" />
            ) : (
<>
<Icons.FloppyDisk size={19} color="#fff" weight="fill" />
<Text style={styles.saveText}>Save Draft</Text>
</>
            )}
</LinearGradient>
</TouchableOpacity>
</View>
 
      <SidePane isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
</View>
  );
}
 
function ProgressFill({ pct }: { pct: number }) {
  const style = useAnimatedStyle(() => ({ width: withTiming(`${pct}%`, { duration: 350 }) }));
  return <Animated.View style={[styles.progressFill, style]} />;
}
 
const StripStat = ({ value, label, color }: { value: number; label: string; color: string }) => (
<View style={styles.stripStat}>
<Text style={[styles.stripValue, { color }]}>{value}</Text>
<Text style={styles.stripLabel}>{label}</Text>
</View>
);
 
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  loader: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg, gap: 12 },
  loaderText: { color: colors.textMuted, fontWeight: font.medium },
 
  header: {
    paddingHorizontal: 16,
    paddingBottom: 18,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerBtn: { width: 40, height: 40, borderRadius: 13 },
  headerIcon: { width: 44, height: 44, borderRadius: 14 },
  title: { color: "#fff", fontSize: font.h3, fontWeight: font.black, marginTop: 14, letterSpacing: -0.3 },
  subtitle: { color: "rgba(255,255,255,0.88)", fontSize: font.sub, fontWeight: font.medium, marginTop: 4 },
  progressWrap: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 },
  progressTrack: { flex: 1, height: 8, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.28)", overflow: "hidden" },
  progressFill: { height: 8, borderRadius: 999, backgroundColor: "#fff" },
  progressText: { color: "#fff", fontSize: font.caption, fontWeight: font.bold },
 
  stripWrap: { paddingHorizontal: 16, marginTop: -14 },
  strip: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius._20,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
  },
  stripStat: { flex: 1, alignItems: "center" },
  stripValue: { fontSize: 20, fontWeight: font.black },
  stripLabel: { fontSize: font.micro, color: colors.textMuted, fontWeight: font.semibold, marginTop: 1 },
  stripDivider: { width: 1, backgroundColor: colors.border, marginVertical: 4 },
 
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius._20,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 5,
    borderLeftColor: colors.border,
    padding: 14,
    marginBottom: 12,
  },
  cardHead: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  taskNo: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: colors.brandSoft,
    color: colors.brand,
    fontWeight: font.black,
    fontSize: font.caption,
    textAlign: "center",
    lineHeight: 24,
    overflow: "hidden",
  },
  task: { flex: 1, fontSize: font.body, fontWeight: font.semibold, color: colors.ink, lineHeight: 21 },
  resetBtn: { padding: 6, borderRadius: 10, backgroundColor: colors.surfaceAlt },
 
  actionRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 },
  segment: { flexDirection: "row", backgroundColor: colors.surfaceAlt, borderRadius: 13, padding: 4, gap: 4 },
  segBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
  },
  segText: { fontSize: font.caption, fontWeight: font.bold },
  remarks: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 13,
    height: 44,
    paddingHorizontal: 12,
  },
  remarksInput: { flex: 1, fontSize: font.sub, color: colors.ink, fontWeight: font.medium, padding: 0 },
 
  photoSection: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.divider },
  photoHeaderRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  photoHeader: { fontSize: font.caption, fontWeight: font.bold, color: colors.danger, textTransform: "uppercase", letterSpacing: 0.3 },
  photoStrip: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  thumbWrap: { width: 60, height: 60 },
  thumb: { width: 60, height: 60, borderRadius: 12, backgroundColor: colors.surfaceAlt },
  thumbRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  addPhoto: {
    width: 60,
    height: 60,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  addPhotoText: { fontSize: font.micro, fontWeight: font.bold, color: colors.danger },
 
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  menuBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    height: 52,
    borderRadius: radius._17,
    borderWidth: 1.5,
    borderColor: colors.brandSoft2,
    backgroundColor: colors.brandSoft,
  },
  menuBtnText: { color: colors.brand, fontWeight: font.bold, fontSize: font.body },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 52, borderRadius: radius._17 },
  saveText: { color: "#fff", fontWeight: font.bold, fontSize: font.body },
});

// import React, { useEffect, useState, ReactNode } from "react";
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   TextInput,
//   ActivityIndicator,
//   Alert,
//   Image,
// } from "react-native";
// import { LinearGradient } from "expo-linear-gradient";
// import { useSafeAreaInsets } from "react-native-safe-area-context";
// import { StatusBar } from "expo-status-bar";
// import { useRouter } from "expo-router";
// import * as Icons from "phosphor-react-native";
// import * as Haptics from "expo-haptics";
// import * as ImagePicker from "expo-image-picker";
// import Animated, {
//   FadeInDown,
//   Layout,
//   useAnimatedStyle,
//   withTiming,
// } from "react-native-reanimated";

// import SidePane from "@/components/SidePane";
// import { useAuth } from "@/contexts/AuthContext";
// import { useInspection } from "@/lib/inspectionStore";
// import { api } from "@/lib/config";
// import { colors, font, radius, gradients, shadow } from "@/constants/theme";
// import EmptyState from "@/components/ui/EmptyState";
// import axios from "axios";

// type Item = { id: string; task: string; remarks: string; decision: "" | "Yes" | "No"; photos: string[] };

// type Props = {
//   /** 2-letter module code (== ZmouldHeadId on /dropdown and ZmouldColId on /submit). */
//   code: string;
//   title: string;
//   subtitle?: string;
//   icon?: ReactNode;
// };

// /**
//  * Shared YES/NO + remarks inspection checklist used by every mould subsystem.
//  * Records live progress to the inspection store and lets the user attach defect
//  * photos to any item marked "No".
//  */
// export default function InspectionChecklist({ code, title, subtitle, icon }: Props) {
//   const { user } = useAuth();
//   const { recordModule, addPhotos } = useInspection();
//   const insets = useSafeAreaInsets();
//   const router = useRouter();

//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);
//   const [data, setData] = useState<Item[]>([]);
//   const [menuOpen, setMenuOpen] = useState(false);

//   useEffect(() => {
//     load();
//   }, [user?.Email]);

// const load = async () => {
//     try {
//       setLoading(true);

//       // 1. Fetch both the template and the saved draft concurrently
//       const [dropdownRes, detailsRes] = await Promise.all([
//         api.get("/dropdown", { params: { ZmouldCatId: "02", ZmouldHeadId: code } }),
//         api.get("/getdetails", { params: { Matnr: user?.matnr, Lifnr: user?.vendorCode } }).catch(() => ({ data: null }))
//       ]);

//       // 2. Extract the template questions (based on your earlier code)
//       const templateQuestions = dropdownRes.data?.dropdowns || [];

//       // 3. Safely extract the saved draft data based exactly on your console.log image
//       const rawSavedData = detailsRes.data?.moulddetails || [];

//       // 4. Create a Lookup Dictionary to map the ALL_CAPS keys to task names
//       const savedDataMap: Record<string, { decision: string; remarks: string }> = {};
      
//       rawSavedData.forEach((savedItem: any) => {
//         // IMPORTANT: Only map data that belongs to the current module being viewed
//         // (Assuming 'code' matches 'ZMOULD_COL_ID', like 'NI' in your screenshot)
//         if (savedItem.ZMOULD_COL_ID === code) {
          
//           // Use the exact keys from your screenshot
//           const taskName = savedItem.ZMOULD_COL_NAME?.trim();
          
//           if (taskName) {
//             savedDataMap[taskName] = {
//               decision: savedItem.ZMOULD_COL_VAL1?.trim() || "",
//               remarks: savedItem.ZMOULD_COL_VAL2?.trim() || "",
//             };
//           }
//         }
//       });

//       // 5. Merge the standard Template with our new Dictionary
//       const finalItems: Item[] = templateQuestions.map((d: any, i: number) => {
//         // The template uses CamelCase 'Zmouldfield'
//         const currentTaskName = d.Zmouldfield?.trim();
        
//         // Look for a match in our saved drafts dictionary
//         const savedMatch = savedDataMap[currentTaskName];

//         // Ensure the decision is strictly "Yes" or "No" to avoid UI toggle bugs
//         let validDecision: "" | "Yes" | "No" = "";
//         if (savedMatch?.decision === "Yes" || savedMatch?.decision === "No") {
//           validDecision = savedMatch.decision;
//         }

//         return {
//           id: String(i + 1),
//           task: d.Zmouldfield,
//           decision: validDecision,
//           remarks: savedMatch?.remarks || "",
//           photos: [] // Placeholder, as images aren't currently returned as binary blobs
//         };
//       });

//       // 6. Update the React UI state!
//       setData(finalItems);

//     } catch (error) {
//       console.error("Failed to load checklist:", error);
//       Alert.alert("Error", "Could not load the checklist data.");
//       setData([]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const total = data.length;
//   const yes = data.filter((d) => d.decision === "Yes").length;
//   const no = data.filter((d) => d.decision === "No").length;
//   const answered = yes + no;
//   const pct = total ? Math.round((answered / total) * 100) : 0;

//   // record progress for the active mould as the user works
//   useEffect(() => {
//     if (total > 0) recordModule(code, answered, total);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [answered, total, code]);

//   const setDecision = (id: string, decision: "Yes" | "No") => {
//     Haptics.selectionAsync();
//     setData((p) => p.map((it) => (it.id === id ? { ...it, decision } : it)));
//   };
//   const setRemarks = (id: string, remarks: string) =>
//     setData((p) => p.map((it) => (it.id === id ? { ...it, remarks } : it)));
//   const reset = (id: string) =>
//     setData((p) => p.map((it) => (it.id === id ? { ...it, decision: "", remarks: "", photos: [] } : it)));

//   // ---- photo capture for defects ----
//   const launchPicker = async (mode: "camera" | "library", id: string) => {
//     try {
//       let result: ImagePicker.ImagePickerResult;
//       if (mode === "camera") {
//         const perm = await ImagePicker.requestCameraPermissionsAsync();
//         if (!perm.granted) {
//           Alert.alert("Permission needed", "Camera access is required to capture defect photos.");
//           return;
//         }
//         result = await ImagePicker.launchCameraAsync({ quality: 0.6, mediaTypes: ["images"] });
//       } else {
//         const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
//         if (!perm.granted) {
//           Alert.alert("Permission needed", "Photo library access is required.");
//           return;
//         }
//         result = await ImagePicker.launchImageLibraryAsync({ quality: 0.6, mediaTypes: ["images"] });
//       }
//       if (!result.canceled && result.assets?.length) {
//         const uri = result.assets[0].uri;
//         setData((p) => p.map((it) => (it.id === id ? { ...it, photos: [...it.photos, uri] } : it)));
//         addPhotos(1);
//         Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
//       }
//     } catch {
//       Alert.alert("Error", "Could not open the camera or gallery.");
//     }
//   };

//   const attachPhoto = (id: string) => {
//     Alert.alert("Add defect photo", "Capture a new photo or pick one from your gallery.", [
//       { text: "Take photo", onPress: () => launchPicker("camera", id) },
//       { text: "Choose from gallery", onPress: () => launchPicker("library", id) },
//       { text: "Cancel", style: "cancel" },
//     ]);
//   };

//   const removePhoto = (id: string, uri: string) =>
//     setData((p) => p.map((it) => (it.id === id ? { ...it, photos: it.photos.filter((u) => u !== uri) } : it)));

//   const saveDraft = async () => {
//     console.log(user);
//     try {
//       setSaving(true);
//       Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
//       const sapDate = "/Date(" + Date.now() + ")/";
//       const payload = {
//         Lifnr: user?.vendorCode,
//         Name1: user?.vendorName,
//         ZsubDate: sapDate,
//         CreatedBy: user?.Email,
//         CreatedOn: sapDate,
//         ChangedBy: user?.Email,
//         ChangedOn: sapDate,
//         DraftFlag: "X",
//         CompletedFlag: " ",
//         Matnr: user?.matnr,
//         ZmouldItemSet: data.map((item) => ({
//           Lifnr: user?.vendorCode,
//           Name1: user?.vendorName,
//           ZsubDate: sapDate,
//           ZmouldCat: "02",
//           ZmouldCatIdH: "IM",
//           ZmouldHeadIdH: "H",
//           ZmouldColHead: "02",
//           ZmouldColId: code,
//           ZmouldColName: item.task.substring(0, 100),
//           ZmouldColVal1: (item.decision || " ").substring(0, 100),
//           ZmouldColVal2: (item.remarks || " ").substring(0, 100),
//           ZmouldColVal3: item.photos.length ? `${item.photos.length} photo(s)` : " ",
//         })),
//       };
//       const res = await axios.post("/submit", payload, { headers: { Prefer: "return=representation" } });
//       if (res.status === 200 || res.status === 201) {
//         Alert.alert("Draft saved", "Your progress has been securely saved.");
//       } else {
//         Alert.alert("Error", "Failed to save draft. Please try again.");
//       }
//     } catch {
//       Alert.alert("Network error", "Could not reach the server to save your draft.");
//     } finally {
//       setSaving(false);
//     }
//   };

//   if (loading) {
//     return (
//       <View style={styles.loader}>
//         <ActivityIndicator size="large" color={colors.brand} />
//         <Text style={styles.loaderText}>Loading checklist…</Text>
//       </View>
//     );
//   }

//   return (
//     <View style={styles.root}>
//       <StatusBar style="light" />

//       {/* HEADER */}
//       <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: insets.top + 10 }]}>
//         <View style={styles.headerRow}>
//           <TouchableOpacity onPress={() => setMenuOpen(true)} style={styles.headerBtn} activeOpacity={0.8}>
//             <Icons.List size={22} color="#fff" weight="bold" />
//           </TouchableOpacity>
//           <View style={styles.headerIcon}>{icon ?? <Icons.ClipboardText size={22} color="#fff" weight="fill" />}</View>
//           <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} activeOpacity={0.8}>
//             <Icons.X size={20} color="#fff" weight="bold" />
//           </TouchableOpacity>
//         </View>
//         <Text style={styles.title}>{title}</Text>
//         {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

//         {/* progress */}
//         <View style={styles.progressWrap}>
//           <View style={styles.progressTrack}>
//             <ProgressFill pct={pct} />
//           </View>
//           <Text style={styles.progressText}>{answered}/{total}</Text>
//         </View>
//       </LinearGradient>

//       {/* STAT STRIP */}
//       <View style={styles.stripWrap}>
//         <View style={[styles.strip, shadow.card]}>
//           <StripStat value={total} label="Total" color={colors.info} />
//           <View style={styles.stripDivider} />
//           <StripStat value={yes} label="Yes" color={colors.success} />
//           <View style={styles.stripDivider} />
//           <StripStat value={no} label="No" color={colors.danger} />
//         </View>
//       </View>

//       <Animated.ScrollView
//         showsVerticalScrollIndicator={false}
//         contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 110 }}
//       >
//         {data.length === 0 ? (
//           <EmptyState title="No checklist items" message="This module has no inspection points to fill." />
//         ) : (
//           data.map((item, index) => {
//             const isYes = item.decision === "Yes";
//             const isNo = item.decision === "No";
//             return (
//               <Animated.View
//                 key={item.id}
//                 entering={FadeInDown.delay(index * 40).duration(400)}
//                 layout={Layout.springify()}
//                 style={[
//                   styles.card,
//                   shadow.soft,
//                   isYes && { borderLeftColor: colors.success },
//                   isNo && { borderLeftColor: colors.danger },
//                 ]}
//               >
//                 <View style={styles.cardHead}>
//                   <Text style={styles.taskNo}>{index + 1}</Text>
//                   <Text style={styles.task}>{item.task}</Text>
//                   {(isYes || isNo || item.remarks) && (
//                     <TouchableOpacity onPress={() => reset(item.id)} hitSlop={8} style={styles.resetBtn}>
//                       <Icons.ArrowCounterClockwise size={16} color={colors.textMuted} weight="bold" />
//                     </TouchableOpacity>
//                   )}
//                 </View>

//                 <View style={styles.actionRow}>
//                   <View style={styles.segment}>
//                     <TouchableOpacity
//                       onPress={() => setDecision(item.id, "Yes")}
//                       style={[styles.segBtn, isYes && { backgroundColor: colors.success }]}
//                       activeOpacity={0.85}
//                     >
//                       <Icons.Check size={15} color={isYes ? "#fff" : colors.textMuted} weight="bold" />
//                       <Text style={[styles.segText, { color: isYes ? "#fff" : colors.textMuted }]}>Yes</Text>
//                     </TouchableOpacity>
//                     <TouchableOpacity
//                       onPress={() => setDecision(item.id, "No")}
//                       style={[styles.segBtn, isNo && { backgroundColor: colors.danger }]}
//                       activeOpacity={0.85}
//                     >
//                       <Icons.X size={15} color={isNo ? "#fff" : colors.textMuted} weight="bold" />
//                       <Text style={[styles.segText, { color: isNo ? "#fff" : colors.textMuted }]}>No</Text>
//                     </TouchableOpacity>
//                   </View>

//                   <View style={styles.remarks}>
//                     <Icons.NotePencil size={16} color={colors.textFaint} weight="duotone" />
//                     <TextInput
//                       placeholder="Add remarks…"
//                       placeholderTextColor={colors.textFaint}
//                       value={item.remarks}
//                       onChangeText={(v) => setRemarks(item.id, v)}
//                       style={styles.remarksInput}
//                     />
//                   </View>
//                 </View>

//                 {/* DEFECT PHOTOS — shown when the item is flagged "No" */}
//                 {isNo && (
//                   <Animated.View entering={FadeInDown.duration(300)} style={styles.photoSection}>
//                     <View style={styles.photoHeaderRow}>
//                       <Icons.Camera size={15} color={colors.danger} weight="fill" />
//                       <Text style={styles.photoHeader}>Defect evidence{item.photos.length ? ` (${item.photos.length})` : ""}</Text>
//                     </View>
//                     <View style={styles.photoGrid}>
//                       {item.photos.map((photo, pIdx) => (
//                         <View key={pIdx} style={styles.photoWrap}>
//                           {photo.type.startsWith('image/') ? (
//                             <Image source={{ uri: photo.uri }} style={styles.photoImg} />
//                           ) : (
//                             <View style={[styles.photoImg, { backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' }]}>
//                               <Icons.FilePdf size={32} color={colors.danger} />
//                               <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 4, paddingHorizontal: 4 }} numberOfLines={1}>{photo.name}</Text>
//                             </View>
//                           )}
//                           <TouchableOpacity onPress={() => removePhoto(item.id, photo.uri)} style={styles.photoRemove} activeOpacity={0.8}>
//                             <Icons.X size={14} color="#fff" weight="bold" />
//                           </TouchableOpacity>
//                         </View>
//                       ))}
//                       <TouchableOpacity onPress={() => attachPhoto(item.id)} style={styles.photoAdd} activeOpacity={0.8}>
//                         <Icons.Plus size={24} color={colors.textMuted} />
//                         <Text style={styles.photoAddText}>Attach</Text>
//                       </TouchableOpacity>
//                     </View>
//                   </Animated.View>
//                 )}
//               </Animated.View>
//             );
//           })
//         )}
//       </Animated.ScrollView>

//       {/* BOTTOM BAR */}
//       <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
//         <TouchableOpacity style={styles.menuBtn} activeOpacity={0.85} onPress={() => setMenuOpen(true)}>
//           <Icons.SquaresFour size={20} color={colors.brand} weight="bold" />
//           <Text style={styles.menuBtnText}>Modules</Text>
//         </TouchableOpacity>
//         <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.9} onPress={saveDraft} disabled={saving}>
//           <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveBtn}>
//             {saving ? (
//               <ActivityIndicator color="#fff" />
//             ) : (
//               <>
//                 <Icons.FloppyDisk size={19} color="#fff" weight="fill" />
//                 <Text style={styles.saveText}>Save Draft</Text>
//               </>
//             )}
//           </LinearGradient>
//         </TouchableOpacity>
//       </View>

//       <SidePane isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
//     </View>
//   );
// }

// function ProgressFill({ pct }: { pct: number }) {
//   const style = useAnimatedStyle(() => ({ width: withTiming(`${pct}%`, { duration: 350 }) }));
//   return <Animated.View style={[styles.progressFill, style]} />;
// }

// const StripStat = ({ value, label, color }: { value: number; label: string; color: string }) => (
//   <View style={styles.stripStat}>
//     <Text style={[styles.stripValue, { color }]}>{value}</Text>
//     <Text style={styles.stripLabel}>{label}</Text>
//   </View>
// );

// const styles = StyleSheet.create({
//   root: { flex: 1, backgroundColor: colors.bg },
//   loader: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg, gap: 12 },
//   loaderText: { color: colors.textMuted, fontWeight: font.medium },

//   header: {
//     paddingHorizontal: 16,
//     paddingBottom: 18,
//     borderBottomLeftRadius: 26,
//     borderBottomRightRadius: 26,
//   },
//   headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
//   headerBtn: { width: 40, height: 40, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
//   headerIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
//   title: { color: "#fff", fontSize: font.h3, fontWeight: font.black, marginTop: 14, letterSpacing: -0.3 },
//   subtitle: { color: "rgba(255,255,255,0.88)", fontSize: font.sub, fontWeight: font.medium, marginTop: 4 },
//   progressWrap: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 },
//   progressTrack: { flex: 1, height: 8, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.28)", overflow: "hidden" },
//   progressFill: { height: 8, borderRadius: 999, backgroundColor: "#fff" },
//   progressText: { color: "#fff", fontSize: font.caption, fontWeight: font.bold },

//   stripWrap: { paddingHorizontal: 16, marginTop: -14 },
//   strip: {
//     flexDirection: "row",
//     backgroundColor: colors.surface,
//     borderRadius: radius._20,
//     borderWidth: 1,
//     borderColor: colors.border,
//     paddingVertical: 12,
//   },
//   stripStat: { flex: 1, alignItems: "center" },
//   stripValue: { fontSize: 20, fontWeight: font.black },
//   stripLabel: { fontSize: font.micro, color: colors.textMuted, fontWeight: font.semibold, marginTop: 1 },
//   stripDivider: { width: 1, backgroundColor: colors.border, marginVertical: 4 },

//   card: {
//     backgroundColor: colors.surface,
//     borderRadius: radius._20,
//     borderWidth: 1,
//     borderColor: colors.border,
//     borderLeftWidth: 5,
//     borderLeftColor: colors.border,
//     padding: 14,
//     marginBottom: 12,
//   },
//   cardHead: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
//   taskNo: {
//     width: 24,
//     height: 24,
//     borderRadius: 8,
//     backgroundColor: colors.brandSoft,
//     color: colors.brand,
//     fontWeight: font.black,
//     fontSize: font.caption,
//     textAlign: "center",
//     lineHeight: 24,
//     overflow: "hidden",
//   },
//   task: { flex: 1, fontSize: font.body, fontWeight: font.semibold, color: colors.ink, lineHeight: 21 },
//   resetBtn: { padding: 6, borderRadius: 10, backgroundColor: colors.surfaceAlt },

//   actionRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 },
//   segment: { flexDirection: "row", backgroundColor: colors.surfaceAlt, borderRadius: 13, padding: 4, gap: 4 },
//   segBtn: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 4,
//     paddingHorizontal: 12,
//     height: 36,
//     borderRadius: 10,
//     justifyContent: "center",
//   },
//   segText: { fontSize: font.caption, fontWeight: font.bold },
//   remarks: {
//     flex: 1,
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 8,
//     backgroundColor: colors.surfaceAlt,
//     borderWidth: 1,
//     borderColor: colors.border,
//     borderRadius: 13,
//     height: 44,
//     paddingHorizontal: 12,
//   },
//   remarksInput: { flex: 1, fontSize: font.sub, color: colors.ink, fontWeight: font.medium, padding: 0 },

//   photoSection: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.divider },
//   photoHeaderRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
//   photoHeader: { fontSize: font.caption, fontWeight: font.bold, color: colors.danger, textTransform: "uppercase", letterSpacing: 0.3 },
//   photoStrip: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
//   thumbWrap: { width: 60, height: 60 },
//   thumb: { width: 60, height: 60, borderRadius: 12, backgroundColor: colors.surfaceAlt },
//   thumbRemove: {
//     position: "absolute",
//     top: -6,
//     right: -6,
//     width: 20,
//     height: 20,
//     borderRadius: 10,
//     backgroundColor: colors.danger,
//     alignItems: "center",
//     justifyContent: "center",
//     borderWidth: 2,
//     borderColor: "#fff",
//   },
//   addPhoto: {
//     width: 60,
//     height: 60,
//     borderRadius: 12,
//     borderWidth: 1.5,
//     borderStyle: "dashed",
//     borderColor: colors.danger,
//     backgroundColor: colors.dangerSoft,
//     alignItems: "center",
//     justifyContent: "center",
//     gap: 2,
//   },
//   addPhotoText: { fontSize: font.micro, fontWeight: font.bold, color: colors.danger },

//   bottomBar: {
//     position: "absolute",
//     bottom: 0,
//     left: 0,
//     right: 0,
//     flexDirection: "row",
//     gap: 12,
//     paddingHorizontal: 16,
//     paddingTop: 14,
//     backgroundColor: colors.surface,
//     borderTopWidth: 1,
//     borderTopColor: colors.border,
//   },
//   menuBtn: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 6,
//     paddingHorizontal: 16,
//     height: 52,
//     borderRadius: radius._17,
//     borderWidth: 1.5,
//     borderColor: colors.brandSoft2,
//     backgroundColor: colors.brandSoft,
//   },
//   menuBtnText: { color: colors.brand, fontWeight: font.bold, fontSize: font.body },
//   saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 52, borderRadius: radius._17 },
//   saveText: { color: "#fff", fontWeight: font.bold, fontSize: font.body },
// });
