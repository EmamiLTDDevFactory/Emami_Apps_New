import GlassChip from "@/components/ui/GlassChip";
import { colors, font, gradients, radius } from "@/constants/theme";
import { api, APP_DEPT, APP_VERSION } from "@/lib/config";
import { useBreakpoint } from "@/utils/responsive";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useGlobalSearchParams } from "expo-router";
import * as Icons from "phosphor-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

type SidePaneProps = { isOpen: boolean; onClose: () => void };

const ROUTE_MAP: Record<string, string> = {
  "VB": "/apps/mouldhealthcheck/VisualCheckModal",
  "CC": "/apps/mouldhealthcheck/CavityCoreCheck",
  "ES": "/apps/mouldhealthcheck/Ejection",
  "CS": "/apps/mouldhealthcheck/CoolingSystem",
  "FC": "/apps/mouldhealthcheck/CollapsibleCoreCheck",
  "HC": "/apps/mouldhealthcheck/HydraulicCheck",
  "MA": "/apps/mouldhealthcheck/MouldBase",
  "MC": "/apps/mouldhealthcheck/MechanismCheck",
  "NI": "/apps/mouldhealthcheck/ComponentQuality",
};

const getRoute = (item: any): string => {
  if (item.Zroute) {
    const parts = item.Zroute.split("/");
    const lastPart = parts[parts.length - 1];
    return `/apps/mouldhealthcheck/${lastPart}`;
  }
  if (item.ZmouldColId && ROUTE_MAP[item.ZmouldColId]) {
    return ROUTE_MAP[item.ZmouldColId];
  }
  
  // Fallback to text matching
  const text = String(item.label || item.name || item.ZmouldField || item.Zmouldfield || "").toLowerCase();
  if (text.includes("visual")) return "/apps/mouldhealthcheck/VisualCheckModal";
  if (text.includes("cavity")) return "/apps/mouldhealthcheck/CavityCoreCheck";
  if (text.includes("ejection")) return "/apps/mouldhealthcheck/Ejection";
  if (text.includes("cooling")) return "/apps/mouldhealthcheck/CoolingSystem";
  if (text.includes("collapsible")) return "/apps/mouldhealthcheck/CollapsibleCoreCheck";
  if (text.includes("hydraulic")) return "/apps/mouldhealthcheck/HydraulicCheck";
  if (text.includes("base")) return "/apps/mouldhealthcheck/MouldBase";
  if (text.includes("mechanism")) return "/apps/mouldhealthcheck/MechanismCheck";
  if (text.includes("component") || text.includes("quality")) return "/apps/mouldhealthcheck/ComponentQuality";
  if (text.includes("preventive")) return "/apps/mouldhealthcheck/Preventive";
  if (text.includes("spare")) return "/apps/mouldhealthcheck/SpareParts";
  if (text.includes("summary")) return "/apps/mouldhealthcheck/InspectionSummary";
  if (text.includes("inspect")) return "/apps/mouldhealthcheck/InjectMould";

  return "";
};

export default function SidePane({ isOpen, onClose }: SidePaneProps) {
  const { width } = useBreakpoint();
  const PANE_WIDTH = Math.min(width * 0.86, 360);

  const [paneData, setPaneData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const searchParams = useGlobalSearchParams();

  const translateX = useSharedValue(-PANE_WIDTH);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (isOpen) {
      translateX.value = withSpring(0, { damping: 20, stiffness: 120 });
      backdropOpacity.value = withTiming(1, { duration: 280 });
    } else {
      translateX.value = withTiming(-PANE_WIDTH, { duration: 280 });
      backdropOpacity.value = withTiming(0, { duration: 280 });
    }
  }, [isOpen, PANE_WIDTH]);

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const { data } = await api.get("/ZMM_MOULD_CARE_SRV/ZMouldHeaderSet", { params: { 
          "$filter": `ZmouldCatId eq 'IM' and ZmouldHeadId eq 'H'`,
          "$format": "json",
        } });
        setPaneData(Array.isArray(data) ? data : data?.d?.results || []);
      } catch {
        // leave empty
      } finally {
        setLoading(false);
      }
    };
    if (isOpen && paneData.length === 0) fetch();
  }, [isOpen]);

  // const go = (route: string) => {
  //   Haptics.selectionAsync();
  //   onClose();
  //   setTimeout(() => route && router.push(route as any), 160);
  // };

const go = (route: string) => {
  Haptics.selectionAsync();
  onClose();
  
  setTimeout(() => {
    if (route) {
      console.log("Navigating to route:", route, "with params:", searchParams);
      router.push({ pathname: route as any, params: searchParams as any }); 
    } else {
      console.log("Route is empty!");
    }
  }, 160);
};

  const paneStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));

  if (!isOpen && translateX.value === -PANE_WIDTH) return null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]} pointerEvents={isOpen ? "auto" : "none"}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[styles.pane, paneStyle, { width: PANE_WIDTH }]}>
        <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
          <View style={styles.headerTop}>
            <GlassChip size={46} tint="dark" style={styles.headerIcon}>
              <Icons.SquaresFour size={26} color="#fff" weight="fill" />
            </GlassChip>
            <TouchableOpacity onPress={onClose} activeOpacity={0.8}>
              <GlassChip size={34} tint="dark" style={styles.closeBtn}>
                <Icons.X size={18} color="#fff" weight="bold" />
              </GlassChip>
            </TouchableOpacity>
          </View>
          <Text style={styles.headerTitle}>Inspection modules</Text>
          <Text style={styles.headerSub}>Jump to any checklist</Text>
        </LinearGradient>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={[styles.item, styles.homeItem]} activeOpacity={0.8} onPress={() => go("/apps/mouldhealthcheck/(tabs)")}>
            <View style={[styles.itemIcon, { backgroundColor: colors.brandSoft }]}>
              <Icons.House size={20} color={colors.brand} weight="fill" />
            </View>
            <Text style={styles.itemText}>Back to Dashboard</Text>
            <Icons.CaretRight size={18} color={colors.textFaint} weight="bold" />
          </TouchableOpacity>

          <View style={styles.divider} />

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.brand} />
              <Text style={styles.loaderText}>Loading modules…</Text>
            </View>
          ) : paneData.length > 0 ? (
            paneData.map((item, i) => (
              <TouchableOpacity 
                key={i} 
                style={styles.item} 
                activeOpacity={0.8} 
                onPress={() => {
                  console.log("Clicked item:", item);
                  const route = getRoute(item);
                  if (route) {
                    go(route);
                  } else {
                    console.log("No matching route for item:", item);
                  }
                }}
              >
                <View style={styles.itemIcon}>
                  <Icons.ClipboardText size={18} color={colors.brand} weight="duotone" />
                </View>
                <Text style={styles.itemText} numberOfLines={2}>
                  {item.label || item.name || item.ZmouldField || item.Zmouldfield || `Module ${i + 1}`}
                </Text>
                <Icons.CaretRight size={18} color={colors.textFaint} weight="bold" />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.center}>
              <Icons.FolderDashed size={44} color={colors.textFaint} weight="duotone" />
              <Text style={styles.emptyText}>No modules available.</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.footerText}>v{APP_VERSION} · {APP_DEPT}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 999, elevation: 999 },
  backdrop: { backgroundColor: "rgba(28,28,40,0.55)" },
  pane: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.bg,
    borderTopRightRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
  },
  header: { paddingTop: Platform.OS === "ios" ? 56 : 44, paddingBottom: 22, paddingHorizontal: 20 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerIcon: { width: 46, height: 46, borderRadius: 15 },
  closeBtn: { width: 34, height: 34, borderRadius: 17 },
  headerTitle: { fontSize: 22, fontWeight: font.black, color: "#fff", marginTop: 16 },
  headerSub: { fontSize: font.sub, color: "rgba(255,255,255,0.85)", marginTop: 4, fontWeight: font.medium },
  scroll: { padding: 14, paddingBottom: 30 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
    borderRadius: radius._17,
  },
  homeItem: { backgroundColor: colors.brandSoft, borderColor: colors.brandSoft2 },
  itemIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: colors.brandSoft, alignItems: "center", justifyContent: "center" },
  itemText: { flex: 1, fontSize: font.body, fontWeight: font.bold, color: colors.textBody },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 8, marginHorizontal: 6 },
  center: { marginTop: 50, alignItems: "center", gap: 12 },
  loaderText: { color: colors.brand, fontWeight: font.semibold },
  emptyText: { color: colors.textMuted, fontSize: font.body, fontWeight: font.medium },
  footer: { paddingVertical: 16, borderTopWidth: 1, borderTopColor: colors.border, alignItems: "center" },
  footerText: { fontSize: font.caption, fontWeight: font.semibold, color: colors.textFaint },
});
