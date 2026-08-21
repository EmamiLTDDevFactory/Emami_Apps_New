import { File, Paths } from "expo-file-system";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import * as Icons from "phosphor-react-native";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, findNodeHandle, LayoutAnimation, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, UIManager, View } from "react-native";
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import EmaAssistant from "@/components/ui/EmaAssistant";
import GeoMap3D from "@/components/ui/GeoMap3D";
import ReportDetailsModal from "@/components/ui/ReportDetailsModal";
import SectionTitle from "@/components/ui/SectionTitle";
import StatTile from "@/components/ui/StatTile";
import { BarChart, GroupedBarChart, HorizontalBarChart3D, PieChart3D } from "@/components/ui/charts";
import { colors, font, radius, shadow } from "@/constants/theme";
import { api } from "@/lib/config";
import { SIDEBAR_WIDTH, useBreakpoint } from "@/utils/responsive";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- MOCK DATA ---
const MOCK_VENDORS = [
  { id: "V1001", name: "Alpha Moulding Corp", location: "Pune, MH" },
  { id: "V1002", name: "Precision Plastics", location: "Chennai, TN" },
  { id: "V1003", name: "Omega Tooling Services", location: "Delhi, NCR" },
  { id: "V1004", name: "Global Injectors Ltd", location: "Bangalore, KA" },
];

const MOCK_BRANDS = [
  { id: "B1", name: "Brand Premium" },
  { id: "B2", name: "Brand Standard" },
  { id: "B3", name: "Brand Economy" },
];

const MOCK_PRODUCTS = [
  { id: "P1", name: "Front Bumper Assembly", code: "PROD-FBA-01" },
  { id: "P2", name: "Dashboard Console", code: "PROD-DBC-02" },
  { id: "P3", name: "Door Trims", code: "PROD-DTM-03" },
  { id: "P4", name: "AC Vents", code: "PROD-ACV-04" },
];

const MOCK_REGIONS = [
  { id: "R1", name: "Domestic" },
  { id: "R2", name: "IBD" },
];

const MOCK_CATEGORIES = [
  { id: "C1", name: "Injection" },
  { id: "C2", name: "Cubic" },
  { id: "C3", name: "Core Back" },
];

const MOCK_CRITICALITIES = [
  { id: "CR1", name: "Major" },
  { id: "CR2", name: "Minor" },
  { id: "CR3", name: "Ok" },
  { id: "CR4", name: "Critical" },
];

const MOCK_MOLDS = [
  { moldCode: "MOLD-9001", moldDescription: "Front Bumper Mold A", status: "Running Asset", cost: 1250, region: "R1", category: "C1", criticality: "CR3" },
  { moldCode: "MOLD-9002", moldDescription: "Dashboard Console Mold", status: "Running Asset", cost: 3400, region: "R2", category: "C1", criticality: "CR1" },
  { moldCode: "MOLD-9003", moldDescription: "Door Trim Core", status: "NPA Asset", cost: 890, region: "R1", category: "C2", criticality: "CR2" },
  { moldCode: "MOLD-9004", moldDescription: "AC Vent Mold B", status: "Running Asset", cost: 5200, region: "R2", category: "C3", criticality: "CR4" },
  { moldCode: "MOLD-9005", moldDescription: "Inner Door Panel Mold", status: "NPA Asset", cost: 1100, region: "R1", category: "C1", criticality: "CR2" },
  { moldCode: "MOLD-9006", moldDescription: "Steering Wheel Mold", status: "NPA Asset", cost: 2300, region: "R2", category: "C2", criticality: "CR3" },
];

const MOCK_PURCHASE_ORDERS = [
  { id: "PO-2024-001", date: "2024-07-01", vendorId: "V1001", entity: "Alpha", amount: 15400, status: "Fulfilled" },
  { id: "PO-2024-002", date: "2024-07-05", vendorId: "V1001", entity: "Alpha", amount: 2300, status: "Pending" },
  { id: "PO-2024-003", date: "2024-07-12", vendorId: "V1002", entity: "Precision", amount: 8900, status: "Fulfilled" },
  { id: "PO-2024-004", date: "2024-07-15", vendorId: "V1003", entity: "Omega", amount: 12000, status: "Cancelled" },
  { id: "PO-2024-005", date: "2024-07-20", vendorId: "V1004", entity: "Global", amount: 4500, status: "Fulfilled" },
  { id: "PO-2024-006", date: "2024-07-22", entity: "Premium", amount: 5600, status: "Pending" },
  { id: "PO-2024-007", date: "2024-07-25", entity: "Standard", amount: 3200, status: "Fulfilled" },
  { id: "PO-2024-008", date: "2024-08-01", entity: "FBA", amount: 9800, status: "Fulfilled" },
  { id: "PO-2024-009", date: "2024-08-03", entity: "DBC", amount: 1500, status: "Pending" },
  { id: "PO-2024-010", date: "2024-08-04", entity: "MAT-9001", amount: 4000, status: "Fulfilled" },
  { id: "PO-2024-011", date: "2024-08-05", entity: "MAT-9004", amount: 1200, status: "Pending" },
  { id: "PO-2024-012", date: "2024-08-10", vendorId: "V1001", entity: "Alpha", amount: 4500, status: "Fulfilled" },
  { id: "PO-2024-013", date: "2024-08-11", vendorId: "V1001", entity: "Alpha", amount: 7200, status: "Fulfilled" },
  { id: "PO-2024-014", date: "2024-08-12", vendorId: "V1001", entity: "Alpha", amount: 1800, status: "Pending" },
  { id: "PO-2024-015", date: "2024-08-15", vendorId: "V1002", entity: "Precision", amount: 9300, status: "Fulfilled" },
  { id: "PO-2024-016", date: "2024-08-16", vendorId: "V1002", entity: "Precision", amount: 4100, status: "Cancelled" },
  { id: "PO-2024-017", date: "2024-08-18", vendorId: "V1003", entity: "Omega", amount: 5600, status: "Fulfilled" },
  { id: "PO-2024-018", date: "2024-08-20", vendorId: "V1003", entity: "Omega", amount: 11000, status: "Pending" },
  { id: "PO-2024-019", date: "2024-08-21", vendorId: "V1004", entity: "Global", amount: 8900, status: "Fulfilled" },
  { id: "PO-2024-020", date: "2024-08-25", vendorId: "V1004", entity: "Global", amount: 13500, status: "Fulfilled" },
  { id: "PO-2024-021", date: "2024-08-26", vendorId: "V1004", entity: "Global", amount: 2400, status: "Pending" },
  { id: "PO-2024-022", date: "2024-08-28", vendorId: "V1001", entity: "Alpha", amount: 5000, status: "Pending" },
  { id: "PO-2024-023", date: "2024-08-30", vendorId: "V1002", entity: "Precision", amount: 6200, status: "Fulfilled" },
];

// --- TYPES ---
type DrillState = {
  // Component/Part is now the top of every drill-down on this page — selected before Brand/Vendor.
  compPart?: any | null;
  vendor?: any | null;
  brand?: any | null;
  product?: any | null;
  region?: any | null;
  regionType?: "Domestic" | "International" | null;
  moldCategory?: any | null;
  assetType?: "Running Asset" | "NPA Asset" | null;
  criticality?: any | null;
  moldDetail?: any | null;
  material?: any | null;
};

// --- 3D HOVER ANIMATION WRAPPER ---
const Hover3DWrapper = ({ children, onPress, style, tooltipText, setGlobalTooltip, hoverScale = 1.05 }: any) => {
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);
  const viewRef = useRef<View>(null);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { translateY: translateY.value }
      ],
    };
  });

  return (
    <Pressable
      onPress={onPress}
      // @ts-ignore
      onHoverIn={() => {
        scale.value = withSpring(hoverScale, { damping: 10, stiffness: 200 });
        translateY.value = withSpring(-8, { damping: 10, stiffness: 200 });

        if (tooltipText && setGlobalTooltip) {
          viewRef.current?.measureInWindow((x, y, width, height) => {
            setGlobalTooltip({ visible: true, text: tooltipText, x: x + width + 5, y: y + height / 2 - 15 });
          });
        }
      }}
      onHoverOut={() => {
        scale.value = withSpring(1);
        translateY.value = withSpring(0);
        if (tooltipText && setGlobalTooltip) {
          setGlobalTooltip(null);
        }
      }}
      onPressIn={() => {
        scale.value = withSpring(0.95);
        translateY.value = withSpring(4);
      }}
      onPressOut={() => {
        scale.value = withSpring(1);
        translateY.value = withSpring(0);
      }}
    >
      <Animated.View ref={viewRef} style={[style, animatedStyle]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

// --- CHART DRILLDOWN LEGEND CHIP ---
// Small tappable summary chip rendered alongside the real GroupedBarChart —
// preserves the "tap an entity to open its Running/NPA detail modal" + hover
// tooltip behavior that the old hand-rolled Stacked3DBar/StackedGroupedChart
// cylinder bars used to provide per-bar, now that the bars themselves are
// drawn by one shared <GroupedBarChart /> instead of one component per entity.
const ChartLegendChip = ({ label, val1, val2, onPress, setGlobalTooltip }: any) => {
  return (
    <Hover3DWrapper onPress={onPress} tooltipText={`Running: ${val1} | NPA: ${val2}`} setGlobalTooltip={setGlobalTooltip} hoverScale={1.03}>
      <View style={styles.chartLegendChip}>
        <Text style={styles.chartLegendChipLabel} numberOfLines={1}>{label}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
          <Text style={{ fontSize: 10, fontWeight: '800', color: colors.success }}>{val1} Run</Text>
          <Text style={{ fontSize: 10, fontWeight: '800', color: colors.danger }}>{val2} NPA</Text>
        </View>
      </View>
    </Hover3DWrapper>
  );
};

// --- UTILS & ACCORDION ---
const groupBy = (array: any[], key: string) => {
  return array.reduce((result: any, currentValue: any) => {
    (result[currentValue[key]] = result[currentValue[key]] || []).push(currentValue);
    return result;
  }, {});
};

/**
 * Groups already-flattened material rows (allMolds shape) into per-entity Running/NPA/Acquisition/
 * Depreciation totals — used to re-derive Brands/Vendors Overview scoped to a Component/Part
 * selection, without touching the original groupedBrands/groupedVendors (still used elsewhere for
 * the System Overview widget, dropdowns, and Portfolio Insights charts).
 */
const groupByEntity = (materials: any[], keyField: string, nameField?: string) => {
  const groups: Record<string, { id: string; name: string; running: number; npa: number; totalCost: number; totalDepreciation: number; materials: any[] }> = {};
  materials.forEach((m: any) => {
    const key = m[keyField];
    if (!key) return;
    if (!groups[key]) {
      groups[key] = { id: key, name: (nameField ? m[nameField] : key) || key, running: 0, npa: 0, totalCost: 0, totalDepreciation: 0, materials: [] };
    }
    if (m.status === "Running Asset") groups[key].running += 1; else groups[key].npa += 1;
    groups[key].totalCost += m.cost || 0;
    groups[key].totalDepreciation += Math.abs(m.depreciation || 0);
    groups[key].materials.push(m);
  });
  return Object.values(groups);
};

/** Ranks Brands/Vendors Overview entities by Acquisition Value first, Running count as tie-breaker. */
const rankByRunningAndValue = (entities: any[]) => [...entities].sort((a, b) => (b.totalCost - a.totalCost) || (b.running - a.running));

/** Mold category code -> display name (C1/C2/C3 -> Injection/Cubic/Core Back). */
const CATEGORY_DISPLAY_NAMES: Record<string, string> = { C1: "Injection", C2: "Cubic", C3: "Core Back" };

/** Compact ₹ formatter (Cr/L/k) — was duplicated inline on the Cost/Depreciation-by-Vendor BarCharts. */
const formatINR = (v: number) => {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)}Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(2)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}k`;
  return `₹${Math.round(v)}`;
};

/**
 * Single source of truth for Running vs NPA — mutually exclusive and exhaustive (every asset is
 * exactly one or the other), based on ZRUNNING. Every running/NPA/total count in this file (Brands
 * Overview, Vendors Overview, System Overview hero stats, drill-down panels, Organizational
 * Overview, Portfolio Insights) must derive from THIS, not from independent ZRUNNING/ZNPA checks —
 * those can double-count (both flags 'X') or undercount (neither flag 'X') a row, which is exactly
 * why running/NPA/total counts used to disagree between different parts of the dashboard.
 */
const getMoldStatus = (asset: any): "Running Asset" | "NPA Asset" =>
  (asset.ZRUNNING || asset.Zrunning) === "X" ? "Running Asset" : "NPA Asset";

/**
 * Full per-material detail fields (runner, grade, mould life/shots, remaining life/shots, etc.)
 * shared by groupedVendors, groupedBrands and allMolds so every material list — the Brand/Vendor
 * drill-down AND the chart-tap popup — carries the same rich fields for MaterialsTable.
 */
const mapMaterialDetailFields = (asset: any) => ({
  region: asset.VendRegion || asset.VENDREGION || "Unknown",
  country: asset.Country || asset.COUNTRY || "IN",
  runner: asset.Zzrunner || "02",
  grade: asset.Zzgran || "09",
  runningCav: asset.ZzrunCavity || "00016",
  efficiency: asset.ZzfacProd || asset.Zzefficiency || asset.Efficiency || "0.95",
  hoursDay: asset.ZzhoursDay || "22.00",
  designCode: asset.ZzmdsCode || asset.Zzmdscode || asset.ZzdesignCode || asset.DesignCode || "0000000017",
  designDescription: asset.Description || asset.DESCRIPTION || asset.description || "",
  mouldLife: asset.ZzmoldLife || asset.ZzmouldLife || asset.MouldLife || "5",
  mouldShots: asset.ZzmoldShots || asset.ZzmouldShots || asset.MouldShots || ".1995",
  remainingLife: asset.RemLife || asset.Remlife || asset.REMLIFE || "N/A",
  remainingShots: asset.RemShots || asset.Remshots || asset.REMSHOTS || "N/A",
  inspectionCount: parseInt(asset.ZinspCount || asset.ZInspCount || asset.ZINSPCOUNT || asset.Zinspcount || "0", 10) || 0,
  criticality: asset.Zcriticality || asset.ZCriticality || asset.ZCRITICALITY || "Unspecified",
  lastInspectionDate: asset.ZlastInsp || asset.ZLastInsp || asset.ZLASTINSP || asset.Zlastinsp || "",
  businessArea: asset.Zbusiness || asset.ZBusiness || asset.ZBUSINESS || "",
  // Component/Part description — the new top-level grouping for every filter & drill-down on this
  // page (added ahead of Brand/Vendor, not replacing them).
  compPart: asset.CompPart || asset.COMPPART || asset.Comppart || "Unspecified",
});

/** Domestic/International is driven by Zbusiness, not country: business area '03' = International, everything else = Domestic. */
const isInternationalMold = (m: any) => m.businessArea === "03";

/** Parses a SAP OData date — either the `/Date(1690000000000)/` wire format or a plain ISO/date string. */
const parseSapDate = (value: any): Date | null => {
  if (!value) return null;
  if (typeof value === "string" && value.startsWith("/Date(")) {
    const ms = parseInt(value.replace(/[^0-9]/g, ""), 10);
    return Number.isFinite(ms) ? new Date(ms) : null;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** A mould counts as "at risk" once either its remaining life% or remaining shots% drops to 20% or below. */
const AT_RISK_THRESHOLD = 0.2;
const isAtRiskMold = (m: any) => {
  const life = parseFloat(m.remainingLife);
  const lifeTotal = parseFloat(m.mouldLife);
  const shots = parseFloat(m.remainingShots);
  const shotsTotal = parseFloat(m.mouldShots);
  const lifePct = Number.isFinite(life) && Number.isFinite(lifeTotal) && lifeTotal > 0 ? life / lifeTotal : null;
  const shotsPct = Number.isFinite(shots) && Number.isFinite(shotsTotal) && shotsTotal > 0 ? shots / shotsTotal : null;
  return (lifePct !== null && lifePct <= AT_RISK_THRESHOLD) || (shotsPct !== null && shotsPct <= AT_RISK_THRESHOLD);
};

/** A material has been inspected if it has at least one submitted inspection (ZinspCount &gt; 0). */
const isInspectedMold = (m: any) => (m.inspectionCount || 0) > 0;

/** True once a material's last inspection (ZlastInsp) is older than the staleness threshold, or it has none at all. */
const INSPECTION_STALE_DAYS = 90;
const isInspectionStale = (m: any) => {
  const date = parseSapDate(m.lastInspectionDate);
  if (!date) return true;
  const ageDays = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
  return ageDays > INSPECTION_STALE_DAYS;
};

// --- FUTURISTIC ACCORDION COLOR SCHEME ---
const LEVEL_ACCENTS = [
  { gradient: ['#6366F1', '#8B5CF6'], glow: 'rgba(99,102,241,0.25)', bg: 'rgba(99,102,241,0.06)', icon: '#6366F1' },  // L0: Indigo-Violet
  { gradient: ['#0EA5E9', '#06B6D4'], glow: 'rgba(14,165,233,0.25)', bg: 'rgba(14,165,233,0.06)', icon: '#0EA5E9' },  // L1: Sky-Cyan
  { gradient: ['#F59E0B', '#F97316'], glow: 'rgba(245,158,11,0.25)', bg: 'rgba(245,158,11,0.06)', icon: '#F59E0B' },  // L2: Amber-Orange
  { gradient: ['#10B981', '#34D399'], glow: 'rgba(16,185,129,0.25)', bg: 'rgba(16,185,129,0.06)', icon: '#10B981' },  // L3: Emerald-Teal
  { gradient: ['#EC4899', '#F43F5E'], glow: 'rgba(236,72,153,0.25)', bg: 'rgba(236,72,153,0.06)', icon: '#EC4899' },  // L4: Pink-Rose
];

const AccordionNode = ({ title, subtitle, value, depr, isExpanded, onToggle, children, level = 0, isMaterial = false, statusColor, materialData, searchKey, searchValue, onSearchChange, entityLabel, entityCount, runningCount, npaCount }: any) => {
  const accent = LEVEL_ACCENTS[Math.min(level, LEVEL_ACCENTS.length - 1)];
  const materialAccent = isMaterial
    ? (statusColor === 'Running Asset' ? { color: '#10B981', bg: 'rgba(16,185,129,0.12)', glow: 'rgba(16,185,129,0.3)' } : { color: '#F43F5E', bg: 'rgba(244,63,94,0.12)', glow: 'rgba(244,63,94,0.3)' })
    : null;

  return (
    <View style={{ marginBottom: 10, paddingLeft: level * 20 }}>
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={onToggle}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 0,
          borderRadius: 16,
          backgroundColor: isExpanded ? (isMaterial ? materialAccent?.bg : accent.bg) : '#FFFFFF',
          borderWidth: 1,
          borderColor: isExpanded ? (isMaterial ? materialAccent?.color : accent.gradient[0]) + '30' : 'rgba(0,0,0,0.06)',
          shadowColor: isExpanded ? (isMaterial ? materialAccent?.color : accent.gradient[0]) : '#000',
          shadowOffset: { width: 0, height: isExpanded ? 8 : 3 },
          shadowOpacity: isExpanded ? 0.15 : 0.05,
          shadowRadius: isExpanded ? 20 : 10,
          elevation: isExpanded ? 8 : 3,
          overflow: 'hidden',
        }}
      >
        {/* Vibrant left accent bar */}
        <LinearGradient
          colors={isMaterial ? [materialAccent?.color || '#10B981', materialAccent?.color || '#10B981'] : accent.gradient as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ width: 5, alignSelf: 'stretch', borderTopLeftRadius: 16, borderBottomLeftRadius: 16 }}
        />

        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16 }}>
          {isMaterial ? (
            <View style={{
              width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
              backgroundColor: materialAccent?.bg,
              borderWidth: 1,
              borderColor: (materialAccent?.color || '') + '25',
            }}>
              <Icons.Cube size={18} color={materialAccent?.color} weight="duotone" />
            </View>
          ) : (
            <View style={{
              width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
              backgroundColor: accent.bg,
            }}>
              <Icons.CaretRight
                size={16}
                color={accent.icon}
                weight="bold"
                style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}
              />
            </View>
          )}

          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#111827', letterSpacing: 0.2 }}>{title}</Text>
            {subtitle && <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 3, fontWeight: '600' }}>{subtitle}</Text>}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end', flex: 1.5 }}>
            {entityLabel && (
              <View style={{
                alignItems: 'flex-end',
                backgroundColor: 'rgba(99,102,241,0.08)',
                paddingHorizontal: 10, paddingVertical: 6,
                borderRadius: 10,
              }}>
                <Text style={{ fontSize: 9, color: '#4F46E5', textTransform: 'uppercase', fontWeight: '900', letterSpacing: 0.8 }}>Total {entityLabel}</Text>
                <Text style={{ fontSize: 14, fontWeight: '900', color: '#4F46E5', marginTop: 1 }}>{entityCount}</Text>
              </View>
            )}
            {runningCount !== undefined && (
              <View style={{
                alignItems: 'flex-end',
                backgroundColor: 'rgba(16,185,129,0.08)',
                paddingHorizontal: 10, paddingVertical: 6,
                borderRadius: 10,
              }}>
                <Text style={{ fontSize: 9, color: '#059669', textTransform: 'uppercase', fontWeight: '900', letterSpacing: 0.8 }}>Running</Text>
                <Text style={{ fontSize: 14, fontWeight: '900', color: '#059669', marginTop: 1 }}>{runningCount}</Text>
              </View>
            )}
            {npaCount !== undefined && (
              <View style={{
                alignItems: 'flex-end',
                backgroundColor: 'rgba(244,63,94,0.08)',
                paddingHorizontal: 10, paddingVertical: 6,
                borderRadius: 10,
              }}>
                <Text style={{ fontSize: 9, color: '#E11D48', textTransform: 'uppercase', fontWeight: '900', letterSpacing: 0.8 }}>NPA</Text>
                <Text style={{ fontSize: 14, fontWeight: '900', color: '#E11D48', marginTop: 1 }}>{npaCount}</Text>
              </View>
            )}
            {value !== undefined && (
              <View style={{
                alignItems: 'flex-end',
                backgroundColor: 'rgba(14,165,233,0.08)',
                paddingHorizontal: 10, paddingVertical: 6,
                borderRadius: 10,
              }}>
                <Text style={{ fontSize: 9, color: '#0284C7', textTransform: 'uppercase', fontWeight: '900', letterSpacing: 0.8 }}>Acquisition</Text>
                <Text style={{ fontSize: 14, fontWeight: '900', color: '#0284C7', marginTop: 1 }}>₹{value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
              </View>
            )}
            {depr !== undefined && (
              <View style={{
                alignItems: 'flex-end',
                backgroundColor: 'rgba(245,158,11,0.08)',
                paddingHorizontal: 10, paddingVertical: 6,
                borderRadius: 10,
              }}>
                <Text style={{ fontSize: 9, color: '#D97706', textTransform: 'uppercase', fontWeight: '900', letterSpacing: 0.8 }}>Depreciation</Text>
                <Text style={{ fontSize: 14, fontWeight: '900', color: '#D97706', marginTop: 1 }}>₹{Math.abs(depr).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>

      {isExpanded && isMaterial && materialData && (
        <View style={{
          marginTop: 10,
          padding: 24,
          backgroundColor: colors.ink,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: 'rgba(99,102,241,0.2)',
          shadowColor: '#6366F1',
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.15,
          shadowRadius: 24,
          elevation: 10,
        }}>
          {/* Section Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
            <View style={{ width: 4, height: 20, backgroundColor: '#6366F1', borderRadius: 4, marginRight: 10 }} />
            <Text style={{ fontSize: 13, fontWeight: '900', color: '#E2E8F0', textTransform: 'uppercase', letterSpacing: 1.5 }}>Asset Details</Text>
          </View>

          {/* Key Values - Glass Cards */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Category', val: materialData.category === 'C1' ? 'Injection' : materialData.category === 'C2' ? 'Cubic' : 'Core Back', color: '#8B5CF6' },
              { label: 'Acq. Date', val: materialData.acqDate, color: '#0EA5E9' },
              { label: 'Acq. Year', val: materialData.acqYear, color: '#06B6D4' },
              { label: 'Acq. Value', val: `₹${materialData.cost.toLocaleString('en-IN')}`, color: '#10B981' },
              { label: 'Depreciation', val: `₹${Math.abs(materialData.depreciation).toLocaleString('en-IN')}`, color: '#F43F5E' },
            ].map((item, idx) => (
              <View key={idx} style={{
                flex: 1, minWidth: '30%',
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderRadius: 14,
                padding: 14,
                borderWidth: 1,
                borderColor: item.color + '25',
              }}>
                <Text style={{ fontSize: 9, color: item.color, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{item.label}</Text>
                <Text style={{ fontSize: 14, color: '#F1F5F9', fontWeight: '800' }}>{item.val}</Text>
              </View>
            ))}
          </View>

          {/* Separator */}
          <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 20 }} />

          {/* Info Badges */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            {[
              { icon: Icons.ChartBar, label: materialData.category === 'C1' ? '01' : '02', color: '#8B5CF6' },
              { icon: Icons.GridFour, label: `${materialData.runningCav || '00016'} cav`, color: '#0EA5E9' },
              { icon: Icons.Timer, label: '9.50s', color: '#F59E0B' },
            ].map((badge, idx) => (
              <View key={idx} style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: badge.color + '18',
                paddingHorizontal: 14, paddingVertical: 8,
                borderRadius: 24,
                borderWidth: 1,
                borderColor: badge.color + '30',
              }}>
                <badge.icon size={14} color={badge.color} weight="bold" />
                <Text style={{ fontSize: 12, fontWeight: '800', color: badge.color, marginLeft: 8 }}>{badge.label}</Text>
              </View>
            ))}
          </View>

          {/* Stats Grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {[
              { label: 'Runner', val: materialData.runner || '02', color: '#6366F1' },
              { label: 'Grade', val: materialData.grade || '09', color: '#EC4899' },
              { label: 'Running Cav.', val: materialData.runningCav || '00016', color: '#0EA5E9' },
              { label: 'Efficiency', val: materialData.efficiency || '0.95', color: '#10B981' },
              { label: 'Hours / Day', val: materialData.hoursDay || '22.00', color: '#F59E0B' },
              { label: 'Design Code', val: materialData.designCode || '0000000017', color: '#8B5CF6' },
              { label: 'Design Description', val: materialData.designDescription || 'N/A', color: '#A855F7' },
              { label: 'Mould Life', val: materialData.mouldLife || '5', color: '#06B6D4' },
              { label: 'Mould Shots', val: materialData.mouldShots || '.1995', color: '#F43F5E' },
            ].map((stat, idx) => (
              <View key={idx} style={{
                flex: 1, minWidth: '22%',
                backgroundColor: 'rgba(255,255,255,0.04)',
                borderRadius: 12,
                padding: 12,
                borderLeftWidth: 3,
                borderLeftColor: stat.color,
              }}>
                <Text style={{ fontSize: 9, color: stat.color + 'CC', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5 }}>{stat.label}</Text>
                <Text style={{ fontSize: 14, color: '#F1F5F9', fontWeight: '800' }}>{stat.val}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {isExpanded && !isMaterial && children && (
        <View style={{
          marginTop: 8,
          borderLeftWidth: 2,
          borderLeftColor: accent.gradient[0] + '40',
          marginLeft: 14,
          paddingLeft: 4,
        }}>
          {searchKey && (
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              marginTop: 8, marginBottom: 14,
              borderRadius: 14, paddingVertical: 10, paddingHorizontal: 16,
              marginHorizontal: 8,
              backgroundColor: accent.bg,
              borderWidth: 1,
              borderColor: accent.gradient[0] + '20',
            }}>
              <Icons.MagnifyingGlass size={16} color={accent.icon} />
              <TextInput
                style={[styles.searchInput, { fontSize: 13, color: '#111827' }]}
                placeholder={`Search ${title}...`}
                placeholderTextColor={'#9CA3AF'}
                value={searchValue || ''}
                onChangeText={(text) => onSearchChange(searchKey, text)}
              />
              {searchValue ? (
                <TouchableOpacity onPress={() => onSearchChange(searchKey, "")}>
                  <Icons.XCircle size={16} color={accent.icon} weight="fill" />
                </TouchableOpacity>
              ) : null}
            </View>
          )}
          {children}
        </View>
      )}
    </View>
  );
};

/**
 * One brand or vendor's Running/NPA/Acquisition/Depreciation summary — real data from
 * groupedBrands/groupedVendors (ZVendDashboardSet). Tapping opens the existing Cost Analysis
 * drill-down (Brand/Vendor → Vendor/Brand → Category → Running/NPA → Material, with full
 * material details) pre-expanded to this entity, via onPress.
 */
const EntityOverviewCard = ({
  entity,
  icon: Icon,
  accentIndex,
  isSelected,
  onPress,
}: {
  entity: { name: string; running: number; npa: number; totalCost: number; totalDepreciation: number };
  icon: Icons.Icon;
  accentIndex: number;
  isSelected?: boolean;
  onPress: () => void;
}) => {
  const accent = LEVEL_ACCENTS[accentIndex % LEVEL_ACCENTS.length];
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.boxCard3D,
        shadow.soft,
        { width: 270, padding: 16, alignItems: "flex-start", borderLeftWidth: 4, borderLeftColor: accent.icon },
        isSelected && { borderWidth: 2, borderColor: accent.icon, backgroundColor: accent.icon + "0D" },
      ]}
    >
      <View style={{ width: "100%", flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 14 }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: accent.icon + "26", alignItems: "center", justifyContent: "center" }}>
          <Icon size={20} color={accent.icon} weight="duotone" />
        </View>
        <Text style={{ flex: 1, fontSize: font.body, fontWeight: font.black, color: colors.ink }} numberOfLines={2}>
          {entity.name}
        </Text>
        {isSelected ? (
          <View style={{ backgroundColor: accent.icon, borderRadius: radius.pill, width: 20, height: 20, alignItems: "center", justifyContent: "center", marginTop: 2 }}>
            <Icons.Check size={12} color="#fff" weight="bold" />
          </View>
        ) : (
          <Icons.CaretRight size={16} color={colors.textFaint} weight="bold" style={{ marginTop: 3 }} />
        )}
      </View>
      <View style={{ width: "100%", flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        <View style={{ width: "47%" }}>
          <Text style={styles.brandMetricLabel}>Running</Text>
          <Text style={[styles.brandMetricValue, { color: colors.success }]}>{entity.running}</Text>
        </View>
        <View style={{ width: "47%" }}>
          <Text style={styles.brandMetricLabel}>NPA</Text>
          <Text style={[styles.brandMetricValue, { color: colors.danger }]}>{entity.npa}</Text>
        </View>
        <View style={{ width: "47%" }}>
          <Text style={styles.brandMetricLabel}>Acquisition Value</Text>
          <Text style={styles.brandMetricValue}>{formatINR(entity.totalCost)}</Text>
        </View>
        <View style={{ width: "47%" }}>
          <Text style={styles.brandMetricLabel}>Depreciation</Text>
          <Text style={styles.brandMetricValue}>{formatINR(entity.totalDepreciation)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

/** Column set for the compact materials table — one row per material, every field its own column. */
const MATERIAL_COLUMNS: { key: string; label: string; width: number; get: (m: any) => string }[] = [
  { key: "description", label: "Material", width: 170, get: (m) => m.moldDescription || m.description || "Unnamed material" },
  { key: "moldCode", label: "Code", width: 100, get: (m) => String(m.moldCode ?? "") },
  { key: "cost", label: "Acquisition Value", width: 110, get: (m) => formatINR(m.cost || 0) },
  { key: "depreciation", label: "Depreciation", width: 110, get: (m) => formatINR(Math.abs(m.depreciation || 0)) },
  { key: "assetNumber", label: "Asset No.", width: 90, get: (m) => String(m.assetNumber ?? "") },
  { key: "acqYear", label: "Acq. Year", width: 80, get: (m) => String(m.acqYear ?? "") },
  { key: "category", label: "Category", width: 90, get: (m) => CATEGORY_DISPLAY_NAMES[m.category] || m.category || "" },
  { key: "region", label: "Region", width: 80, get: (m) => String(m.region ?? "") },
  { key: "country", label: "Country", width: 70, get: (m) => String(m.country ?? "") },
  { key: "runner", label: "Runner", width: 70, get: (m) => String(m.runner ?? "") },
  { key: "grade", label: "Grade", width: 70, get: (m) => String(m.grade ?? "") },
  { key: "runningCav", label: "Running Cavity", width: 100, get: (m) => String(m.runningCav ?? "") },
  { key: "efficiency", label: "Efficiency", width: 80, get: (m) => String(m.efficiency ?? "") },
  { key: "hoursDay", label: "Hours / Day", width: 80, get: (m) => String(m.hoursDay ?? "") },
  { key: "mouldLife", label: "Mould Life", width: 80, get: (m) => String(m.mouldLife ?? "") },
  { key: "mouldShots", label: "Mould Shots", width: 90, get: (m) => String(m.mouldShots ?? "") },
  { key: "remainingLife", label: "Remaining Life", width: 100, get: (m) => String(m.remainingLife ?? "") },
  { key: "remainingShots", label: "Remaining Shots", width: 110, get: (m) => String(m.remainingShots ?? "") },
  { key: "designCode", label: "Design Code", width: 100, get: (m) => String(m.designCode ?? "") },
  { key: "designDescription", label: "Design Description", width: 170, get: (m) => String(m.designDescription ?? "") },
  { key: "criticality", label: "Criticality", width: 100, get: (m) => String(m.criticality ?? "") },
  { key: "inspectionCount", label: "Inspections", width: 90, get: (m) => String(m.inspectionCount ?? 0) },
  { key: "lastInspectionDate", label: "Last Inspected", width: 110, get: (m) => { const d = parseSapDate(m.lastInspectionDate); return d ? d.toLocaleDateString("en-IN") : "Never"; } },
];

/**
 * Compact materials table — one row per material, every field its own column, Running/NPA badge
 * per row. Status/Material/Code are frozen on the left (rendered outside the horizontal
 * ScrollView, as a separate non-scrolling block) so you never lose track of which material a row
 * belongs to while scrolling through the remaining 20+ columns.
 */
const MaterialsTable = ({ materials }: { materials: any[] }) => {
  const frozenCols = MATERIAL_COLUMNS.slice(0, 2); // Material, Code — Status is handled separately below
  const scrollCols = MATERIAL_COLUMNS.slice(2);
  return (
    <View style={{ flexDirection: "row", width: "100%" }}>
      <View style={styles.materialTableFrozen}>
        <View style={styles.materialTableHeaderRow}>
          <Text style={[styles.materialTableHeaderCell, { width: 70 }]}>Status</Text>
          {frozenCols.map((col) => (
            <Text key={col.key} style={[styles.materialTableHeaderCell, { width: col.width }]}>{col.label}</Text>
          ))}
        </View>
        {materials.map((m, idx) => {
          const isRunning = m.status === "Running Asset";
          return (
            <View key={`frozen-${m.moldCode}-${idx}`} style={styles.materialTableRow}>
              <View style={{ width: 70, flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={[styles.materialStatusDot, { marginTop: 0, backgroundColor: isRunning ? colors.success : colors.danger }]} />
                <View style={[styles.materialStatusPill, { backgroundColor: isRunning ? colors.successSoft : colors.dangerSoft }]}>
                  <Text style={{ color: isRunning ? colors.success : colors.danger, fontSize: 9, fontWeight: font.black }}>{isRunning ? "Running" : "NPA"}</Text>
                </View>
              </View>
              {frozenCols.map((col) => (
                <Text key={col.key} style={[styles.materialTableCell, { width: col.width }]} numberOfLines={2}>{col.get(m) || "—"}</Text>
              ))}
            </View>
          );
        })}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator nestedScrollEnabled style={{ flex: 1 }}>
        <View>
          <View style={styles.materialTableHeaderRow}>
            {scrollCols.map((col) => (
              <Text key={col.key} style={[styles.materialTableHeaderCell, { width: col.width }]}>{col.label}</Text>
            ))}
          </View>
          {materials.map((m, idx) => (
            <View key={`scroll-${m.moldCode}-${idx}`} style={styles.materialTableRow}>
              {scrollCols.map((col) => (
                <Text key={col.key} style={[styles.materialTableCell, { width: col.width }]} numberOfLines={2}>{col.get(m) || "—"}</Text>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

/** Single horizontal bar split into a remaining (green) segment and a used-up (red) segment — no numbers, just the visual split. */
const RemainingUsedBar = ({ label, remaining, total }: { label: string; remaining: number; total: number }) => {
  const safeTotal = total > 0 ? total : Math.max(remaining, 1);
  const remainingPct = Math.max(0, Math.min(1, remaining / safeTotal));
  const usedPct = 1 - remainingPct;
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.materialChartSubtitle}>{label}</Text>
      <View style={[styles.meterTrack, { flexDirection: "row", marginTop: 6 }]}>
        <View style={{ width: `${remainingPct * 100}%`, height: "100%", backgroundColor: colors.success }} />
        <View style={{ width: `${usedPct * 100}%`, height: "100%", backgroundColor: colors.danger }} />
      </View>
    </View>
  );
};

/** One material's Mould Life and Mould Shots bars, shown side by side (parallel), each split remaining/used. */
const MaterialLifeShotsChart = ({ material }: { material: any }) => {
  const remainingLife = parseFloat(material.remainingLife);
  const totalLife = parseFloat(material.mouldLife);
  const remainingShots = parseFloat(material.remainingShots);
  const totalShots = parseFloat(material.mouldShots);
  return (
    <View style={styles.materialChartCard}>
      <Text style={styles.materialChartTitle} numberOfLines={1}>{material.moldDescription || material.description || "Unnamed material"}</Text>
      <Text style={styles.materialChartSubtitle} numberOfLines={1}>Code: {material.moldCode}</Text>
      <View style={{ flexDirection: "row", gap: 14, marginTop: 10 }}>
        <RemainingUsedBar
          label="Mould Life"
          remaining={Number.isFinite(remainingLife) ? remainingLife : 0}
          total={Number.isFinite(totalLife) ? totalLife : 0}
        />
        <RemainingUsedBar
          label="Mould Shots"
          remaining={Number.isFinite(remainingShots) ? remainingShots : 0}
          total={Number.isFinite(totalShots) ? totalShots : 0}
        />
      </View>
    </View>
  );
};

/** Row of per-material Remaining Life/Shots bar charts, one card per material, horizontally scrollable. */
const MaterialLifeShotsCharts = ({ materials }: { materials: any[] }) => (
  <View style={{ marginTop: 18 }}>
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <Text style={styles.drilldownSectionLabel}>Remaining Life & Shots (per material)</Text>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success }} />
          <Text style={styles.materialChartSubtitle}>Remaining</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger }} />
          <Text style={styles.materialChartSubtitle}>Used</Text>
        </View>
      </View>
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, marginTop: 10 }}>
      {materials.map((m, idx) => (
        <MaterialLifeShotsChart key={`${m.moldCode}-${idx}`} material={m} />
      ))}
    </ScrollView>
  </View>
);

/** Ranks all materials by lowest remaining% (remaining/total) for the given fields, most at-risk first. */
const useRankedByRemaining = (materials: any[], remainingKey: string, totalKey: string) =>
  React.useMemo(() => {
    return materials
      .map((m) => {
        const remaining = parseFloat(m[remainingKey]);
        const total = parseFloat(m[totalKey]);
        if (!Number.isFinite(remaining) || !Number.isFinite(total) || total <= 0) return null;
        return { material: m, pct: Math.max(0, Math.min(1, remaining / total)) };
      })
      .filter((r): r is { material: any; pct: number } => r !== null)
      .sort((a, b) => a.pct - b.pct);
  }, [materials, remainingKey, totalKey]);

const AT_RISK_PAGE_SIZES = [5, 10, 20, 50];

/** At-risk moulds card — lowest remaining life or remaining shots first, each as a green(remaining)/red(used) bar. Shows every Running Asset, paginated with a user-selectable page size. */
const TopAtRiskCard = ({ title, materials, remainingKey, totalKey }: { title: string; materials: any[]; remainingKey: string; totalKey: string }) => {
  const ranked = useRankedByRemaining(materials, remainingKey, totalKey);
  const [pageSize, setPageSize] = useState(5);
  const [page, setPage] = useState(0);
  // Reset to page 1 the instant the page size changes — done synchronously during render (the
  // React-endorsed "adjust state when something else changed" pattern) rather than in a useEffect,
  // so there's no extra render where the old page index briefly pairs with the new page size and
  // shows the wrong range before catching up.
  const prevPageSizeRef = React.useRef(pageSize);
  if (prevPageSizeRef.current !== pageSize) {
    prevPageSizeRef.current = pageSize;
    if (page !== 0) setPage(0);
  }
  const totalPages = Math.max(1, Math.ceil(ranked.length / pageSize));
  const clampedPage = Math.min(page, totalPages - 1);
  React.useEffect(() => {
    if (page !== clampedPage) setPage(clampedPage);
  }, [clampedPage]);
  const pageItems = ranked.slice(clampedPage * pageSize, clampedPage * pageSize + pageSize);
  const rangeStart = ranked.length === 0 ? 0 : clampedPage * pageSize + 1;
  const rangeEnd = Math.min(ranked.length, clampedPage * pageSize + pageSize);

  return (
    <View style={[styles.boxCard3D, shadow.soft, { flex: 1, minWidth: 320, padding: 20, alignSelf: "flex-start" }]}>
      <Text style={styles.insightCardTitle}>{title}</Text>
      <View style={styles.atRiskPageSizeRow}>
        <Text style={styles.atRiskPageSizeLabel}>Show per page</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {AT_RISK_PAGE_SIZES.map((size) => (
            <TouchableOpacity
              key={size}
              onPress={() => setPageSize(size)}
              style={[styles.atRiskPageSizeBtn, pageSize === size && styles.atRiskPageSizeBtnActive]}
            >
              <Text style={[styles.atRiskPageSizeBtnText, pageSize === size && styles.atRiskPageSizeBtnTextActive]}>{size}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {ranked.length === 0 ? (
        <Text style={[styles.materialChartSubtitle, { marginTop: 10 }]}>No data available</Text>
      ) : (
        <>
          <View style={{ marginTop: 14, gap: 14 }}>
            {pageItems.map((r, idx) => {
              const path = [r.material.brandName, r.material.subBrandName, r.material.vendorName]
                .filter((p) => p && p !== "Unknown")
                .join(" › ");
              return (
                <View key={`${clampedPage}-${idx}-${r.material.moldCode || ""}-${r.material.vendorId || r.material.vendorName || ""}`}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                    <Text numberOfLines={1} style={{ flex: 1, fontSize: font.sub, fontWeight: font.bold, color: colors.ink }}>
                      {clampedPage * pageSize + idx + 1}. {r.material.moldDescription || r.material.description || "Unnamed material"}
                    </Text>
                    <Text style={{ fontSize: font.micro, color: colors.textMuted, fontWeight: font.semibold }}>{r.material.moldCode}</Text>
                  </View>
                  {!!path && (
                    <Text numberOfLines={1} style={[styles.materialChartSubtitle, { marginTop: 2 }]}>{path}</Text>
                  )}
                  <View style={[styles.meterTrack, { flexDirection: "row", marginTop: 6 }]}>
                    <View style={{ width: `${r.pct * 100}%`, height: "100%", backgroundColor: colors.success }} />
                    <View style={{ width: `${(1 - r.pct) * 100}%`, height: "100%", backgroundColor: colors.danger }} />
                  </View>
                </View>
              );
            })}
          </View>

          <View style={styles.atRiskPaginationRow}>
            <Text style={styles.atRiskPaginationLabel}>{rangeStart}–{rangeEnd} of {ranked.length}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <TouchableOpacity
                disabled={clampedPage === 0}
                onPress={() => setPage((p) => Math.max(0, p - 1))}
                style={[styles.atRiskPageNavBtn, clampedPage === 0 && styles.atRiskPageNavBtnDisabled]}
              >
                <Icons.CaretLeft size={14} color={clampedPage === 0 ? colors.textFaint : colors.ink} weight="bold" />
              </TouchableOpacity>
              <Text style={styles.atRiskPaginationLabel}>Page {clampedPage + 1} of {totalPages}</Text>
              <TouchableOpacity
                disabled={clampedPage >= totalPages - 1}
                onPress={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                style={[styles.atRiskPageNavBtn, clampedPage >= totalPages - 1 && styles.atRiskPageNavBtnDisabled]}
              >
                <Icons.CaretRight size={14} color={clampedPage >= totalPages - 1 ? colors.textFaint : colors.ink} weight="bold" />
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </View>
  );
};

/**
 * One compact coverage chip — label + "X/Y <metric> (%)" + a thin two-tone bar. Tappable when
 * onPress is given, to drill the rows below it down to just this value. `variant` controls which
 * side of the bar is the "highlighted" count: "positive" (default, e.g. inspected) shows it in
 * green; "negative" (e.g. at-risk) shows it in red instead, with the remainder in green.
 */
const InspectionCoverageChip = ({
  label,
  inspected,
  total,
  selected,
  onPress,
  metricLabel = "inspected",
  variant = "positive",
  secondaryCount,
  secondaryLabel,
}: {
  label: string;
  inspected: number;
  total: number;
  selected?: boolean;
  onPress?: () => void;
  metricLabel?: string;
  variant?: "positive" | "negative";
  /** Optional second metric (e.g. at-risk count) shown as a small extra line, so one chip can carry two related counts without a second filter row. */
  secondaryCount?: number;
  secondaryLabel?: string;
}) => {
  const pct = total > 0 ? inspected / total : 0;
  const highlightColor = variant === "negative" ? colors.danger : colors.success;
  const restColor = variant === "negative" ? colors.successSoft : colors.dangerSoft;
  const hasRisk = secondaryCount !== undefined && secondaryCount > 0;
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      {...(onPress ? { activeOpacity: 0.8, onPress } : {})}
      style={[styles.inspectionChip, hasRisk && styles.inspectionChipAtRisk, selected && styles.inspectionChipSelected]}
    >
      {selected && (
        <View style={styles.inspectionChipCheck}>
          <Icons.Check size={10} color="#fff" weight="bold" />
        </View>
      )}
      <Text style={styles.inspectionChipLabel} numberOfLines={2}>{label}</Text>
      <Text style={styles.inspectionChipValue}>{inspected}/{total} {metricLabel} ({Math.round(pct * 100)}%)</Text>
      {secondaryCount !== undefined && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: -6, marginBottom: 8 }}>
          {hasRisk && <Icons.Warning size={11} color={colors.danger} weight="fill" />}
          <Text style={[styles.inspectionChipValue, { color: hasRisk ? colors.danger : colors.textFaint }]}>
            {secondaryCount}/{total} {secondaryLabel}
          </Text>
        </View>
      )}
      <View style={[styles.inspectionChipTrack, { flexDirection: "row" }]}>
        <View style={{ width: `${pct * 100}%`, height: "100%", backgroundColor: highlightColor }} />
        <View style={{ width: `${(1 - pct) * 100}%`, height: "100%", backgroundColor: restColor }} />
      </View>
    </Wrapper>
  );
};

/**
 * One Inspection Overview breakdown dimension (By Brand / By Vendor / ...) — a compact
 * horizontally-scrollable row of coverage chips, with a search box to jump to a specific one when
 * there are many. When `onSelect` is given, tapping a chip drills the rows below it down to just
 * that value (tapping the same chip again clears it) — `selectedKey` highlights the active one.
 */
const InspectionDimensionRow = ({
  title,
  items,
  selectedKey,
  onSelect,
  metricLabel,
  variant,
  secondaryLabel,
}: {
  title: string;
  items: { key: string; label: string; total: number; inspected: number; atRisk?: number }[];
  selectedKey?: string | null;
  onSelect?: (key: string) => void;
  metricLabel?: string;
  variant?: "positive" | "negative";
  /** When items carry an `atRisk` count, pass a label (e.g. "at risk") to show it as a second line on every chip. */
  secondaryLabel?: string;
}) => {
  const [search, setSearch] = useState("");
  const filtered = search.trim() ? items.filter((it) => it.label.toLowerCase().includes(search.trim().toLowerCase())) : items;
  return (
    <View style={{ marginTop: 18 }}>
      <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={styles.inspectionDimensionLabel}>{title}</Text>
          {!!selectedKey && !!onSelect && (
            <TouchableOpacity onPress={() => onSelect(selectedKey)} style={styles.inspectionDimensionClear}>
              <Text style={styles.inspectionDimensionClearText}>{selectedKey} ✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.inspectionDimensionSearch}>
          <Icons.MagnifyingGlass size={13} color={colors.textFaint} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={`Search ${title.replace(/^By /, "").toLowerCase()}...`}
            placeholderTextColor={colors.textFaint}
            style={styles.inspectionDimensionSearchInput}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
              <Icons.XCircle size={13} color={colors.textFaint} weight="fill" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      {filtered.length === 0 ? (
        <Text style={{ marginTop: 10, fontSize: font.sub, color: colors.textFaint }}>No match for "{search}".</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, marginTop: 8, paddingBottom: 2 }}>
          {filtered.map((it) => (
            <InspectionCoverageChip
              key={it.key}
              label={it.label}
              inspected={it.inspected}
              total={it.total}
              selected={!!onSelect && selectedKey === it.key}
              onPress={onSelect ? () => onSelect(it.key) : undefined}
              metricLabel={metricLabel}
              variant={variant}
              secondaryCount={secondaryLabel ? it.atRisk : undefined}
              secondaryLabel={secondaryLabel}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
};

/**
 * Highlighted Running / NPA / Acquisition Value / Depreciation stat chips — used both inline on
 * each Sub Brand / Vendor row (compact) and as a bigger summary strip for the currently selected
 * drill-down scope (large), so these totals are clearly visible at every level instead of being
 * buried in small gray text.
 */
const DrilldownStatChips = ({ running, npa, cost, depreciation, large = false }: { running: number; npa: number; cost: number; depreciation: number; large?: boolean }) => (
  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: large ? 10 : 6, marginTop: large ? 12 : 4 }}>
    <View style={[styles.rowStatChip, large && styles.rowStatChipLarge, { backgroundColor: colors.successSoft }]}>
      <Text style={[styles.rowStatChipText, large && styles.rowStatChipTextLarge, { color: colors.success }]}>{running} Running</Text>
    </View>
    <View style={[styles.rowStatChip, large && styles.rowStatChipLarge, { backgroundColor: colors.dangerSoft }]}>
      <Text style={[styles.rowStatChipText, large && styles.rowStatChipTextLarge, { color: colors.danger }]}>{npa} NPA</Text>
    </View>
    <View style={[styles.rowStatChip, large && styles.rowStatChipLarge, { backgroundColor: colors.infoSoft }]}>
      <Text style={[styles.rowStatChipText, large && styles.rowStatChipTextLarge, { color: colors.info }]}>Value {formatINR(cost)}</Text>
    </View>
    <View style={[styles.rowStatChip, large && styles.rowStatChipLarge, { backgroundColor: colors.warningSoft }]}>
      <Text style={[styles.rowStatChipText, large && styles.rowStatChipTextLarge, { color: colors.warning }]}>Depr. {formatINR(Math.abs(depreciation))}</Text>
    </View>
  </View>
);

/** All material fields as a CSV string (Excel-compatible), Status + every MATERIAL_COLUMNS field, one row per material. */
const materialsToCSV = (materials: any[]) => {
  const escape = (v: any) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const headers = ["Status", ...MATERIAL_COLUMNS.map((c) => c.label)];
  const rows = materials.map((m) => [
    m.status === "Running Asset" ? "Running" : "NPA",
    ...MATERIAL_COLUMNS.map((c) => c.get(m)),
  ]);
  return [headers, ...rows].map((row) => row.map(escape).join(",")).join("\n");
};

/** Downloads a CSV (opens directly in Excel) on web; saves to the app's document directory on native. */
const exportMaterialsToExcel = async (materials: any[], filename: string) => {
  const csv = materialsToCSV(materials);
  if (Platform.OS === "web") {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }
  try {
    const file = new File(Paths.document, `${filename}.csv`);
    file.create({ overwrite: true });
    file.write(csv);
    Alert.alert("Exported", `Saved to ${file.uri}`);
  } catch {
    Alert.alert("Export failed", "Could not save the file.");
  }
};

/** Opens a print-ready HTML table of the materials in a new tab (web only) and triggers the browser print dialog. */
const printMaterials = (materials: any[], title: string) => {
  if (Platform.OS !== "web") {
    Alert.alert("Print", "Printing is only available on web.");
    return;
  }
  const headers = ["Status", ...MATERIAL_COLUMNS.map((c) => c.label)];
  const escapeHtml = (v: any) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const rowsHtml = materials
    .map((m) => {
      const cells = [m.status === "Running Asset" ? "Running" : "NPA", ...MATERIAL_COLUMNS.map((c) => c.get(m) || "—")];
      return `<tr>${cells.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`;
    })
    .join("");
  const html = `<!DOCTYPE html><html><head><title>${escapeHtml(title)}</title><style>
    body { font-family: -apple-system, Arial, sans-serif; padding: 24px; }
    h1 { font-size: 18px; margin-bottom: 16px; }
    table { border-collapse: collapse; width: 100%; font-size: 11px; }
    th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; white-space: nowrap; }
    th { background: #f3f4f6; text-transform: uppercase; font-size: 9px; }
  </style></head><body>
    <h1>${escapeHtml(title)}</h1>
    <table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rowsHtml}</tbody></table>
  </body></html>`;
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
};

/** Export Excel + Print buttons shown next to a material list's "N Materials" header. */
const MaterialListActions = ({ materials, exportName, printTitle }: { materials: any[]; exportName: string; printTitle: string }) => (
  <View style={{ flexDirection: "row", gap: 8 }}>
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => exportMaterialsToExcel(materials, exportName)}
      style={[styles.listActionBtn, { backgroundColor: colors.successSoft }]}
    >
      <Icons.FileXls size={14} color={colors.success} weight="bold" />
      <Text style={[styles.listActionBtnText, { color: colors.success }]}>Export Excel</Text>
    </TouchableOpacity>
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => printMaterials(materials, printTitle)}
      style={[styles.listActionBtn, { backgroundColor: colors.infoSoft }]}
    >
      <Icons.Printer size={14} color={colors.info} weight="bold" />
      <Text style={[styles.listActionBtnText, { color: colors.info }]}>Print</Text>
    </TouchableOpacity>
  </View>
);

/**
 * Inline (no modal) Brand/Vendor drill-down: tapping an EntityOverviewCard opens this panel right
 * below the tile grid — sub-group breakdown (Vendor within a Brand, or Brand within a Vendor),
 * then tapping a sub-group reveals its full material list (Running/NPA + master details).
 * Sourced from `allMolds` (real ZVendDashboardSet data) so every field — not just the subset
 * carried on groupedBrands/groupedVendors — is available for the material detail view.
 */
const EntityDrilldownPanel = ({
  sectionLabel,
  entityId,
  entityDisplayName,
  mode,
  allMolds,
  onClose,
}: {
  sectionLabel: string;
  /** Filter key: brand name for Brand mode, vendor LIFNR for Vendor mode. */
  entityId: string;
  /** Human-readable label shown in the breadcrumb (same as entityId for brands; the vendor's name for vendors). */
  entityDisplayName: string;
  mode: "Brand" | "Vendor";
  allMolds: any[];
  onClose: () => void;
}) => {
  // Brand mode inserts an extra Sub Brand level (from SubBrandDesc) between the brand and its
  // vendor breakdown: Brand -> Sub Brand -> Vendor -> Material. Vendor mode is unchanged: Vendor -> Brand -> Material.
  const [subBrandKey, setSubBrandKey] = useState<string | null>(null);
  const [subGroupKey, setSubGroupKey] = useState<string | null>(null);

  const materials = React.useMemo(
    () => allMolds.filter((m) => (mode === "Brand" ? m.brandName === entityId : m.vendorId === entityId)),
    [allMolds, mode, entityId]
  );

  const entityTotals = React.useMemo(() => ({
    running: materials.filter((m) => m.status === "Running Asset").length,
    npa: materials.filter((m) => m.status === "NPA Asset").length,
    cost: materials.reduce((s, m) => s + (m.cost || 0), 0),
    depreciation: materials.reduce((s, m) => s + (m.depreciation || 0), 0),
  }), [materials]);

  const subBrandGroups = React.useMemo(() => {
    if (mode !== "Brand") return [];
    const grouped = groupBy(materials, "subBrandName");
    return Object.entries(grouped).map(([key, items]: any) => ({
      key,
      name: key && key !== "undefined" ? key : "Unspecified",
      materials: items,
      running: items.filter((m: any) => m.status === "Running Asset").length,
      npa: items.filter((m: any) => m.status === "NPA Asset").length,
      cost: items.reduce((s: number, m: any) => s + (m.cost || 0), 0),
      depreciation: items.reduce((s: number, m: any) => s + (m.depreciation || 0), 0),
    }));
  }, [materials, mode]);

  const activeSubBrand = subBrandGroups.find((g) => g.key === subBrandKey) || null;
  const materialsInScope = mode === "Brand" ? (activeSubBrand ? activeSubBrand.materials : []) : materials;

  const subGroups = React.useMemo(() => {
    const grouped = groupBy(materialsInScope, mode === "Brand" ? "vendorId" : "brandName");
    return Object.entries(grouped).map(([key, items]: any) => ({
      key,
      name: mode === "Brand" ? (items[0]?.vendorName || `Vendor ${key}`) : key,
      materials: items,
      running: items.filter((m: any) => m.status === "Running Asset").length,
      npa: items.filter((m: any) => m.status === "NPA Asset").length,
      cost: items.reduce((s: number, m: any) => s + (m.cost || 0), 0),
      depreciation: items.reduce((s: number, m: any) => s + (m.depreciation || 0), 0),
    }));
  }, [materialsInScope, mode]);

  const activeSubGroup = subGroups.find((g) => g.key === subGroupKey) || null;
  const subBrandLabel = "Sub Brand";
  const subGroupLabel = mode === "Brand" ? "Vendor" : "Brand";

  const goToRoot = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSubBrandKey(null);
    setSubGroupKey(null);
  };
  const goToSubBrand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSubGroupKey(null);
  };

  return (
    <Animated.View entering={FadeInDown.duration(250)} style={[styles.boxCard3D, shadow.soft, styles.drilldownPanel]}>
      <View style={styles.drilldownBreadcrumb}>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.drilldownCrumbLink}>{sectionLabel}</Text>
        </TouchableOpacity>
        <Icons.CaretRight size={13} color={colors.textFaint} />
        <TouchableOpacity
          onPress={goToRoot}
          disabled={!activeSubBrand && !activeSubGroup}
        >
          <Text style={(activeSubBrand || activeSubGroup) ? styles.drilldownCrumbLink : styles.drilldownCrumbActive} numberOfLines={1}>{entityDisplayName}</Text>
        </TouchableOpacity>
        {mode === "Brand" && !!activeSubBrand && (
          <>
            <Icons.CaretRight size={13} color={colors.textFaint} />
            <TouchableOpacity onPress={goToSubBrand} disabled={!activeSubGroup}>
              <Text style={activeSubGroup ? styles.drilldownCrumbLink : styles.drilldownCrumbActive} numberOfLines={1}>{activeSubBrand.name}</Text>
            </TouchableOpacity>
          </>
        )}
        {!!activeSubGroup && (
          <>
            <Icons.CaretRight size={13} color={colors.textFaint} />
            <Text style={styles.drilldownCrumbActive} numberOfLines={1}>{activeSubGroup.name}</Text>
          </>
        )}
        <TouchableOpacity onPress={onClose} style={{ marginLeft: "auto", padding: 4 }}>
          <Icons.X size={18} color={colors.textMuted} weight="bold" />
        </TouchableOpacity>
      </View>

      {/* Highlighted Running/NPA/Value/Depreciation totals for whatever scope is currently in view —
          the whole entity at the root, the selected sub brand, or the selected vendor/brand. */}
      <DrilldownStatChips
        large
        running={(activeSubGroup ?? activeSubBrand ?? entityTotals).running}
        npa={(activeSubGroup ?? activeSubBrand ?? entityTotals).npa}
        cost={(activeSubGroup ?? activeSubBrand ?? entityTotals).cost}
        depreciation={(activeSubGroup ?? activeSubBrand ?? entityTotals).depreciation}
      />

      {mode === "Brand" && !activeSubBrand ? (
        <View style={{ width: "100%", gap: 10, marginTop: 14 }}>
          <Text style={styles.drilldownSectionLabel}>{subBrandGroups.length} {subBrandLabel}{subBrandGroups.length === 1 ? "" : "s"}</Text>
          {subBrandGroups.map((g) => (
            <TouchableOpacity
              key={g.key}
              activeOpacity={0.85}
              onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setSubBrandKey(g.key); }}
              style={styles.drilldownRow}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.drilldownRowTitle} numberOfLines={1}>{g.name}</Text>
                <DrilldownStatChips running={g.running} npa={g.npa} cost={g.cost} depreciation={g.depreciation} />
              </View>
              <Icons.CaretRight size={16} color={colors.textFaint} weight="bold" />
            </TouchableOpacity>
          ))}
        </View>
      ) : !activeSubGroup ? (
        <View style={{ width: "100%", gap: 10, marginTop: 14 }}>
          <Text style={styles.drilldownSectionLabel}>{subGroups.length} {subGroupLabel}{subGroups.length === 1 ? "" : "s"}</Text>
          {subGroups.map((g) => (
            <TouchableOpacity
              key={g.key}
              activeOpacity={0.85}
              onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setSubGroupKey(g.key); }}
              style={styles.drilldownRow}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.drilldownRowTitle} numberOfLines={1}>{g.name}</Text>
                <DrilldownStatChips running={g.running} npa={g.npa} cost={g.cost} depreciation={g.depreciation} />
              </View>
              <Icons.CaretRight size={16} color={colors.textFaint} weight="bold" />
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={{ width: "100%", marginTop: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <Text style={styles.drilldownSectionLabel}>{activeSubGroup.materials.length} Material{activeSubGroup.materials.length === 1 ? "" : "s"}</Text>
            <MaterialListActions
              materials={activeSubGroup.materials}
              exportName={`${entityDisplayName}-${activeSubGroup.name}-materials`.replace(/[^a-z0-9-]+/gi, "_")}
              printTitle={`${entityDisplayName} — ${activeSubGroup.name} — Materials`}
            />
          </View>
          <View style={{ marginTop: 10 }}>
            <MaterialsTable materials={activeSubGroup.materials} />
          </View>
          <MaterialLifeShotsCharts materials={activeSubGroup.materials} />
        </View>
      )}
    </Animated.View>
  );
};

export default function AdminDashboardScreen() {
  const insets = useSafeAreaInsets();
  const { width, isTabletUp } = useBreakpoint();
  const isTablet = isTabletUp;

  const numColumns = isTabletUp ? 3 : 2;
  const gap = 12;
  const paddingHorizontal = 40;
  const availableWidth = width - paddingHorizontal - (gap * (numColumns - 1));
  const tileWidth = availableWidth / numColumns;

  const iconSize = isTablet ? 36 : 28;
  const iconWrapSize = isTablet ? 64 : 50;

  const [state, setState] = useState<DrillState>({ vendor: null, brand: null, product: null, region: null, moldCategory: null, assetType: null, criticality: null, moldDetail: null });
  const [hierarchyMode, setHierarchyMode] = useState<"Vendor-wise" | "Brand-wise">("Vendor-wise");
  const [search, setSearch] = useState({ compPart: "", vendor: "", brand: "", product: "", region: "", moldCategory: "", criticality: "", moldDetail: "" });

  const [chartDetail, setChartDetail] = useState<any>(null);
  const [globalTooltip, setGlobalTooltip] = useState<{ visible: boolean, text: string, x: number, y: number } | null>(null);

  const [vendorAssetsData, setVendorAssetsData] = useState<any[]>([]);
  // Gates the entire dashboard behind a real loading screen until the first API response (success
  // or failure) comes back — before that, groupedVendors/groupedBrands/allMolds fall back to
  // MOCK_* data, which must never be shown to the user as if it were real.
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchVendorData = async () => {
      try {
        // Property names below are the confirmed ZVendDashboardSet property list (given directly,
        // not guessed) — Zinspid is deliberately excluded, it isn't a real property on this entity.
        // VendCity/Znpa are included even though this file doesn't read them itself — GeoMap3D
        // consumes this same vendorAssetsData array and needs both (city plotting, its own NPA check).
        // ZinspCount/Zcriticality/ZlastInsp (lowercase after Z, matching every other custom field in
        // this list) are the actual OData property names — SAP's Gateway rejects ANY unrecognized
        // $select property with a 400 ("Resource not found for the segment") that fails the ENTIRE
        // request, not just that field, so a wrong casing here previously took down the whole
        // dashboard's real data (silently falling back to mock data) rather than just these 3 fields.
        // ZlastInsp can still carry the ABAP zero-date "00000000" on some records, which the Gateway
        // can't serialize as Edm.DateTime — if that ever fails the whole response, the real fix is in
        // SAP (clean up the bad date or have the model treat blank/zero ABAP dates as null).
        const vendDashboardSelect = [
          'Lifnr', 'Name1', 'Matnr', 'Maktx', 'Kansw', 'Knafa', 'Zrunning', 'Znpa',
          'BrandDesc', 'SubBrandDesc', 'VendRegion', 'Country', 'VendCity', 'Anln1', 'Zujhr', 'Aibdt',
          'ZzmoldCat', 'Zzrunner', 'Zzgran', 'ZzrunCavity', 'ZzfacProd', 'ZzhoursDay', 'ZzmdsCode',
          'Description', 'ZzmoldLife', 'ZzmoldShots', 'RemLife', 'RemShots',
          'ZinspCount', 'Zcriticality', 'Zbusiness', 'ZlastInsp', 'CompPart'
        ].join(',');
        const res = await api.get('/ZMM_MOULD_CARE_SRV/ZVendDashboardSet', {
          params: { '$select': vendDashboardSelect, '$format': 'json' },
        });
        console.log(res)
        setVendorAssetsData(res.data?.d?.results || []);
      } catch (err) {
        console.error("Failed to fetch vendor dashboard data", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchVendorData();
  }, []);

  //console.log('Response', res.data?.d?.dashboardData);
  const groupedVendors = React.useMemo(() => {
    if (vendorAssetsData.length === 0) return [];
    const groups: Record<string, { id: string, name: string, running: number, npa: number, totalCost: number, totalDepreciation: number, materials: any[] }> = {};
    vendorAssetsData.forEach(asset => {
      const lifnr = asset.LIFNR || asset.Lifnr;
      const name1 = asset.NAME1 || asset.Name1;
      const status = getMoldStatus(asset);
      const matnr = asset.MATNR || asset.Matnr;
      const maktx = asset.MAKTX || asset.Maktx;
      const kansw = parseFloat(asset.KANSW || asset.Kansw || "0");
      const knafa = parseFloat(asset.KNAFA || asset.Knafa || "0");

      if (!lifnr) return; // Skip if no valid vendor ID

      if (!groups[lifnr]) {
        groups[lifnr] = { id: lifnr, name: name1 || `Vendor ${lifnr}`, running: 0, npa: 0, totalCost: 0, totalDepreciation: 0, materials: [] };
      }
      if (status === 'Running Asset') groups[lifnr].running += 1; else groups[lifnr].npa += 1;
      groups[lifnr].totalCost += kansw;
      groups[lifnr].totalDepreciation += Math.abs(knafa);
      groups[lifnr].materials.push({
        moldCode: matnr,
        description: maktx,
        status,
        cost: kansw,
        assetNumber: asset.ANLN1 || asset.Anln1 || "N/A",
        acqYear: asset.ZUJHR || asset.Zujhr || "N/A",
        acqDate: asset.AIBDT || asset.Aibdt || "N/A",
        depreciation: parseFloat(asset.KNAFA || asset.Knafa || "0"),
        brandName: asset.BRANDDESC || asset.BrandDesc || asset.Branddesc || asset.brandDesc || "Unknown",
        vendorId: lifnr,
        vendorName: name1,
        category: `C${asset.ZzmoldCat || "1"}`,
        ...mapMaterialDetailFields(asset),
      });
    });
    return Object.values(groups);
  }, [vendorAssetsData]);

  const groupedBrands = React.useMemo(() => {
    if (vendorAssetsData.length === 0) return [];
    const groups: Record<string, { id: string, name: string, running: number, npa: number, totalCost: number, totalDepreciation: number, materials: any[] }> = {};
    vendorAssetsData.forEach(asset => {
      const brandDesc = asset.BRANDDESC || asset.BrandDesc || asset.Branddesc || asset.brandDesc;
      if (!brandDesc) return;

      const status = getMoldStatus(asset);
      const matnr = asset.MATNR || asset.Matnr;
      const maktx = asset.MAKTX || asset.Maktx;
      const kansw = parseFloat(asset.KANSW || asset.Kansw || "0");
      const knafa = parseFloat(asset.KNAFA || asset.Knafa || "0");

      if (!groups[brandDesc]) {
        groups[brandDesc] = { id: brandDesc, name: brandDesc, running: 0, npa: 0, totalCost: 0, totalDepreciation: 0, materials: [] };
      }
      if (status === 'Running Asset') groups[brandDesc].running += 1; else groups[brandDesc].npa += 1;
      groups[brandDesc].totalCost += kansw;
      groups[brandDesc].totalDepreciation += Math.abs(knafa);
      groups[brandDesc].materials.push({
        moldCode: matnr,
        description: maktx,
        status,
        cost: kansw,
        assetNumber: asset.ANLN1 || asset.Anln1 || "N/A",
        acqYear: asset.ZUJHR || asset.Zujhr || "N/A",
        acqDate: asset.AIBDT || asset.Aibdt || "N/A",
        depreciation: parseFloat(asset.KNAFA || asset.Knafa || "0"),
        brandName: brandDesc,
        vendorId: asset.LIFNR || asset.Lifnr || "",
        vendorName: asset.NAME1 || asset.Name1 || "",
        category: `C${asset.ZzmoldCat || "1"}`,
        ...mapMaterialDetailFields(asset),
      });
    });
    return Object.values(groups);
  }, [vendorAssetsData]);

  // Component/Part is the new top level of the main hierarchy drill-down, ahead of Brand/Vendor —
  // grouped the same way as groupedVendors/groupedBrands above.
  const groupedByCompPart = React.useMemo(() => {
    if (vendorAssetsData.length === 0) return [];
    const groups: Record<string, { id: string, name: string, running: number, npa: number, totalCost: number, totalDepreciation: number, materials: any[] }> = {};
    vendorAssetsData.forEach(asset => {
      const compPart = asset.CompPart || asset.COMPPART || asset.Comppart;
      if (!compPart) return;

      const status = getMoldStatus(asset);
      const matnr = asset.MATNR || asset.Matnr;
      const maktx = asset.MAKTX || asset.Maktx;
      const kansw = parseFloat(asset.KANSW || asset.Kansw || "0");
      const knafa = parseFloat(asset.KNAFA || asset.Knafa || "0");

      if (!groups[compPart]) {
        groups[compPart] = { id: compPart, name: compPart, running: 0, npa: 0, totalCost: 0, totalDepreciation: 0, materials: [] };
      }
      if (status === 'Running Asset') groups[compPart].running += 1; else groups[compPart].npa += 1;
      groups[compPart].totalCost += kansw;
      groups[compPart].totalDepreciation += Math.abs(knafa);
      groups[compPart].materials.push({
        moldCode: matnr,
        description: maktx,
        status,
        cost: kansw,
        assetNumber: asset.ANLN1 || asset.Anln1 || "N/A",
        acqYear: asset.ZUJHR || asset.Zujhr || "N/A",
        acqDate: asset.AIBDT || asset.Aibdt || "N/A",
        depreciation: parseFloat(asset.KNAFA || asset.Knafa || "0"),
        brandName: asset.BRANDDESC || asset.BrandDesc || asset.Branddesc || asset.brandDesc || "Unknown",
        vendorId: asset.LIFNR || asset.Lifnr || "",
        vendorName: asset.NAME1 || asset.Name1 || "",
        category: `C${asset.ZzmoldCat || "1"}`,
        ...mapMaterialDetailFields(asset),
      });
    });
    return Object.values(groups);
  }, [vendorAssetsData]);

  const allMolds = React.useMemo(() => {
    if (vendorAssetsData.length === 0) return MOCK_MOLDS;
    return vendorAssetsData.map(asset => ({
      moldCode: asset.MATNR || asset.Matnr || "",
      moldDescription: asset.MAKTX || asset.Maktx || "",
      inspectionId: asset.ZINSPID || asset.ZinspId || asset.Zinspid || "",
      status: getMoldStatus(asset),
      cost: parseFloat(asset.KANSW || asset.Kansw || "0"),
      assetNumber: asset.ANLN1 || asset.Anln1 || "N/A",
      acqYear: asset.ZUJHR || asset.Zujhr || "N/A",
      acqDate: asset.AIBDT || asset.Aibdt || "N/A",
      depreciation: parseFloat(asset.KNAFA || asset.Knafa || "0"),
      vendorId: asset.LIFNR || asset.Lifnr || "",
      vendorName: asset.NAME1 || asset.Name1 || "",
      brandName: asset.BRANDDESC || asset.BrandDesc || asset.Branddesc || asset.brandDesc || "",
      subBrandName: asset.SUBBRANDDESC || asset.SubBrandDesc || asset.Subbranddesc || asset.subBrandDesc || "",
      category: `C${asset.ZzmoldCat || "1"}`,
      ...mapMaterialDetailFields(asset),
    }));
  }, [vendorAssetsData]);

  // Brands Overview / Vendors Overview now start from Component/Part, same as the Inspection &
  // At-Risk Overview hierarchy — one selection (or "All") per section scopes which brand/vendor
  // totals are shown. Independent per section so filtering one doesn't affect the other. Declared
  // here (ahead of groupedBrandsScoped/groupedVendorsScoped below, which read them) rather than
  // down with the other Brands/Vendors Overview UI state.
  const [brandsCompPartFilter, setBrandsCompPartFilter] = useState<string | null>(null);
  const [vendorsCompPartFilter, setVendorsCompPartFilter] = useState<string | null>(null);

  // Component/Part options shared by the Brands Overview and Vendors Overview filter rows below —
  // every component/part present in the data, most common first.
  const overviewCompPartOptions = React.useMemo(() => {
    return Object.entries(groupBy(allMolds, "compPart"))
      .map(([key, items]: any) => ({ key, label: key && key !== "undefined" ? key : "Unspecified", count: items.length }))
      .sort((a, b) => b.count - a.count);
  }, [allMolds]);

  /** Brands Overview, scoped to the selected Component/Part (or every material when unset). */
  const groupedBrandsScoped = React.useMemo(() => {
    const scope = brandsCompPartFilter ? allMolds.filter((m: any) => m.compPart === brandsCompPartFilter) : allMolds;
    return groupByEntity(scope, "brandName");
  }, [allMolds, brandsCompPartFilter]);

  /** Vendors Overview, scoped to the selected Component/Part (or every material when unset). */
  const groupedVendorsScoped = React.useMemo(() => {
    const scope = vendorsCompPartFilter ? allMolds.filter((m: any) => m.compPart === vendorsCompPartFilter) : allMolds;
    return groupByEntity(scope, "vendorId", "vendorName");
  }, [allMolds, vendorsCompPartFilter]);

  // Dashboard Widget Expansion State
  const [expandedWidget, setExpandedWidget] = useState<"system" | "cost" | "vendors" | "brands" | "products" | null>(null);

  // Vendor Multi-Select State
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);

  useEffect(() => {
    if (groupedVendors.length > 0) {
      const sorted = [...groupedVendors].sort((a, b) => b.running !== a.running ? b.running - a.running : b.npa - a.npa);
      setSelectedVendors(sorted.slice(0, 5).map(v => v.id));
    } else {
      setSelectedVendors(MOCK_VENDORS.slice(0, 5).map(v => v.id));
    }
  }, [groupedVendors]);

  // Brand Multi-Select State
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);

  const [accordionState, setAccordionState] = useState<Record<string, boolean>>({});
  const toggleAccordion = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAccordionState(prev => ({ ...prev, [id]: !prev[id] }));
  };
  const [nestedSearchState, setNestedSearchState] = useState<Record<string, string>>({});
  const handleNestedSearch = (key: string, value: string) => {
    setNestedSearchState(prev => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    if (groupedBrands.length > 0) {
      const sorted = [...groupedBrands].sort((a, b) => b.running !== a.running ? b.running - a.running : b.npa - a.npa);
      setSelectedBrands(sorted.slice(0, 5).map(b => b.id));
    } else {
      setSelectedBrands(MOCK_BRANDS.slice(0, 5).map(b => b.id));
    }
  }, [groupedBrands]);

  // Cost Analysis Chart State
  const [costFilter, setCostFilter] = useState<"CompPart" | "Vendor" | "Brand" | "Product" | "Material">("CompPart");
  const [costSearch, setCostSearch] = useState("");
  const [selectedCostItem, setSelectedCostItem] = useState<{ label: string, filterType: string } | null>(null);
  const [poSearch, setPoSearch] = useState("");

  // Brands Overview / Vendors Overview tile search — separate from the main hierarchy's
  // vendor/brand search state so typing here doesn't affect the Vendor-wise/Brand-wise drilldown lists.
  const [brandOverviewSearch, setBrandOverviewSearch] = useState("");
  const [vendorOverviewSearch, setVendorOverviewSearch] = useState("");

  // Both sections default to their top 10 (by Acquisition Value, Running count as tie-breaker) —
  // "Show more" reveals the rest. Resets automatically whenever the Component/Part scope changes.
  const [showAllBrandsOverview, setShowAllBrandsOverview] = useState(false);
  const [showAllVendorsOverview, setShowAllVendorsOverview] = useState(false);

  // Inline (no modal) drill-down state for Brands Overview / Vendors Overview — tapping a tile
  // toggles the matching id, and the panel renders right below that section's tile grid. Selecting
  // a tile also scrolls the main content down to the panel, since it can render well below the fold.
  const [expandedBrandId, setExpandedBrandId] = useState<string | null>(null);
  const [expandedVendorId, setExpandedVendorId] = useState<string | null>(null);
  const mainScrollRef = useRef<ScrollView>(null);
  const brandPanelRef = useRef<View>(null);
  const vendorPanelRef = useRef<View>(null);

  // Section Quick Nav — lets the user jump straight to any dashboard section instead of scrolling
  // past everything above it.
  const orgOverviewRef = useRef<View>(null);
  const inspectionOverviewRef = useRef<View>(null);
  const criticalityOverviewRef = useRef<View>(null);
  const brandsOverviewRef = useRef<View>(null);
  const vendorsOverviewRef = useRef<View>(null);
  const portfolioInsightsRef = useRef<View>(null);
  const systemOverviewRef = useRef<View>(null);
  const costAnalysisRef = useRef<View>(null);
  const drilldownRef = useRef<View>(null);
  const [activeNavSection, setActiveNavSection] = useState<string | null>(null);

  // Shared cascading drill-down filters for Inspection Overview AND At-Risk Moulds — both
  // sections use the identical Component/Part → Brand → Sub Brand → Vendor → Region →
  // Domestic/International criteria, so one selection here scopes both instead of asking the user
  // to filter twice. Tapping a chip in By Component/Part narrows every level below it; tapping a
  // Brand chip narrows Sub Brand/Vendor/Region/Domestic-International; tapping a Sub Brand chip
  // narrows Vendor/Region/Domestic-International; tapping a Vendor chip narrows
  // Region/Domestic-International; tapping a Region chip narrows Domestic/International. Picking a
  // new value at any level clears the (now possibly stale) selections below it.
  const [drillCompPartFilter, setDrillCompPartFilter] = useState<string | null>(null);
  const [drillBrandFilter, setDrillBrandFilter] = useState<string | null>(null);
  const [drillSubBrandFilter, setDrillSubBrandFilter] = useState<string | null>(null);
  const [drillVendorFilter, setDrillVendorFilter] = useState<string | null>(null);
  const [drillRegionFilter, setDrillRegionFilter] = useState<string | null>(null);
  const [drillDomIntlFilter, setDrillDomIntlFilter] = useState<string | null>(null);
  const selectDrillCompPartFilter = (label: string) => {
    setDrillCompPartFilter((prev) => (prev === label ? null : label));
    setDrillBrandFilter(null);
    setDrillSubBrandFilter(null);
    setDrillVendorFilter(null);
    setDrillRegionFilter(null);
    setDrillDomIntlFilter(null);
  };
  const selectDrillBrandFilter = (label: string) => {
    setDrillBrandFilter((prev) => (prev === label ? null : label));
    setDrillSubBrandFilter(null);
    setDrillVendorFilter(null);
    setDrillRegionFilter(null);
    setDrillDomIntlFilter(null);
  };
  const selectDrillSubBrandFilter = (label: string) => {
    setDrillSubBrandFilter((prev) => (prev === label ? null : label));
    setDrillVendorFilter(null);
    setDrillRegionFilter(null);
    setDrillDomIntlFilter(null);
  };
  const selectDrillVendorFilter = (label: string) => {
    setDrillVendorFilter((prev) => (prev === label ? null : label));
    setDrillRegionFilter(null);
    setDrillDomIntlFilter(null);
  };
  const selectDrillRegionFilter = (label: string) => {
    setDrillRegionFilter((prev) => (prev === label ? null : label));
    setDrillDomIntlFilter(null);
  };
  const selectDrillDomIntlFilter = (label: string) => {
    setDrillDomIntlFilter((prev) => (prev === label ? null : label));
  };

  const scrollToPanel = (panelRef: React.RefObject<View | null>) => {
    // Wait a tick so the panel has actually mounted/laid out before measuring it.
    setTimeout(() => {
      if (Platform.OS === "web") {
        // react-native-web doesn't implement findNodeHandle/measureLayout — but its View ref forwards
        // straight to the underlying DOM node, so the browser's own scrollIntoView does the job.
        (panelRef.current as unknown as HTMLElement | null)?.scrollIntoView?.({ behavior: "smooth", block: "start" });
        return;
      }
      panelRef.current?.measureLayout(
        findNodeHandle(mainScrollRef.current) as any,
        (_x: number, y: number) => {
          mainScrollRef.current?.scrollTo({ y: Math.max(y - 20, 0), animated: true });
        },
        () => {}
      );
    }, 150);
  };

  const toggleBrandDrilldown = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.selectionAsync();
    setExpandedBrandId((prev) => {
      const next = prev === id ? null : id;
      if (next) scrollToPanel(brandPanelRef);
      return next;
    });
  };
  const toggleVendorDrilldown = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.selectionAsync();
    setExpandedVendorId((prev) => {
      const next = prev === id ? null : id;
      if (next) scrollToPanel(vendorPanelRef);
      return next;
    });
  };

  const generateCostData = () => {
    if (costFilter === "Vendor") return (groupedVendors.length > 0 ? groupedVendors : MOCK_VENDORS).map((v: any, i: number) => ({ label: v.name.split(" ")[0], value: v.totalCost || (12000 + (i * 5000)), materials: v.materials }));
    if (costFilter === "Brand") return (groupedBrands.length > 0 ? groupedBrands : MOCK_BRANDS).map((b: any, i: number) => ({ label: b.name.split(" ")[0] || b.name, value: b.totalCost || (8000 + (i * 3000)), materials: b.materials }));
    // if (costFilter === "Product") return MOCK_PRODUCTS.map((p, i) => ({ label: p.code.split("-")[1], value: 4000 + (i * 1500), materials: MOCK_MOLDS }));
    return allMolds.map((m: any) => ({ label: m.moldCode, value: m.cost, materials: [m] }));
  };

  const allCostData = generateCostData();
  const costData = allCostData.filter(d => d.label.toLowerCase().includes(costSearch.toLowerCase()));
  const maxCost = Math.max(...allCostData.map(d => d.value)) * 1.2;

  // Level numbering now starts with Component/Part (position 1 in BOTH modes) ahead of Brand/Vendor:
  //   Vendor-wise: 1=compPart 2=vendor 3=brand 4=regionType 5=moldCategory 6=assetType
  //   Brand-wise:  1=compPart 2=brand  3=vendor 4=moldCategory 5=assetType
  const resetFromLevel = (level: number) => {
    if (hierarchyMode === "Vendor-wise") {
      if (level <= 1) setState(s => ({ ...s, vendor: null, brand: null, regionType: null, moldCategory: null, assetType: null, material: null }));
      else if (level <= 2) setState(s => ({ ...s, brand: null, regionType: null, moldCategory: null, assetType: null, material: null }));
      else if (level <= 3) setState(s => ({ ...s, regionType: null, moldCategory: null, assetType: null, material: null }));
      else if (level <= 4) setState(s => ({ ...s, moldCategory: null, assetType: null, material: null }));
      else if (level <= 5) setState(s => ({ ...s, assetType: null, material: null }));
      else if (level <= 6) setState(s => ({ ...s, material: null }));
    } else {
      if (level <= 1) setState(s => ({ ...s, brand: null, vendor: null, moldCategory: null, assetType: null, material: null }));
      else if (level <= 2) setState(s => ({ ...s, vendor: null, moldCategory: null, assetType: null, material: null }));
      else if (level <= 3) setState(s => ({ ...s, moldCategory: null, assetType: null, material: null }));
      else if (level <= 4) setState(s => ({ ...s, assetType: null, material: null }));
      else if (level <= 5) setState(s => ({ ...s, material: null }));
    }
  };

  const handleBreadcrumbClick = (level: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.selectionAsync();
    resetFromLevel(level);
  };

  const handleSelectCompPart = (cp: any) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.selectionAsync();
    setState({ ...state, compPart: cp });
    resetFromLevel(1);
  };
  const handleSelectVendor = (v: any) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.selectionAsync();
    setState({ ...state, vendor: v });
    resetFromLevel(hierarchyMode === "Vendor-wise" ? 2 : 3);
  };
  const handleSelectBrand = (b: any) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.selectionAsync();
    setState({ ...state, brand: b });
    resetFromLevel(hierarchyMode === "Vendor-wise" ? 3 : 2);
  };
  const handleSelectProduct = (p: any) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.selectionAsync();
    setState({ ...state, product: p });
    resetFromLevel(hierarchyMode === "Vendor-wise" ? 3 : 2);
  };
  const handleSelectRegion = (r: any) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.selectionAsync();
    setState({ ...state, region: r });
    resetFromLevel(hierarchyMode === "Vendor-wise" ? 4 : 3);
  };
  const handleSelectCategory = (c: any) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.selectionAsync();
    setState({ ...state, moldCategory: c });
    resetFromLevel(hierarchyMode === "Vendor-wise" ? 5 : 4);
  };
  const handleSelectAssetType = (type: "Running Asset" | "NPA Asset") => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.selectionAsync();
    setState({ ...state, assetType: type });
    resetFromLevel(hierarchyMode === "Vendor-wise" ? 6 : 5);
  };
  const handleSelectCriticality = (c: any) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.selectionAsync();
    setState({ ...state, criticality: c });
    resetFromLevel(7);
  };
  const handleSelectMold = (m: any) => {
    Haptics.selectionAsync();
    setState({ ...state, moldDetail: m });
  };

  const currentLevel = hierarchyMode === "Vendor-wise"
    ? (state.criticality ? "Molds" : state.assetType ? "Criticality" : state.moldCategory ? "Asset Types" : state.region ? "Categories" : state.product ? "Regions" : state.brand ? "Products" : state.vendor ? "Brands" : state.compPart ? "Vendors" : "")
    : (state.criticality ? "Molds" : state.assetType ? "Criticality" : state.moldCategory ? "Asset Types" : state.vendor ? "Categories" : state.region ? "Vendors" : state.product ? "Regions" : state.brand ? "Products" : state.compPart ? "Brands" : "");

  // --- CALCULATED VALUES FOR WIDGETS AND MODALS ---
  const filteredVendors = MOCK_VENDORS.filter(v => selectedVendors.includes(v.id));
  const vendorsRunning = vendorAssetsData.length > 0
    ? vendorAssetsData.filter(a => selectedVendors.includes(a.LIFNR || a.Lifnr)).filter(a => getMoldStatus(a) === 'Running Asset').length
    : filteredVendors.reduce((acc, v) => acc + 60 + (MOCK_VENDORS.indexOf(v) * 10), 0);
  const vendorsNpa = vendorAssetsData.length > 0
    ? vendorAssetsData.filter(a => selectedVendors.includes(a.LIFNR || a.Lifnr)).filter(a => getMoldStatus(a) === 'NPA Asset').length
    : filteredVendors.reduce((acc, v) => acc + 20 + (MOCK_VENDORS.indexOf(v) * 5), 0);

  const brandMult = selectedVendors.length >= 10 ? 1 : 0.6;
  const filteredBrandsMock = MOCK_BRANDS.filter(b => selectedBrands.includes(b.id));
  const brandsRunning = vendorAssetsData.length > 0
    ? vendorAssetsData.filter(a => selectedBrands.includes(a.BRANDDESC || a.BrandDesc || a.Branddesc || a.brandDesc)).filter(a => getMoldStatus(a) === 'Running Asset').length
    : Math.round(filteredBrandsMock.reduce((acc, b, i) => acc + 80 - (i * 15), 0) * brandMult);
  const brandsNpa = vendorAssetsData.length > 0
    ? vendorAssetsData.filter(a => selectedBrands.includes(a.BRANDDESC || a.BrandDesc || a.Branddesc || a.brandDesc)).filter(a => getMoldStatus(a) === 'NPA Asset').length
    : Math.round(filteredBrandsMock.reduce((acc, b, i) => acc + 15 + (i * 10), 0) * brandMult);

  const productsRunning = Math.round(MOCK_PRODUCTS.reduce((acc, p, i) => acc + 40 + (i * 12), 0) * brandMult);
  const productsNpa = Math.round(MOCK_PRODUCTS.reduce((acc, p, i) => acc + 10 + (i * 8), 0) * brandMult);

  // --- CHART DATA (real, already-computed values only — feeds the new GroupedBarChart/BarChart/DonutChart primitives) ---
  // Vendors Overview: same per-vendor Running/NPA values the old Stacked3DBar loop used (real groupedVendors, or the
  // same 60+i*10 / 20+i*5 mock formula previously baked into that loop), just fed into one shared chart component
  // instead of one hand-rolled cylinder-bar component per vendor. Used by both the inline widget and its full-screen expansion (same formula in both originally).
  const vendorChartData = (groupedVendors.length > 0
    ? groupedVendors
    : MOCK_VENDORS.map((v, i) => ({ id: v.id, name: v.name, running: 60 + (i * 10), npa: 20 + (i * 5), totalCost: 0, materials: MOCK_MOLDS }))
  )
    .filter((v: any) => selectedVendors.includes(v.id))
    .map((v: any) => ({ id: v.id, name: v.name, label: v.name.split(" ")[0], running: v.running, npa: v.npa, materials: v.materials }))
    .sort((a: any, b: any) => b.running !== a.running ? b.running - a.running : b.npa - a.npa)
    .slice(0, 5);

  // Brands Overview (inline widget): real case used the full brand name as label; mock case used the brandMult-scaled
  // Brands Overview (inline widget): use the first word of the brand name for cleaner x-axis labels
  const brandChartDataInline = (groupedBrands.length > 0
    ? groupedBrands.filter((b: any) => selectedBrands.includes(b.id)).map((b: any) => ({ id: b.id, name: b.name, label: b.name.split(" ")[0], running: b.running, npa: b.npa, materials: b.materials }))
    : MOCK_BRANDS.map((b, i) => ({
      id: b.id,
      name: b.name,
      label: b.name.split(" ")[0],
      running: Math.round((80 - (i * 15)) * brandMult),
      npa: Math.round((15 + (i * 10)) * brandMult),
      materials: MOCK_MOLDS,
    })).filter((b: any) => selectedBrands.includes(b.id))
  )
    .sort((a: any, b: any) => b.running !== a.running ? b.running - a.running : b.npa - a.npa)
    .slice(0, 5);

  // Brands Overview (full-screen expansion): the original expanded-modal loop used a DIFFERENT label (`name.split(" ")[0]`)
  // and a different mock formula (150-i*10 / 30-i*2, no brandMult) than the inline widget above — kept distinct on purpose
  // to preserve that pre-existing (if inconsistent) behavior byte-for-byte.
  const brandChartDataExpanded = (groupedBrands.length > 0
    ? groupedBrands.filter((b: any) => selectedBrands.includes(b.id)).map((b: any) => ({ id: b.id, name: b.name, label: b.name.split(" ")[0], running: b.running, npa: b.npa, materials: b.materials }))
    : MOCK_BRANDS.map((b, i) => ({
      id: b.id,
      name: b.name,
      label: b.name.split(" ")[0],
      running: 150 - (i * 10),
      npa: 30 - (i * 2),
      materials: MOCK_MOLDS,
    })).filter((b: any) => selectedBrands.includes(b.id))
  )
    .sort((a: any, b: any) => b.running !== a.running ? b.running - a.running : b.npa - a.npa)
    .slice(0, 5);

  // Headline Running-vs-NPA donut: aggregate real running/npa across every vendor group (not just the selected subset),
  // falling back to the same MOCK_VENDORS 60+i*10 / 20+i*5 formula used elsewhere in this file when there's no live data.
  const totalRunningAll = groupedVendors.length > 0
    ? groupedVendors.reduce((sum: number, v: any) => sum + v.running, 0)
    : MOCK_VENDORS.reduce((acc, v, i) => acc + 60 + (i * 10), 0);
  const totalNpaAll = groupedVendors.length > 0
    ? groupedVendors.reduce((sum: number, v: any) => sum + v.npa, 0)
    : MOCK_VENDORS.reduce((acc, v, i) => acc + 20 + (i * 5), 0);

  // Cost breakdown by vendor — real Kansw-derived totalCost already summed per vendor in groupedVendors (top 6 by spend).
  const vendorCostChartData = (groupedVendors.length > 0 ? groupedVendors : MOCK_VENDORS.map((v, i) => ({ ...v, totalCost: 12000 + (i * 5000) })))
    .slice()
    .sort((a: any, b: any) => (b.totalCost || 0) - (a.totalCost || 0))
    .slice(0, 6)
    .map((v: any, i: number) => ({ label: v.name.split(" ")[0], value: v.totalCost !== undefined ? v.totalCost : (12000 + (i * 5000)) }));

  // Depreciation breakdown by vendor — purely additive derived value (sum of materials[].depreciation), not stored on state.
  const vendorDeprChartData = (
    groupedVendors.length > 0
      ? groupedVendors.map((v: any) => ({ label: v.name.split(" ")[0], value: Math.abs(v.materials.reduce((sum: number, m: any) => sum + (m.depreciation || 0), 0)) }))
      : MOCK_VENDORS.map((v, i) => ({ label: v.name.split(" ")[0], value: 3000 + (i * 900) }))
  )
    .slice()
    .sort((a: any, b: any) => b.value - a.value)
    .slice(0, 6);

  // Category breakdown — asset count per already-computed `category` field (C1/C2/C3...) on allMolds.
  // Top 8 by count so the fixed-width card never has to cram more bars than it can legibly show
  // (real data can have more mould categories than the three named ones).
  const categoryChartData = Object.entries(groupBy(allMolds, "category"))
    .map(([cat, items]: any) => ({ label: CATEGORY_DISPLAY_NAMES[cat] || cat, value: items.length }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // Region breakdown — asset count per already-computed `region` field (VendRegion) on allMolds.
  // Top 8 by count, same reasoning as categoryChartData — real data can have a couple dozen regions.
  const regionChartData = Object.entries(groupBy(allMolds, "region"))
    .map(([region, items]: any) => ({ label: region, value: items.length }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // Domestic vs International split, each broken down by Running/NPA — driven by Zbusiness
  // (businessArea === '03' = International, everything else = Domestic), not country.
  const domesticMolds = allMolds.filter((m: any) => !isInternationalMold(m));
  const internationalMolds = allMolds.filter((m: any) => isInternationalMold(m));
  const regionSplitChartData = [
    {
      label: "Domestic",
      values: [
        domesticMolds.filter((m: any) => m.status === "Running Asset").length,
        domesticMolds.filter((m: any) => m.status === "NPA Asset").length,
      ],
    },
    {
      label: "International",
      values: [
        internationalMolds.filter((m: any) => m.status === "Running Asset").length,
        internationalMolds.filter((m: any) => m.status === "NPA Asset").length,
      ],
    },
  ];

  // Organizational Overview (top-of-dashboard KPI strip) — org-wide Acquisition/Depreciation value,
  // at-risk mould count per category segment, and the same Domestic/International Running/NPA split
  // as regionSplitChartData above, surfaced as headline numbers rather than a chart.
  const totalAcquisitionValue = allMolds.reduce((s: number, m: any) => s + (m.cost || 0), 0);
  const totalDepreciationValue = allMolds.reduce((s: number, m: any) => s + Math.abs(m.depreciation || 0), 0);
  const atRiskMolds = allMolds.filter(isAtRiskMold);
  const atRiskBySegment = Object.entries(groupBy(atRiskMolds, "category")).map(([cat, items]: any) => ({
    key: cat,
    label: CATEGORY_DISPLAY_NAMES[cat] || cat,
    count: items.length,
  }));
  const domesticRunning = domesticMolds.filter((m: any) => m.status === "Running Asset").length;
  const domesticNpa = domesticMolds.filter((m: any) => m.status === "NPA Asset").length;
  const internationalRunning = internationalMolds.filter((m: any) => m.status === "Running Asset").length;
  const internationalNpa = internationalMolds.filter((m: any) => m.status === "NPA Asset").length;

  // Inspection Overview — "inspected" = has at least one submitted inspection (ZinspCount > 0).
  // ZlastInsp (last inspection date) feeds the staleness/overdue count and the most-recent-inspection
  // headline; there's still no org-wide "current status" beyond count + date (real completion detail
  // stays per-device in local AsyncStorage). Scoped to Running Assets only — an NPA mould is retired
  // and isn't due for inspection, so counting it would understate coverage / inflate "overdue".
  const runningMolds = allMolds.filter((m: any) => m.status === "Running Asset");
  const totalInspected = runningMolds.filter((m: any) => isInspectedMold(m)).length;
  const totalNotInspected = runningMolds.length - totalInspected;
  const inspectionRate = runningMolds.length > 0 ? Math.round((totalInspected / runningMolds.length) * 100) : 0;
  const totalInspectionSubmissions = runningMolds.reduce((s: number, m: any) => s + (m.inspectionCount || 0), 0);
  const overdueInspections = runningMolds.filter((m: any) => isInspectionStale(m)).length;
  const mostRecentInspectionDate = runningMolds
    .map((m: any) => parseSapDate(m.lastInspectionDate))
    .filter((d): d is Date => d !== null)
    .sort((a, b) => b.getTime() - a.getTime())[0] || null;
  // Shared cascading scope for both Inspection Overview and At-Risk Moulds: By Component/Part
  // always shows every component/part (it's the top of the chain now), but each row below only
  // reflects moulds matching whatever's selected above it — picking a component/part narrows
  // Brand/Sub Brand/Vendor/Region/Domestic-International, a brand narrows Sub Brand/Vendor/Region/
  // Domestic-International, a sub brand narrows Vendor/Region/Domestic-International, a vendor
  // narrows Region/Domestic-International, and a region narrows Domestic/International. Counts on
  // every chip (both inspected and at-risk) recompute from that same narrowed scope, and the fully
  // narrowed scope (drillFinalScope) is what feeds the At-Risk ranking tiles.
  const drillScopeAfterCompPart = drillCompPartFilter ? runningMolds.filter((m: any) => m.compPart === drillCompPartFilter) : runningMolds;
  const drillScopeAfterBrand = drillBrandFilter ? drillScopeAfterCompPart.filter((m: any) => m.brandName === drillBrandFilter) : drillScopeAfterCompPart;
  const drillScopeAfterSubBrand = drillSubBrandFilter ? drillScopeAfterBrand.filter((m: any) => m.subBrandName === drillSubBrandFilter) : drillScopeAfterBrand;
  const drillScopeAfterVendor = drillVendorFilter ? drillScopeAfterSubBrand.filter((m: any) => m.vendorName === drillVendorFilter) : drillScopeAfterSubBrand;
  const drillScopeAfterRegion = drillRegionFilter ? drillScopeAfterVendor.filter((m: any) => m.region === drillRegionFilter) : drillScopeAfterVendor;
  const drillFinalScope = drillDomIntlFilter
    ? drillScopeAfterRegion.filter((m: any) => (drillDomIntlFilter === "international" ? isInternationalMold(m) : !isInternationalMold(m)))
    : drillScopeAfterRegion;

  /** Per-bucket breakdown combining both metrics the shared filter chips need to show: inspected count and at-risk count. */
  const combinedDrillBreakdown = (materials: any[], key: string) => {
    const grouped = groupBy(materials, key);
    return Object.entries(grouped)
      .map(([k, items]: any) => ({
        key: k,
        label: k && k !== "undefined" ? k : "Unspecified",
        total: items.length,
        inspected: items.filter((m: any) => isInspectedMold(m)).length,
        atRisk: items.filter(isAtRiskMold).length,
      }))
      .sort((a, b) => b.total - a.total);
  };
  const drillByCompPart = combinedDrillBreakdown(runningMolds, "compPart");
  const drillByBrand = combinedDrillBreakdown(drillScopeAfterCompPart, "brandName");
  const drillBySubBrand = combinedDrillBreakdown(drillScopeAfterBrand, "subBrandName");
  const drillByVendor = combinedDrillBreakdown(drillScopeAfterSubBrand, "vendorName");
  const drillByRegion = combinedDrillBreakdown(drillScopeAfterVendor, "region");
  const drillDomesticMolds = drillScopeAfterRegion.filter((m: any) => !isInternationalMold(m));
  const drillInternationalMolds = drillScopeAfterRegion.filter((m: any) => isInternationalMold(m));
  const drillByDomesticIntl = [
    { key: "domestic", label: "Domestic", total: drillDomesticMolds.length, inspected: drillDomesticMolds.filter((m: any) => isInspectedMold(m)).length, atRisk: drillDomesticMolds.filter(isAtRiskMold).length },
    { key: "international", label: "International", total: drillInternationalMolds.length, inspected: drillInternationalMolds.filter((m: any) => isInspectedMold(m)).length, atRisk: drillInternationalMolds.filter(isAtRiskMold).length },
  ];

  // Criticality — dynamic grouping (real Zcriticality values, no assumed scheme) for Portfolio Insights.
  // Scoped to Running Assets: an NPA mould is retired, so its criticality rating is no longer
  // operationally relevant.
  const criticalityChartData = Object.entries(groupBy(runningMolds, "criticality")).map(([crit, items]: any) => ({
    label: crit,
    value: items.length,
  }));

  const toggleVendorSelection = (id: string) => {
    setSelectedVendors(prev => {
      if (prev.includes(id)) {
        return prev.filter(v => v !== id);
      }
      if (prev.length >= 5) {
        return prev;
      }
      return [...prev, id];
    });
  };

  const toggleBrandSelection = (id: string) => {
    setSelectedBrands(prev => {
      if (prev.includes(id)) {
        return prev.filter(b => b !== id);
      }
      if (prev.length >= 5) {
        return prev;
      }
      return [...prev, id];
    });
  };

  const renderVendorDropdown = () => (
    <Modal visible={showVendorDropdown} transparent={true} animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ width: '80%', maxHeight: '70%', backgroundColor: '#fff', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.ink }}>Select Vendors ({selectedVendors.length}/5)</Text>
            <TouchableOpacity onPress={() => setShowVendorDropdown(false)}>
              <Icons.X size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <ScrollView>
            {(groupedVendors.length > 0 ? groupedVendors : MOCK_VENDORS).map(v => {
              const isSelected = selectedVendors.includes(v.id);
              return (
                <TouchableOpacity
                  key={v.id}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}
                  onPress={() => toggleVendorSelection(v.id)}
                >
                  {isSelected ? (
                    <Icons.CheckSquare size={24} color={colors.primary} weight="fill" />
                  ) : (
                    <Icons.Square size={24} color={colors.textMuted} />
                  )}
                  <Text style={{ marginLeft: 12, fontSize: 16, color: colors.ink }}>
                    {v.name}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
          <TouchableOpacity style={{ backgroundColor: colors.primary, padding: 16, borderRadius: 8, marginTop: 16, alignItems: 'center' }} onPress={() => setShowVendorDropdown(false)}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderBrandDropdown = () => (
    <Modal visible={showBrandDropdown} transparent={true} animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ width: '80%', maxHeight: '70%', backgroundColor: '#fff', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.ink }}>Select Brands ({selectedBrands.length}/5)</Text>
            <TouchableOpacity onPress={() => setShowBrandDropdown(false)}>
              <Icons.X size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <ScrollView>
            {(groupedBrands.length > 0 ? groupedBrands : MOCK_BRANDS).map(b => {
              const isSelected = selectedBrands.includes(b.id);
              return (
                <TouchableOpacity
                  key={b.id}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}
                  onPress={() => toggleBrandSelection(b.id)}
                >
                  {isSelected ? (
                    <Icons.CheckSquare size={24} color={colors.primary} weight="fill" />
                  ) : (
                    <Icons.Square size={24} color={colors.textMuted} />
                  )}
                  <Text style={{ marginLeft: 12, fontSize: 16, color: colors.ink }}>
                    {b.name}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
          <TouchableOpacity style={{ backgroundColor: colors.primary, padding: 16, borderRadius: 8, marginTop: 16, alignItems: 'center' }} onPress={() => setShowBrandDropdown(false)}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // --- RENDER WIDGETS (Reusable for inline vs full-screen) ---
  const renderSystemOverview = (isExpanded = false) => {
    return (
      <Animated.View entering={FadeInDown.duration(400)} style={isExpanded ? { flex: 1, backgroundColor: colors.bg, paddingTop: Platform.OS === 'web' ? 40 : insets.top + 20 } : {}}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <SectionTitle title="System Overview" subtitle="Running vs NPA insights" />
          {!isExpanded && (
            <TouchableOpacity onPress={() => setExpandedWidget('system')} style={{ padding: 10, marginRight: 20, marginBottom: 20 }}>
              <Icons.ArrowsOut size={22} color={colors.textMuted} weight="bold" />
            </TouchableOpacity>
          )}
        </View>

        <View style={{ flexDirection: 'row', paddingHorizontal: 20, marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <TouchableOpacity onPress={() => setShowVendorDropdown(true)} style={[styles.pillBtn, { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center' }]}>
            <Text style={[styles.pillText, { color: '#fff', marginRight: 4 }]}>
              Selected Vendors ({selectedVendors.length}/5)
            </Text>
            <Icons.CaretDown size={14} color="#fff" weight="bold" />
          </TouchableOpacity>
          {renderVendorDropdown()}

          <TouchableOpacity onPress={() => setShowBrandDropdown(true)} style={[styles.pillBtn, { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center' }]}>
            <Text style={[styles.pillText, { color: '#fff', marginRight: 4 }]}>
              Selected Brands ({selectedBrands.length}/5)
            </Text>
            <Icons.CaretDown size={14} color="#fff" weight="bold" />
          </TouchableOpacity>
          {renderBrandDropdown()}
        </View>

        <ScrollView horizontal={!isExpanded} showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false} contentContainerStyle={[!isExpanded ? { paddingHorizontal: 20, gap: 20, paddingBottom: 24 } : { paddingHorizontal: 20, gap: 20, paddingBottom: 100, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }]}>
          {/* Chart 1: Vendors */}
          <View style={[styles.boxCard3D, shadow.soft, { width: 400, padding: 24, alignItems: 'flex-start', justifyContent: 'flex-start' }]}>
            <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View>
                <Text style={{ fontSize: font.body, fontWeight: font.bold, color: colors.ink }}>Vendors Overview</Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4, fontWeight: '600' }}>{vendorsRunning + vendorsNpa} Assets ({vendorsRunning} Running, {vendorsNpa} NPA)</Text>
              </View>
              {!isExpanded && (
                <TouchableOpacity onPress={() => setExpandedWidget('vendors')} style={{ padding: 4 }}>
                  <Icons.ArrowsOut size={18} color={colors.textMuted} weight="bold" />
                </TouchableOpacity>
              )}
            </View>
            <View style={{ width: '100%' }}>
              <HorizontalBarChart3D
                data={vendorChartData.map((v: any) => ({ label: v.label, values: [v.running, v.npa] }))}
                height={230}
                colors={[colors.success, colors.danger]}
                showLegend={false}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, marginTop: 12 }}>
                {vendorChartData.map((v: any) => (
                  <ChartLegendChip key={v.id} label={v.label} val1={v.running} val2={v.npa} setGlobalTooltip={setGlobalTooltip} onPress={() => setChartDetail({ title: `Vendor: ${v.name}`, running: v.running, npa: v.npa, materials: v.materials })} />
                ))}
              </ScrollView>
            </View>
          </View>

          {/* Chart 2: Brands */}
          <View style={[styles.boxCard3D, shadow.soft, { width: 400, padding: 24, alignItems: 'flex-start', justifyContent: 'flex-start' }]}>
            <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View>
                <Text style={{ fontSize: font.body, fontWeight: font.bold, color: colors.ink }}>Brands Overview</Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4, fontWeight: '600' }}>{brandsRunning + brandsNpa} Assets ({brandsRunning} Running, {brandsNpa} NPA)</Text>
              </View>
              {!isExpanded && (
                <TouchableOpacity onPress={() => setExpandedWidget('brands')} style={{ padding: 4 }}>
                  <Icons.ArrowsOut size={18} color={colors.textMuted} weight="bold" />
                </TouchableOpacity>
              )}
            </View>
            <View style={{ width: '100%' }}>
              <HorizontalBarChart3D
                data={brandChartDataInline.map((b: any) => ({ label: b.label, values: [b.running, b.npa] }))}
                height={230}
                colors={[colors.success, colors.danger]}
                showLegend={false}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, marginTop: 12 }}>
                {brandChartDataInline.map((b: any) => (
                  <ChartLegendChip key={b.id} label={b.label} val1={b.running} val2={b.npa} setGlobalTooltip={setGlobalTooltip} onPress={() => setChartDetail({ title: `Brand: ${b.name}`, running: b.running, npa: b.npa, materials: b.materials })} />
                ))}
              </ScrollView>
            </View>
          </View>

          {/* Chart 3: Products */}
          {/* <View style={[styles.boxCard3D, shadow.soft, { width: 340, padding: 24, alignItems: 'flex-start', justifyContent: 'flex-start' }]}>
            <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View>
                <Text style={{ fontSize: font.body, fontWeight: font.bold, color: colors.ink }}>Products Overview</Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4, fontWeight: '600' }}>{productsRunning + productsNpa} Assets ({productsRunning} Running, {productsNpa} NPA)</Text>
              </View>
              {!isExpanded && (
                <TouchableOpacity onPress={() => setExpandedWidget('products')} style={{ padding: 4 }}>
                  <Icons.ArrowsOut size={18} color={colors.textMuted} weight="bold" />
                </TouchableOpacity>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', minHeight: 180, width: '100%', justifyContent: 'center' }}>
              {MOCK_PRODUCTS.map((p, i) => {
                const val1 = Math.round((40 + (i * 12)) * brandMult);
                const val2 = Math.round((10 + (i * 8)) * brandMult);
                return <StackedGroupedChart key={p.id} label={p.code.split("-")[1]} val1={val1} val2={val2} setGlobalTooltip={setGlobalTooltip} onPress={() => setChartDetail({ title: `Product: ${p.name}`, running: val1, npa: val2, materials: MOCK_MOLDS })} />
              })}
            </View>
          </View> */}
        </ScrollView>

        <View style={{ flexDirection: 'row', gap: 16, alignSelf: 'center', marginBottom: 32 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: colors.success }} /><Text style={{ fontSize: 13, color: colors.textMuted }}>Running Asset</Text></View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: colors.danger }} /><Text style={{ fontSize: 13, color: colors.textMuted }}>NPA Asset</Text></View>
        </View>
      </Animated.View>
    );
  };

  const renderCostAnalysis = (isExpanded = false) => (
    <Animated.View entering={FadeInDown.duration(400).delay(100)} style={isExpanded ? { flex: 1, backgroundColor: colors.bg, padding: 20, paddingTop: Platform.OS === 'web' ? 40 : insets.top + 20 } : { paddingHorizontal: 20, marginBottom: 32 }}>
      <View style={[styles.modernCard, isExpanded && { flex: 1, borderRadius: 20 }]}>
        <View style={{ position: 'absolute', top: 24, right: 24, zIndex: 10 }}>
          {!isExpanded && (
            <TouchableOpacity onPress={() => setExpandedWidget('cost')} style={{ padding: 8 }}>
              <Icons.ArrowsOut size={22} color={colors.textMuted} weight="bold" />
            </TouchableOpacity>
          )}
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 20, paddingRight: 40 }}>
          <View>
            <Text style={{ fontSize: font.sub, color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5 }}>Total Acquisition Value</Text>
            <Text style={{ fontSize: 28, fontWeight: '900', color: colors.success, marginTop: 4 }}>
              ₹{allMolds.reduce((acc: any, curr: any) => acc + (curr.cost || 0), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Text>
          </View>
          <View>
            <Text style={{ fontSize: font.sub, color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5 }}>Total Depreciation</Text>
            <Text style={{ fontSize: 28, fontWeight: '900', color: colors.danger, marginTop: 4 }}>
              ₹{Math.abs(allMolds.reduce((acc: any, curr: any) => acc + (curr.depreciation || 0), 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Text>
          </View>
        </View>

        {/* Search & Filters */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32, alignItems: 'center' }}>
          <View style={[styles.searchBar, { flex: 1, marginHorizontal: 0, marginTop: 0, marginBottom: 0, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt, borderColor: 'transparent', paddingVertical: 12 }]}>
            <Icons.MagnifyingGlass size={20} color={colors.textFaint} />
            <TextInput
              style={[styles.searchInput, { fontSize: font.body }]}
              placeholder={`Search ${costFilter.toLowerCase()}s...`}
              placeholderTextColor={colors.textFaint}
              value={costSearch}
              onChangeText={setCostSearch}
            />
            {costSearch ? (
              <TouchableOpacity onPress={() => setCostSearch("")}>
                <Icons.XCircle size={20} color={colors.textMuted} weight="fill" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 52, marginBottom: 24 }} contentContainerStyle={{ gap: 10 }}>
          {([
            { key: "CompPart", icon: Icons.PuzzlePiece, accent: '#8B5CF6' },
            { key: "Vendor", icon: Icons.Buildings, accent: '#6366F1' },
            { key: "Brand", icon: Icons.Tag, accent: '#0EA5E9' },
            { key: "Material", icon: Icons.Cube, accent: '#F59E0B' },
          ] as const).map(({ key: f, icon: Icon, accent }) => {
            const isActive = costFilter === f;
            return (
              <TouchableOpacity
                key={f}
                onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setCostFilter(f as any); setCostSearch(''); }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 20,
                  paddingVertical: 11,
                  borderRadius: radius.pill,
                  backgroundColor: isActive ? accent : accent + '10',
                  borderWidth: 1,
                  borderColor: isActive ? accent : accent + '25',
                  shadowColor: isActive ? accent : 'transparent',
                  shadowOffset: { width: 0, height: isActive ? 4 : 0 },
                  shadowOpacity: isActive ? 0.3 : 0,
                  shadowRadius: isActive ? 10 : 0,
                  elevation: isActive ? 6 : 0,
                  gap: 8,
                }}
              >
                <Icon size={16} color={isActive ? '#FFF' : accent} weight={isActive ? "fill" : "bold"} />
                <Text style={{ fontSize: font.body, color: isActive ? '#FFF' : accent, fontWeight: '800' }}>{f}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Chart View (Replaced with Hierarchical Accordion) */}
        <View style={isExpanded ? { flex: 1 } : {}}>
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {costFilter === 'CompPart' && groupedByCompPart.filter(cp => cp.name.toLowerCase().includes(costSearch.toLowerCase())).map((cp: any) => {
              const uniqueBrandsCount = new Set(cp.materials.map((m: any) => m.brandName)).size;
              return (
                <AccordionNode
                  key={cp.id}
                  title={cp.name}
                  entityLabel="Brands"
                  entityCount={uniqueBrandsCount}
                  runningCount={cp.running}
                  npaCount={cp.npa}
                  value={cp.totalCost}
                  depr={cp.materials.reduce((sum: any, m: any) => sum + m.depreciation, 0)}
                  isExpanded={accordionState[`cp-${cp.id}`]}
                  onToggle={() => toggleAccordion(`cp-${cp.id}`)}
                  searchKey={`cp-${cp.id}`}
                  searchValue={nestedSearchState[`cp-${cp.id}`]}
                  onSearchChange={handleNestedSearch}
                >
                  {/* Brands within Component/Part */}
                  {Object.entries(groupBy(cp.materials, 'brandName'))
                    .filter(([brand]) => !nestedSearchState[`cp-${cp.id}`] || brand.toLowerCase().includes(nestedSearchState[`cp-${cp.id}`].toLowerCase()))
                    .map(([brand, bMaterials]: any) => (
                      <AccordionNode
                        key={brand}
                        level={1}
                        title={brand}
                        value={bMaterials.reduce((sum: any, m: any) => sum + m.cost, 0)}
                        depr={bMaterials.reduce((sum: any, m: any) => sum + m.depreciation, 0)}
                        isExpanded={accordionState[`cp-${cp.id}-b-${brand}`]}
                        onToggle={() => toggleAccordion(`cp-${cp.id}-b-${brand}`)}
                        searchKey={`cp-${cp.id}-b-${brand}`}
                        searchValue={nestedSearchState[`cp-${cp.id}-b-${brand}`]}
                        onSearchChange={handleNestedSearch}
                      >
                        {/* Vendors within Brand */}
                        {Object.entries(groupBy(bMaterials, 'vendorId'))
                          .filter(([vendorId, vMaterials]: any) => {
                            const t = vMaterials[0]?.vendorName || `Vendor ${vendorId}`;
                            return !nestedSearchState[`cp-${cp.id}-b-${brand}`] || t.toLowerCase().includes(nestedSearchState[`cp-${cp.id}-b-${brand}`].toLowerCase());
                          })
                          .map(([vendorId, vMaterials]: any) => (
                            <AccordionNode
                              key={vendorId}
                              level={2}
                              title={vMaterials[0]?.vendorName || `Vendor ${vendorId}`}
                              value={vMaterials.reduce((sum: any, m: any) => sum + m.cost, 0)}
                              depr={vMaterials.reduce((sum: any, m: any) => sum + m.depreciation, 0)}
                              isExpanded={accordionState[`cp-${cp.id}-b-${brand}-v-${vendorId}`]}
                              onToggle={() => toggleAccordion(`cp-${cp.id}-b-${brand}-v-${vendorId}`)}
                              searchKey={`cp-${cp.id}-b-${brand}-v-${vendorId}`}
                              searchValue={nestedSearchState[`cp-${cp.id}-b-${brand}-v-${vendorId}`]}
                              onSearchChange={handleNestedSearch}
                            >
                              {/* Status within Vendor */}
                              {Object.entries(groupBy(vMaterials, 'status'))
                                .filter(([status]) => !nestedSearchState[`cp-${cp.id}-b-${brand}-v-${vendorId}`] || status.toLowerCase().includes(nestedSearchState[`cp-${cp.id}-b-${brand}-v-${vendorId}`].toLowerCase()))
                                .map(([status, sMaterials]: any) => (
                                  <AccordionNode
                                    key={status}
                                    level={3}
                                    title={status}
                                    value={sMaterials.reduce((sum: any, m: any) => sum + m.cost, 0)}
                                    depr={sMaterials.reduce((sum: any, m: any) => sum + m.depreciation, 0)}
                                    isExpanded={accordionState[`cp-${cp.id}-b-${brand}-v-${vendorId}-s-${status}`]}
                                    onToggle={() => toggleAccordion(`cp-${cp.id}-b-${brand}-v-${vendorId}-s-${status}`)}
                                    searchKey={`cp-${cp.id}-b-${brand}-v-${vendorId}-s-${status}`}
                                    searchValue={nestedSearchState[`cp-${cp.id}-b-${brand}-v-${vendorId}-s-${status}`]}
                                    onSearchChange={handleNestedSearch}
                                  >
                                    {/* Materials */}
                                    {sMaterials
                                      .filter((m: any) => !nestedSearchState[`cp-${cp.id}-b-${brand}-v-${vendorId}-s-${status}`] || (m.moldCode || m.Matnr || "").toLowerCase().includes(nestedSearchState[`cp-${cp.id}-b-${brand}-v-${vendorId}-s-${status}`].toLowerCase()) || (m.description || m.moldDescription || m.Maktx || "").toLowerCase().includes(nestedSearchState[`cp-${cp.id}-b-${brand}-v-${vendorId}-s-${status}`].toLowerCase()))
                                      .map((m: any) => (
                                        <AccordionNode
                                          key={m.moldCode || m.Matnr}
                                          level={4}
                                          isMaterial
                                          statusColor={m.status}
                                          title={m.description || m.moldDescription || m.Maktx}
                                          subtitle={`Material Code - ${m.moldCode || m.Matnr}`}
                                          value={m.cost}
                                          depr={m.depreciation}
                                          materialData={m}
                                          isExpanded={accordionState[`cp-${cp.id}-b-${brand}-v-${vendorId}-s-${status}-m-${m.moldCode || m.Matnr}`]}
                                          onToggle={() => toggleAccordion(`cp-${cp.id}-b-${brand}-v-${vendorId}-s-${status}-m-${m.moldCode || m.Matnr}`)}
                                        />
                                      ))}
                                  </AccordionNode>
                                ))}
                            </AccordionNode>
                          ))}
                      </AccordionNode>
                    ))}
                </AccordionNode>
              );
            })}

            {costFilter === 'Vendor' && groupedVendors.filter(v => v.name.toLowerCase().includes(costSearch.toLowerCase())).map((vendor: any) => {
              const uniqueBrandsCount = new Set(vendor.materials.map((m: any) => m.brandName)).size;
              return (
                <AccordionNode
                  key={vendor.id}
                  title={vendor.name}
                  entityLabel="Brands"
                  entityCount={uniqueBrandsCount}
                  runningCount={vendor.running}
                  npaCount={vendor.npa}
                  value={vendor.totalCost}
                  depr={vendor.materials.reduce((sum: any, m: any) => sum + m.depreciation, 0)}
                  isExpanded={accordionState[`v-${vendor.id}`]}
                  onToggle={() => toggleAccordion(`v-${vendor.id}`)}
                  searchKey={`v-${vendor.id}`}
                  searchValue={nestedSearchState[`v-${vendor.id}`]}
                  onSearchChange={handleNestedSearch}
                >
                  {/* Brands within Vendor */}
                  {Object.entries(groupBy(vendor.materials, 'brandName'))
                    .filter(([brand]) => !nestedSearchState[`v-${vendor.id}`] || brand.toLowerCase().includes(nestedSearchState[`v-${vendor.id}`].toLowerCase()))
                    .map(([brand, bMaterials]: any) => (
                      <AccordionNode
                        key={brand}
                        level={1}
                        title={brand}
                        value={bMaterials.reduce((sum: any, m: any) => sum + m.cost, 0)}
                        depr={bMaterials.reduce((sum: any, m: any) => sum + m.depreciation, 0)}
                        isExpanded={accordionState[`v-${vendor.id}-b-${brand}`]}
                        onToggle={() => toggleAccordion(`v-${vendor.id}-b-${brand}`)}
                        searchKey={`v-${vendor.id}-b-${brand}`}
                        searchValue={nestedSearchState[`v-${vendor.id}-b-${brand}`]}
                        onSearchChange={handleNestedSearch}
                      >
                        {/* Status within Brand */}
                        {Object.entries(groupBy(bMaterials, 'status'))
                          .filter(([status]) => !nestedSearchState[`v-${vendor.id}-b-${brand}`] || status.toLowerCase().includes(nestedSearchState[`v-${vendor.id}-b-${brand}`].toLowerCase()))
                          .map(([status, sMaterials]: any) => (
                            <AccordionNode
                              key={status}
                              level={2}
                              title={status}
                              value={sMaterials.reduce((sum: any, m: any) => sum + m.cost, 0)}
                              depr={sMaterials.reduce((sum: any, m: any) => sum + m.depreciation, 0)}
                              isExpanded={accordionState[`v-${vendor.id}-b-${brand}-s-${status}`]}
                              onToggle={() => toggleAccordion(`v-${vendor.id}-b-${brand}-s-${status}`)}
                              searchKey={`v-${vendor.id}-b-${brand}-s-${status}`}
                              searchValue={nestedSearchState[`v-${vendor.id}-b-${brand}-s-${status}`]}
                              onSearchChange={handleNestedSearch}
                            >
                              {/* Materials */}
                              {sMaterials
                                .filter((m: any) => !nestedSearchState[`v-${vendor.id}-b-${brand}-s-${status}`] || (m.moldCode || m.Matnr || "").toLowerCase().includes(nestedSearchState[`v-${vendor.id}-b-${brand}-s-${status}`].toLowerCase()) || (m.description || m.moldDescription || m.Maktx || "").toLowerCase().includes(nestedSearchState[`v-${vendor.id}-b-${brand}-s-${status}`].toLowerCase()))
                                .map((m: any) => (
                                  <AccordionNode
                                    key={m.moldCode || m.Matnr}
                                    level={3}
                                    isMaterial
                                    statusColor={m.status}
                                    title={m.description || m.moldDescription || m.Maktx}
                                    subtitle={`Material Code - ${m.moldCode || m.Matnr}`}
                                    value={m.cost}
                                    depr={m.depreciation}
                                    materialData={m}
                                    isExpanded={accordionState[`v-${vendor.id}-b-${brand}-s-${status}-m-${m.moldCode || m.Matnr}`]}
                                    onToggle={() => toggleAccordion(`v-${vendor.id}-b-${brand}-s-${status}-m-${m.moldCode || m.Matnr}`)}
                                  />
                                ))}
                            </AccordionNode>
                          ))}
                      </AccordionNode>
                    ))}
                </AccordionNode>
              );
            })}

            {costFilter === 'Brand' && groupedBrands.filter(b => b.name.toLowerCase().includes(costSearch.toLowerCase())).map((brand: any) => {
              const uniqueVendorsCount = new Set(brand.materials.map((m: any) => m.vendorId)).size;
              return (
                <AccordionNode
                  key={brand.id}
                  title={brand.name}
                  entityLabel="Vendors"
                  entityCount={uniqueVendorsCount}
                  runningCount={brand.running}
                  npaCount={brand.npa}
                  value={brand.totalCost}
                  depr={brand.materials.reduce((sum: any, m: any) => sum + m.depreciation, 0)}
                  isExpanded={accordionState[`b-${brand.id}`]}
                  onToggle={() => toggleAccordion(`b-${brand.id}`)}
                  searchKey={`b-${brand.id}`}
                  searchValue={nestedSearchState[`b-${brand.id}`]}
                  onSearchChange={handleNestedSearch}
                >
                  {/* Vendors within Brand */}
                  {Object.entries(groupBy(brand.materials, 'vendorId'))
                    .filter(([vendorId, vMaterials]: any) => {
                      const t = vMaterials[0]?.vendorName || `Vendor ${vendorId}`;
                      return !nestedSearchState[`b-${brand.id}`] || t.toLowerCase().includes(nestedSearchState[`b-${brand.id}`].toLowerCase());
                    })
                    .map(([vendorId, vMaterials]: any) => (
                      <AccordionNode
                        key={vendorId}
                        level={1}
                        title={vMaterials[0]?.vendorName || `Vendor ${vendorId}`}
                        value={vMaterials.reduce((sum: any, m: any) => sum + m.cost, 0)}
                        depr={vMaterials.reduce((sum: any, m: any) => sum + m.depreciation, 0)}
                        isExpanded={accordionState[`b-${brand.id}-v-${vendorId}`]}
                        onToggle={() => toggleAccordion(`b-${brand.id}-v-${vendorId}`)}
                        searchKey={`b-${brand.id}-v-${vendorId}`}
                        searchValue={nestedSearchState[`b-${brand.id}-v-${vendorId}`]}
                        onSearchChange={handleNestedSearch}
                      >
                        {/* Category within Vendor */}
                        {Object.entries(groupBy(vMaterials, 'category'))
                          .filter(([category]) => {
                            const t = `Category: ${category === 'C1' ? 'Injection' : category === 'C2' ? 'Cubic' : 'Core Back'}`;
                            return !nestedSearchState[`b-${brand.id}-v-${vendorId}`] || t.toLowerCase().includes(nestedSearchState[`b-${brand.id}-v-${vendorId}`].toLowerCase());
                          })
                          .map(([category, cMaterials]: any) => (
                            <AccordionNode
                              key={category}
                              level={2}
                              title={`Category: ${category === 'C1' ? 'Injection' : category === 'C2' ? 'Cubic' : 'Core Back'}`}
                              value={cMaterials.reduce((sum: any, m: any) => sum + m.cost, 0)}
                              depr={cMaterials.reduce((sum: any, m: any) => sum + m.depreciation, 0)}
                              isExpanded={accordionState[`b-${brand.id}-v-${vendorId}-c-${category}`]}
                              onToggle={() => toggleAccordion(`b-${brand.id}-v-${vendorId}-c-${category}`)}
                              searchKey={`b-${brand.id}-v-${vendorId}-c-${category}`}
                              searchValue={nestedSearchState[`b-${brand.id}-v-${vendorId}-c-${category}`]}
                              onSearchChange={handleNestedSearch}
                            >
                              {/* Status within Category */}
                              {Object.entries(groupBy(cMaterials, 'status'))
                                .filter(([status]) => !nestedSearchState[`b-${brand.id}-v-${vendorId}-c-${category}`] || status.toLowerCase().includes(nestedSearchState[`b-${brand.id}-v-${vendorId}-c-${category}`].toLowerCase()))
                                .map(([status, sMaterials]: any) => (
                                  <AccordionNode
                                    key={status}
                                    level={3}
                                    title={status}
                                    value={sMaterials.reduce((sum: any, m: any) => sum + m.cost, 0)}
                                    depr={sMaterials.reduce((sum: any, m: any) => sum + m.depreciation, 0)}
                                    isExpanded={accordionState[`b-${brand.id}-v-${vendorId}-c-${category}-s-${status}`]}
                                    onToggle={() => toggleAccordion(`b-${brand.id}-v-${vendorId}-c-${category}-s-${status}`)}
                                    searchKey={`b-${brand.id}-v-${vendorId}-c-${category}-s-${status}`}
                                    searchValue={nestedSearchState[`b-${brand.id}-v-${vendorId}-c-${category}-s-${status}`]}
                                    onSearchChange={handleNestedSearch}
                                  >
                                    {/* Materials */}
                                    {sMaterials
                                      .filter((m: any) => !nestedSearchState[`b-${brand.id}-v-${vendorId}-c-${category}-s-${status}`] || (m.moldCode || m.Matnr || "").toLowerCase().includes(nestedSearchState[`b-${brand.id}-v-${vendorId}-c-${category}-s-${status}`].toLowerCase()) || (m.description || m.moldDescription || m.Maktx || "").toLowerCase().includes(nestedSearchState[`b-${brand.id}-v-${vendorId}-c-${category}-s-${status}`].toLowerCase()))
                                      .map((m: any) => (
                                        <AccordionNode
                                          key={m.moldCode || m.Matnr}
                                          level={4}
                                          isMaterial
                                          statusColor={m.status}
                                          title={m.description || m.moldDescription || m.Maktx}
                                          subtitle={`Material Code - ${m.moldCode || m.Matnr}`}
                                          value={m.cost}
                                          depr={m.depreciation}
                                          materialData={m}
                                          isExpanded={accordionState[`b-${brand.id}-v-${vendorId}-c-${category}-s-${status}-m-${m.moldCode || m.Matnr}`]}
                                          onToggle={() => toggleAccordion(`b-${brand.id}-v-${vendorId}-c-${category}-s-${status}-m-${m.moldCode || m.Matnr}`)}
                                        />
                                      ))}
                                  </AccordionNode>
                                ))}
                            </AccordionNode>
                          ))}
                      </AccordionNode>
                    ))}
                </AccordionNode>
              );
            })}

            {costFilter === 'Material' && allMolds
              .filter((m: any) => !costSearch || (m.moldCode || m.Matnr || "").toLowerCase().includes(costSearch.toLowerCase()) || (m.description || m.moldDescription || m.Maktx || "").toLowerCase().includes(costSearch.toLowerCase()))
              .map((m: any) => (
                <AccordionNode
                  key={m.moldCode || m.Matnr}
                  isMaterial
                  statusColor={m.status}
                  title={m.description || m.moldDescription || m.Maktx}
                  subtitle={`Material Code - ${m.moldCode || m.Matnr}`}
                  value={m.cost}
                  depr={m.depreciation}
                  materialData={m}
                  isExpanded={accordionState[`m-${m.moldCode || m.Matnr}`]}
                  onToggle={() => toggleAccordion(`m-${m.moldCode || m.Matnr}`)}
                />
              ))}

            {/* costFilter === 'Product' && MOCK_PRODUCTS
              .filter((p: any) => !costSearch || p.name.toLowerCase().includes(costSearch.toLowerCase()) || p.code.toLowerCase().includes(costSearch.toLowerCase()))
              .map((p: any, i: number) => (
                <AccordionNode
                  key={p.id}
                  title={p.name}
                  subtitle={p.code}
                  value={4000 + (i * 1500)}
                  isExpanded={accordionState[`p-${p.id}`]}
                  onToggle={() => toggleAccordion(`p-${p.id}`)}
                >
                  <View style={{ padding: 16 }}>
                    <Text style={{ color: colors.textMuted, fontSize: 13 }}>Product hierarchy view is not yet fully mapped in this demo.</Text>
                  </View>
                </AccordionNode>
              )) */}
          </ScrollView>
        </View>
      </View>
    </Animated.View>
  );

  /** Component/Part — the new top level of the main hierarchy drill-down, shown before Brand/Vendor in both modes. */
  const renderCompPartList = () => (
    <Animated.View entering={FadeInDown.duration(400)}>
      <SectionTitle title="Component / Part" subtitle="Select a component or part" />
      <View style={styles.searchBar}>
        <Icons.MagnifyingGlass size={16} color={colors.textFaint} />
        <TextInput style={styles.searchInput} placeholder="Search components/parts..." placeholderTextColor={colors.textFaint} value={search.compPart} onChangeText={(t) => setSearch({ ...search, compPart: t })} />
        {search.compPart ? <TouchableOpacity onPress={() => setSearch({ ...search, compPart: "" })}><Icons.XCircle size={16} color={colors.textMuted} weight="fill" /></TouchableOpacity> : null}
      </View>
      <View style={styles.gridList}>
        {groupedByCompPart.filter((cp: any) => cp.name.toLowerCase().includes(search.compPart.toLowerCase())).map((cp: any) => {
          const isSelected = state.compPart?.id === cp.id;
          return (
            <Hover3DWrapper key={cp.id} onPress={() => handleSelectCompPart(cp)}>
              <View style={[styles.boxCard3D, shadow.soft, isSelected && styles.boxCardSelected3D, { width: tileWidth, padding: isTablet ? 20 : 12 }]}>
                <View style={[styles.iconCircle, { backgroundColor: isSelected ? colors.warning : colors.warningSoft, width: iconWrapSize, height: iconWrapSize, borderRadius: iconWrapSize / 2 }]}><Icons.PuzzlePiece size={iconSize} color={isSelected ? "#fff" : colors.warning} weight={isSelected ? "fill" : "duotone"} /></View>
                <Text style={[styles.boxTitle, isSelected && { color: colors.brand }, { fontSize: isTablet ? font.body : font.sub }, { textAlign: "center" }]} numberOfLines={2}>{cp.name}</Text>
              </View>
            </Hover3DWrapper>
          );
        })}
      </View>
    </Animated.View>
  );

  const renderVendorList = () => (
    <Animated.View entering={FadeInDown.duration(400)} style={{ marginTop: hierarchyMode === 'Brand-wise' ? 24 : 0 }}>
      <SectionTitle title="Vendors" subtitle={hierarchyMode === 'Vendor-wise' ? "Select a vendor" : `Vendors for ${state.product?.name || ''}`} />
      <View style={styles.searchBar}>
        <Icons.MagnifyingGlass size={16} color={colors.textFaint} />
        <TextInput style={styles.searchInput} placeholder="Search vendors..." placeholderTextColor={colors.textFaint} value={search.vendor} onChangeText={(t) => setSearch({ ...search, vendor: t })} />
        {search.vendor ? <TouchableOpacity onPress={() => setSearch({ ...search, vendor: "" })}><Icons.XCircle size={16} color={colors.textMuted} weight="fill" /></TouchableOpacity> : null}
      </View>
      <View style={styles.gridList}>
        {(groupedVendors.length > 0 ? groupedVendors : MOCK_VENDORS).filter((v: any) => {
          const needsFilter = !!state.compPart || (hierarchyMode === "Brand-wise" && !!state.brand);
          const availableVendors = needsFilter
            ? Array.from(new Set(vendorAssetsData.filter(a => {
                if (state.compPart && (a.CompPart || a.COMPPART || a.Comppart) !== state.compPart.name) return false;
                if (hierarchyMode === "Brand-wise" && state.brand && (a.BRANDDESC || a.BrandDesc || a.Branddesc || a.brandDesc) !== state.brand.name) return false;
                return true;
              }).map(a => a.LIFNR || a.Lifnr).filter(Boolean)))
            : null;
          if (availableVendors && !availableVendors.includes(v.id)) return false;
          return v.name.toLowerCase().includes(search.vendor.toLowerCase()) || v.id.toLowerCase().includes(search.vendor.toLowerCase());
        }).map((v: any) => {
          const isSelected = state.vendor?.id === v.id;
          return (
            <Hover3DWrapper key={v.id} onPress={() => handleSelectVendor(v)}>
              <View style={[styles.boxCard3D, shadow.soft, isSelected && styles.boxCardSelected3D, { width: tileWidth, padding: isTablet ? 20 : 12 }]}>
                <View style={[styles.iconCircle, isSelected && { backgroundColor: colors.brand }, { width: iconWrapSize, height: iconWrapSize, borderRadius: iconWrapSize / 2 }]}><Icons.Buildings size={iconSize} color={isSelected ? "#fff" : colors.brand} weight={isSelected ? "fill" : "duotone"} /></View>
                <Text style={[styles.boxTitle, isSelected && { color: colors.brand }, { fontSize: isTablet ? font.body : font.sub }, { textAlign: "center" }]} numberOfLines={2}>{v.name}</Text>
                <Text style={[styles.boxSubtitle, { fontSize: isTablet ? font.sub : font.micro }]} numberOfLines={1}>{v.location}</Text>
              </View>
            </Hover3DWrapper>
          );
        })}
      </View>
    </Animated.View>
  );

  const renderBrandList = () => (
    <Animated.View entering={FadeInDown.duration(400)} style={{ marginTop: hierarchyMode === 'Vendor-wise' ? 24 : 0 }}>
      <SectionTitle title={hierarchyMode === 'Vendor-wise' ? `Brands (${state.assetType || ''})` : "Brands"} subtitle="Select a brand" />
      <View style={styles.searchBar}>
        <Icons.MagnifyingGlass size={16} color={colors.textFaint} />
        <TextInput style={styles.searchInput} placeholder="Search brands..." placeholderTextColor={colors.textFaint} value={search.brand} onChangeText={(t) => setSearch({ ...search, brand: t })} />
        {search.brand ? <TouchableOpacity onPress={() => setSearch({ ...search, brand: "" })}><Icons.XCircle size={16} color={colors.textMuted} weight="fill" /></TouchableOpacity> : null}
      </View>
      <View style={styles.gridList}>
        {(groupedBrands.length > 0 ? groupedBrands : MOCK_BRANDS).filter((b: any) => {
          const needsFilter = !!state.compPart || (hierarchyMode === "Vendor-wise" && !!state.vendor);
          const availableBrands = needsFilter
            ? Array.from(new Set(vendorAssetsData.filter(a => {
                if (state.compPart && (a.CompPart || a.COMPPART || a.Comppart) !== state.compPart.name) return false;
                if (hierarchyMode === "Vendor-wise" && state.vendor && (a.LIFNR || a.Lifnr) !== state.vendor.id) return false;
                return true;
              }).map(a => a.BRANDDESC || a.BrandDesc || a.Branddesc || a.brandDesc).filter(Boolean)))
            : null;
          if (availableBrands && !availableBrands.includes(b.id)) return false;
          return b.name.toLowerCase().includes(search.brand.toLowerCase());
        }).map((b: any) => {
          const isSelected = state.brand?.id === b.id;
          return (
            <Hover3DWrapper key={b.id} onPress={() => handleSelectBrand(b)}>
              <View style={[styles.boxCard3D, shadow.soft, isSelected && styles.boxCardSelected3D, { width: tileWidth, padding: isTablet ? 20 : 12 }]}>
                <View style={[styles.iconCircle, { backgroundColor: isSelected ? colors.info : colors.infoSoft, width: iconWrapSize, height: iconWrapSize, borderRadius: iconWrapSize / 2 }]}><Icons.Tag size={iconSize} color={isSelected ? "#fff" : colors.info} weight={isSelected ? "fill" : "duotone"} /></View>
                <Text style={[styles.boxTitle, isSelected && { color: colors.brand }, { fontSize: isTablet ? font.body : font.sub }, { textAlign: "center" }]} numberOfLines={2}>{b.name}</Text>
              </View>
            </Hover3DWrapper>
          );
        })}
      </View>
    </Animated.View>
  );

  const renderProductList = () => (
    <Animated.View entering={FadeInDown.duration(400)} style={{ marginTop: 24 }}>
      <SectionTitle title="Products" subtitle={`Products for ${state.brand?.name || ''}`} />
      <View style={styles.searchBar}>
        <Icons.MagnifyingGlass size={16} color={colors.textFaint} />
        <TextInput style={styles.searchInput} placeholder="Search products..." placeholderTextColor={colors.textFaint} value={search.product} onChangeText={(t) => setSearch({ ...search, product: t })} />
        {search.product ? <TouchableOpacity onPress={() => setSearch({ ...search, product: "" })}><Icons.XCircle size={16} color={colors.textMuted} weight="fill" /></TouchableOpacity> : null}
      </View>
      <View style={styles.gridList}>
        {MOCK_PRODUCTS.filter(p => p.name.toLowerCase().includes(search.product.toLowerCase()) || p.code.toLowerCase().includes(search.product.toLowerCase())).map((p) => {
          const isSelected = state.product?.id === p.id;
          return (
            <Hover3DWrapper key={p.id} onPress={() => handleSelectProduct(p)}>
              <View style={[styles.boxCard3D, shadow.soft, isSelected && styles.boxCardSelected3D, { width: tileWidth, padding: isTablet ? 20 : 12 }]}>
                <View style={[styles.iconCircle, { backgroundColor: isSelected ? colors.warning : colors.warningSoft, width: iconWrapSize, height: iconWrapSize, borderRadius: iconWrapSize / 2 }]}><Icons.Cube size={iconSize} color={isSelected ? "#fff" : colors.warning} weight={isSelected ? "fill" : "duotone"} /></View>
                <Text style={[styles.boxTitle, isSelected && { color: colors.brand }, { fontSize: isTablet ? font.body : font.sub }, { textAlign: "center" }]} numberOfLines={2}>{p.name}</Text>
                <Text style={[styles.boxSubtitle, { fontSize: isTablet ? font.sub : font.micro }]} numberOfLines={1}>{p.code}</Text>
              </View>
            </Hover3DWrapper>
          );
        })}
      </View>
    </Animated.View>
  );

  const renderAssetTabs = () => (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.assetTabsWrap}>
      <TouchableOpacity activeOpacity={0.8} onPress={() => handleSelectAssetType("Running Asset")} style={[styles.assetTab, state.assetType === "Running Asset" ? { backgroundColor: colors.success, borderColor: colors.success } : { borderColor: colors.successSoft }]}>
        <Icons.PlayCircle size={18} color={state.assetType === "Running Asset" ? "#fff" : colors.success} weight={state.assetType === "Running Asset" ? "fill" : "regular"} />
        <Text style={[styles.assetTabText, state.assetType === "Running Asset" ? { color: "#fff" } : { color: colors.success }]}>Running Asset</Text>
      </TouchableOpacity>
      <TouchableOpacity activeOpacity={0.8} onPress={() => handleSelectAssetType("NPA Asset")} style={[styles.assetTab, state.assetType === "NPA Asset" ? { backgroundColor: colors.danger, borderColor: colors.danger } : { borderColor: colors.dangerSoft }]}>
        <Icons.WarningCircle size={18} color={state.assetType === "NPA Asset" ? "#fff" : colors.danger} weight={state.assetType === "NPA Asset" ? "fill" : "regular"} />
        <Text style={[styles.assetTabText, state.assetType === "NPA Asset" ? { color: "#fff" } : { color: colors.danger }]}>NPA Asset</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderRegionList = () => {
    return (
      <Animated.View entering={FadeInDown.duration(400)} style={{ marginTop: 24 }}>
        <SectionTitle title="Region Type" subtitle="Domestic / International" />
        <View style={styles.gridList}>
          {['Domestic', 'International'].map((r) => {
            const isSelected = state.regionType === r;
            return (
              <Hover3DWrapper key={r} onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                Haptics.selectionAsync();
                setState({ ...state, regionType: r as "Domestic" | "International" });
                resetFromLevel(3);
              }}>
                <View style={[styles.boxCard3D, shadow.soft, isSelected && styles.boxCardSelected3D, { width: tileWidth, padding: isTablet ? 20 : 12 }]}>
                  <View style={[styles.iconCircle, { backgroundColor: isSelected ? colors.info : colors.infoSoft, width: iconWrapSize, height: iconWrapSize, borderRadius: iconWrapSize / 2 }]}><Icons.Globe size={iconSize} color={isSelected ? "#fff" : colors.info} weight={isSelected ? "fill" : "duotone"} /></View>
                  <Text style={[styles.boxTitle, isSelected && { color: colors.brand }, { fontSize: isTablet ? font.body : font.sub }, { textAlign: "center" }]} numberOfLines={1}>{r}</Text>
                </View>
              </Hover3DWrapper>
            );
          })}
        </View>
      </Animated.View>
    );
  };

  const renderCategoryList = () => (
    <Animated.View entering={FadeInDown.duration(400)} style={{ marginTop: 24 }}>
      <SectionTitle title="Mold Categories" subtitle="Injection / Cubic / Core Back" />
      <View style={styles.searchBar}>
        <Icons.MagnifyingGlass size={16} color={colors.textFaint} />
        <TextInput style={styles.searchInput} placeholder="Search categories..." placeholderTextColor={colors.textFaint} value={search.moldCategory} onChangeText={(t) => setSearch({ ...search, moldCategory: t })} />
        {search.moldCategory ? <TouchableOpacity onPress={() => setSearch({ ...search, moldCategory: "" })}><Icons.XCircle size={16} color={colors.textMuted} weight="fill" /></TouchableOpacity> : null}
      </View>
      <View style={styles.gridList}>
        {MOCK_CATEGORIES.filter(c => c.name.toLowerCase().includes(search.moldCategory.toLowerCase())).map((c) => {
          const isSelected = state.moldCategory?.id === c.id;
          return (
            <Hover3DWrapper key={c.id} onPress={() => handleSelectCategory(c)}>
              <View style={[styles.boxCard3D, shadow.soft, isSelected && styles.boxCardSelected3D, { width: tileWidth, padding: isTablet ? 20 : 12 }]}>
                <View style={[styles.iconCircle, { backgroundColor: isSelected ? colors.warning : colors.warningSoft, width: iconWrapSize, height: iconWrapSize, borderRadius: iconWrapSize / 2 }]}><Icons.Shapes size={iconSize} color={isSelected ? "#fff" : colors.warning} weight={isSelected ? "fill" : "duotone"} /></View>
                <Text style={[styles.boxTitle, isSelected && { color: colors.brand }, { fontSize: isTablet ? font.body : font.sub }, { textAlign: "center" }]} numberOfLines={1}>{c.name}</Text>
              </View>
            </Hover3DWrapper>
          );
        })}
      </View>
    </Animated.View>
  );

  const renderCriticalityList = () => (
    <Animated.View entering={FadeInDown.duration(400)} style={{ marginTop: 24 }}>
      <SectionTitle title="Criticality" subtitle="Major / Minor / Ok / Critical" />
      <View style={styles.searchBar}>
        <Icons.MagnifyingGlass size={16} color={colors.textFaint} />
        <TextInput style={styles.searchInput} placeholder="Search criticality..." placeholderTextColor={colors.textFaint} value={search.criticality} onChangeText={(t) => setSearch({ ...search, criticality: t })} />
        {search.criticality ? <TouchableOpacity onPress={() => setSearch({ ...search, criticality: "" })}><Icons.XCircle size={16} color={colors.textMuted} weight="fill" /></TouchableOpacity> : null}
      </View>
      <View style={styles.gridList}>
        {MOCK_CRITICALITIES.filter(c => c.name.toLowerCase().includes(search.criticality.toLowerCase())).map((c) => {
          const isSelected = state.criticality?.id === c.id;
          let tColor = colors.ink;
          if (c.name === "Ok") tColor = colors.success;
          if (c.name === "Critical") tColor = colors.danger;
          if (c.name === "Major") tColor = colors.warning;
          if (c.name === "Minor") tColor = colors.info;

          return (
            <Hover3DWrapper key={c.id} onPress={() => handleSelectCriticality(c)}>
              <View style={[styles.boxCard3D, shadow.soft, isSelected && styles.boxCardSelected3D, { width: tileWidth, padding: isTablet ? 20 : 12, borderColor: isSelected ? tColor : 'transparent' }]}>
                <View style={[styles.iconCircle, { backgroundColor: 'transparent', width: iconWrapSize, height: iconWrapSize, borderRadius: iconWrapSize / 2 }]}><Icons.Warning size={iconSize} color={tColor} weight={isSelected ? "fill" : "duotone"} /></View>
                <Text style={[styles.boxTitle, { color: tColor, fontSize: isTablet ? font.body : font.sub }, { textAlign: "center" }]} numberOfLines={1}>{c.name}</Text>
              </View>
            </Hover3DWrapper>
          );
        })}
      </View>
    </Animated.View>
  );

  const renderMoldList = () => (
    <Animated.View entering={FadeInDown.duration(400)} style={{ marginTop: 24 }}>
      <SectionTitle title="Molds" subtitle="Select to view inspection report" />
      <View style={styles.searchBar}>
        <Icons.MagnifyingGlass size={16} color={colors.textFaint} />
        <TextInput style={styles.searchInput} placeholder="Search molds..." placeholderTextColor={colors.textFaint} value={search.moldDetail} onChangeText={(t) => setSearch({ ...search, moldDetail: t })} />
        {search.moldDetail ? <TouchableOpacity onPress={() => setSearch({ ...search, moldDetail: "" })}><Icons.XCircle size={16} color={colors.textMuted} weight="fill" /></TouchableOpacity> : null}
      </View>
      <View style={styles.gridList}>
        {allMolds.filter((m: any) => {
          if (state.compPart && m.compPart !== state.compPart.name) return false;
          if (hierarchyMode === "Vendor-wise" && state.vendor && m.vendorId !== state.vendor.id) return false;
          if (hierarchyMode === "Vendor-wise" && state.brand && m.brandName !== state.brand.name) return false;
          if (hierarchyMode === "Brand-wise" && state.brand && m.brandName !== state.brand.name) return false;
          if (hierarchyMode === "Brand-wise" && state.vendor && m.vendorId !== state.vendor.id) return false;
          if (state.regionType) {
            const isDom = !isInternationalMold(m);
            if (state.regionType === "Domestic" && !isDom) return false;
            if (state.regionType === "International" && isDom) return false;
          }
          if (state.moldCategory && m.category !== state.moldCategory.id) return false;
          if (state.assetType && m.status !== state.assetType) return false;
          return m.moldCode.toLowerCase().includes(search.moldDetail.toLowerCase()) || m.moldDescription.toLowerCase().includes(search.moldDetail.toLowerCase());
        }).map((m: any) => {
          const isRunning = m.status === "Running Asset";
          const themeColor = isRunning ? colors.success : colors.danger;
          const themeSoftColor = isRunning ? colors.successSoft : colors.dangerSoft;

          return (
            <Hover3DWrapper key={m.moldCode} onPress={() => handleSelectMold(m)}>
              <View style={[styles.boxCard3D, shadow.soft, { borderColor: themeSoftColor, width: tileWidth, padding: isTablet ? 20 : 12 }]}>
                <View style={{ position: 'absolute', top: 10, right: 10, backgroundColor: themeSoftColor, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 }}><Text style={{ fontSize: 9, color: themeColor, fontWeight: 'bold' }}>₹{m.cost.toLocaleString('en-IN')}</Text></View>
                <View style={[styles.iconCircle, { backgroundColor: themeSoftColor, width: iconWrapSize, height: iconWrapSize, borderRadius: iconWrapSize / 2, marginTop: 10 }]}><Icons.ClipboardText size={iconSize} color={themeColor} weight="duotone" /></View>
                <Text style={[styles.boxTitle, { fontSize: isTablet ? font.body : font.sub }]} numberOfLines={1}>{m.moldDescription || "No Description"}</Text>
                <Text style={[styles.boxSubtitle, { fontSize: isTablet ? font.sub : font.micro }, { textAlign: "center", marginBottom: m.inspectionId ? 2 : 10 }]} numberOfLines={2}>{m.moldCode}</Text>
                {m.inspectionId ? <Text style={[styles.boxSubtitle, { fontSize: font.micro, fontWeight: '700', color: colors.brand, marginBottom: 8 }]}>Insp: {m.inspectionId}</Text> : null}
                <View style={[styles.viewReportBtn, { backgroundColor: themeSoftColor }]}><Text style={[styles.viewReportText, { color: themeColor }]}>View Report</Text></View>
              </View>
            </Hover3DWrapper>
          );
        })}
      </View>
    </Animated.View>
  );

  const renderVendorWiseFlow = () => (
    <>
      {!state.compPart && renderCompPartList()}
      {state.compPart && renderCompPartList()}
      {state.compPart && renderVendorList()}
      {state.vendor && renderBrandList()}
      {state.brand && renderRegionList()}
      {state.regionType && renderCategoryList()}
      {state.moldCategory && renderAssetTabs()}
      {state.assetType && renderMoldList()}
    </>
  );

  const renderBrandWiseFlow = () => (
    <>
      {!state.compPart && renderCompPartList()}
      {state.compPart && renderCompPartList()}
      {state.compPart && renderBrandList()}
      {state.brand && renderVendorList()}
      {state.vendor && renderCategoryList()}
      {state.moldCategory && renderAssetTabs()}
      {state.assetType && renderMoldList()}
    </>
  );

  // Brands Overview / Vendors Overview — top 10 by Acquisition Value (Running count as tie-breaker),
  // with "Show more" revealing the rest. A search always searches the full scoped list, not just
  // the top 10.
  const OVERVIEW_TOP_N = 10;
  const rankedBrandsOverview = rankByRunningAndValue(groupedBrandsScoped);
  const filteredBrandsOverview = rankedBrandsOverview.filter((brand: any) => brand.name.toLowerCase().includes(brandOverviewSearch.toLowerCase()));
  const visibleBrandsOverview = brandOverviewSearch || showAllBrandsOverview ? filteredBrandsOverview : filteredBrandsOverview.slice(0, OVERVIEW_TOP_N);

  const rankedVendorsOverview = rankByRunningAndValue(groupedVendorsScoped);
  const filteredVendorsOverview = rankedVendorsOverview.filter((vendor: any) => vendor.name.toLowerCase().includes(vendorOverviewSearch.toLowerCase()));
  const visibleVendorsOverview = vendorOverviewSearch || showAllVendorsOverview ? filteredVendorsOverview : filteredVendorsOverview.slice(0, OVERVIEW_TOP_N);

  // Jump to any dashboard section instead of scrolling past everything above it.
  const sectionNavItems = [
    { key: "org", label: "Organizational Overview", ref: orgOverviewRef },
    { key: "inspection", label: "Inspection & At-Risk Overview", ref: inspectionOverviewRef },
    { key: "criticality", label: "Criticality Overview", ref: criticalityOverviewRef },
    { key: "brands", label: "Brands Overview", ref: brandsOverviewRef },
    { key: "vendors", label: "Vendors Overview", ref: vendorsOverviewRef },
    { key: "portfolio", label: "Portfolio Insights", ref: portfolioInsightsRef },
    { key: "system", label: "System Overview", ref: systemOverviewRef },
    // Cost Analysis and Drilldown sections are commented out below, so they're dropped from the nav too.
  ];

  // Unique loading phase — while the first API response is in flight, show a dedicated loading
  // screen instead of the dashboard. groupedVendors/groupedBrands/allMolds fall back to MOCK_* data
  // when vendorAssetsData is empty, and that fallback must never flash on screen as if it were real.
  if (isLoading) {
    return (
      <View style={[styles.root, isTabletUp && { paddingLeft: SIDEBAR_WIDTH }, styles.loadingScreen]}>
        <StatusBar style="light" />
        <View style={styles.loadingIconWrap}>
          <Icons.SquaresFour size={36} color={colors.brand} weight="duotone" />
        </View>
        <ActivityIndicator size="large" color={colors.brand} style={{ marginTop: 24 }} />
        <Text style={styles.loadingTitle}>Loading Admin Dashboard</Text>
        <Text style={styles.loadingSubtitle}>Fetching live mould & vendor data…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, isTabletUp && { paddingLeft: SIDEBAR_WIDTH }]}>
      <StatusBar style="light" />

      {/* EMA — offline Q&A assistant over this page's own data */}
      <EmaAssistant molds={allMolds} />

      {/* GLOBAL TOOLTIP */}
      {globalTooltip && globalTooltip.visible && (
        <View style={[styles.globalTooltip, { top: globalTooltip.y, left: globalTooltip.x }]} pointerEvents="none">
          <Text style={styles.tooltipText}>{globalTooltip.text}</Text>
        </View>
      )}

      {/* FULL SCREEN WIDGET MODAL */}
      <Modal visible={!!expandedWidget} animationType="slide" transparent={false}>
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          {expandedWidget === 'system' && renderSystemOverview(true)}
          {expandedWidget === 'cost' && renderCostAnalysis(true)}

          {/* INDIVIDUAL CARD EXPANSION VIEWS */}
          {expandedWidget === 'vendors' && (
            <View style={{ flex: 1, padding: 40, paddingTop: Platform.OS === 'web' ? 80 : insets.top + 40, alignItems: 'center' }}>
              <View style={[styles.boxCard3D, shadow.soft, { flex: 1, width: '100%', maxWidth: 800, padding: 40 }]}>
                <View style={{ width: '100%', alignItems: 'center', marginBottom: 16 }}>
                  <Text style={{ fontSize: 24, fontWeight: font.bold, color: colors.ink }}>Vendors Overview</Text>
                  <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 6, fontWeight: 'bold' }}>Total: {vendorsRunning + vendorsNpa} Assets ({vendorsRunning} Running, {vendorsNpa} NPA)</Text>
                </View>
                <View style={{ flexDirection: 'row', paddingVertical: 16 }}>
                  <TouchableOpacity onPress={() => setShowVendorDropdown(true)} style={[styles.pillBtn, { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center' }]}>
                    <Text style={[styles.pillText, { color: '#fff', marginRight: 4 }]}>
                      Selected Vendors ({selectedVendors.length}/5)
                    </Text>
                    <Icons.CaretDown size={14} color="#fff" weight="bold" />
                  </TouchableOpacity>
                  {renderVendorDropdown()}
                </View>
                <View style={{ width: '100%', paddingHorizontal: 10 }}>
                  <HorizontalBarChart3D
                    data={vendorChartData.map((v: any) => ({ label: v.label, values: [v.running, v.npa] }))}
                    height={280}
                    colors={[colors.success, colors.danger]}
                    showLegend={false}
                  />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, marginTop: 16, justifyContent: 'center' }}>
                    {vendorChartData.map((v: any) => (
                      <ChartLegendChip key={v.id} label={v.label} val1={v.running} val2={v.npa} setGlobalTooltip={setGlobalTooltip} onPress={() => setChartDetail({ title: `Vendor: ${v.name}`, running: v.running, npa: v.npa, materials: v.materials })} />
                    ))}
                  </ScrollView>
                </View>
              </View>
            </View>
          )}

          {expandedWidget === 'brands' && (
            <View style={{ flex: 1, padding: 40, paddingTop: Platform.OS === 'web' ? 80 : insets.top + 40, alignItems: 'center' }}>
              <View style={[styles.boxCard3D, shadow.soft, { flex: 1, width: '100%', maxWidth: 800, padding: 40 }]}>
                <View style={{ width: '100%', alignItems: 'center', marginBottom: 16 }}>
                  <Text style={{ fontSize: 24, fontWeight: font.bold, color: colors.ink }}>Brands Overview</Text>
                  <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 6, fontWeight: 'bold' }}>Total: {brandsRunning + brandsNpa} Assets ({brandsRunning} Running, {brandsNpa} NPA)</Text>
                </View>
                <View style={{ flexDirection: 'row', paddingVertical: 16 }}>
                  <TouchableOpacity onPress={() => setShowBrandDropdown(true)} style={[styles.pillBtn, { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center' }]}>
                    <Text style={[styles.pillText, { color: '#fff', marginRight: 4 }]}>
                      Selected Brands ({selectedBrands.length}/5)
                    </Text>
                    <Icons.CaretDown size={14} color="#fff" weight="bold" />
                  </TouchableOpacity>
                  {renderBrandDropdown()}
                </View>
                <View style={{ width: '100%', paddingHorizontal: 10 }}>
                  <HorizontalBarChart3D
                    data={brandChartDataExpanded.map((b: any) => ({ label: b.label, values: [b.running, b.npa] }))}
                    height={280}
                    colors={[colors.success, colors.danger]}
                    showLegend={false}
                  />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, marginTop: 16, justifyContent: 'center' }}>
                    {brandChartDataExpanded.map((b: any) => (
                      <ChartLegendChip key={b.id} label={b.label} val1={b.running} val2={b.npa} setGlobalTooltip={setGlobalTooltip} onPress={() => setChartDetail({ title: `Brand: ${b.name}`, running: b.running, npa: b.npa, materials: b.materials })} />
                    ))}
                  </ScrollView>
                </View>
              </View>
            </View>
          )}

          <TouchableOpacity onPress={() => setExpandedWidget(null)} style={{ position: 'absolute', top: Platform.OS === 'web' ? 40 : insets.top + 20, right: 30, zIndex: 99, padding: 12, backgroundColor: '#fff', borderRadius: 30, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 }}>
            <Icons.X size={24} color={colors.ink} weight="bold" />
          </TouchableOpacity>
        </View>
      </Modal>

      {/* PURCHASE ORDER DETAILS MODAL */}
      <Modal visible={!!selectedCostItem} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: '85%', width: '90%', maxWidth: 600 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                Purchase Orders: {selectedCostItem?.label}
              </Text>
              <TouchableOpacity onPress={() => { setSelectedCostItem(null); setPoSearch(""); }}>
                <Icons.X size={24} color={colors.ink} />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchBar, { marginHorizontal: 0, marginTop: 0, borderRadius: 12, paddingVertical: 8 }]}>
              <Icons.MagnifyingGlass size={18} color={colors.textFaint} />
              <TextInput
                style={[styles.searchInput, { fontSize: 13 }]}
                placeholder="Search POs..."
                placeholderTextColor={colors.textFaint}
                value={poSearch}
                onChangeText={setPoSearch}
              />
            </View>

            <ScrollView showsVerticalScrollIndicator={true} style={{ flex: 1, marginTop: 12 }} contentContainerStyle={{ paddingBottom: 20 }}>
              {MOCK_PURCHASE_ORDERS.filter(po =>
                (po.vendorId === selectedCostItem?.label || po.entity.toLowerCase().includes((selectedCostItem?.label || '').toLowerCase())) &&
                (po.id.toLowerCase().includes(poSearch.toLowerCase()) || po.status.toLowerCase().includes(poSearch.toLowerCase()))
              ).map((po, idx) => (
                <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                  <View>
                    <Text style={{ fontWeight: 'bold', fontSize: 15, color: colors.ink }}>{po.id}</Text>
                    <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>{po.date}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontWeight: 'bold', fontSize: 15, color: colors.ink }}>₹{po.amount.toLocaleString('en-IN')}</Text>
                    <Text style={{ fontSize: 11, color: po.status === 'Fulfilled' ? colors.success : po.status === 'Cancelled' ? colors.danger : colors.warning, marginTop: 4, fontWeight: 'bold', textTransform: 'uppercase' }}>{po.status}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerIconWrap}>
            <Icons.SquaresFour size={24} color={colors.brand} weight="duotone" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={styles.headerKicker}>ADMIN DASHBOARD</Text>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveBadgeText}>LIVE</Text>
              </View>
            </View>
            <Text style={styles.headerTitle}>{currentLevel}</Text>
          </View>
        </View>

        {/* Hero KPI strip — real aggregate Running/NPA totals across every vendor group */}
        <View style={styles.heroStatsRow}>
          <View style={[styles.heroStatCard, { borderLeftColor: colors.brand }]}>
            <View style={[styles.heroStatIcon, { backgroundColor: colors.brandSoft }]}>
              <Icons.Cube size={16} color={colors.brand} weight="duotone" />
            </View>
            <View>
              <Text style={styles.heroStatValue}>{totalRunningAll + totalNpaAll}</Text>
              <Text style={styles.heroStatLabel}>Total Assets</Text>
            </View>
          </View>
          <View style={[styles.heroStatCard, { borderLeftColor: colors.success }]}>
            <View style={[styles.heroStatIcon, { backgroundColor: colors.successSoft }]}>
              <Icons.CheckCircle size={16} color={colors.success} weight="duotone" />
            </View>
            <View>
              <Text style={[styles.heroStatValue, { color: colors.success }]}>{totalRunningAll}</Text>
              <Text style={styles.heroStatLabel}>Running</Text>
            </View>
          </View>
          <View style={[styles.heroStatCard, { borderLeftColor: colors.danger }]}>
            <View style={[styles.heroStatIcon, { backgroundColor: colors.dangerSoft }]}>
              <Icons.WarningCircle size={16} color={colors.danger} weight="duotone" />
            </View>
            <View>
              <Text style={[styles.heroStatValue, { color: colors.danger }]}>{totalNpaAll}</Text>
              <Text style={styles.heroStatLabel}>NPA</Text>
            </View>
          </View>
        </View>

        {/* Clickable Breadcrumb — Component/Part is now the first crumb in both modes */}
        {state.compPart && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.breadcrumbScroll}>
            <View style={styles.breadcrumb}>
              <TouchableOpacity onPress={() => handleBreadcrumbClick(1)}>
                <Text style={styles.breadcrumbText}>{state.compPart?.name}</Text>
              </TouchableOpacity>
              {hierarchyMode === "Vendor-wise" ? (
                <>
                  {state.vendor && (
                    <>
                      <Icons.CaretRight size={14} color={colors.textFaint} weight="bold" />
                      <TouchableOpacity onPress={() => handleBreadcrumbClick(2)}>
                        <Text style={styles.breadcrumbText}>{state.vendor.name}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {state.brand && (
                    <>
                      <Icons.CaretRight size={14} color={colors.textFaint} weight="bold" />
                      <TouchableOpacity onPress={() => handleBreadcrumbClick(3)}>
                        <Text style={styles.breadcrumbText}>{state.brand.name}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {state.product && (
                    <>
                      <Icons.CaretRight size={14} color={colors.textFaint} weight="bold" />
                      <TouchableOpacity activeOpacity={1}>
                        <Text style={styles.breadcrumbText} numberOfLines={1}>{state.product.name}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </>
              ) : (
                <>
                  {state.brand && (
                    <>
                      <Icons.CaretRight size={14} color={colors.textFaint} weight="bold" />
                      <TouchableOpacity onPress={() => handleBreadcrumbClick(2)}>
                        <Text style={styles.breadcrumbText}>{state.brand.name}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {state.product && (
                    <>
                      <Icons.CaretRight size={14} color={colors.textFaint} weight="bold" />
                      <TouchableOpacity onPress={() => handleBreadcrumbClick(3)}>
                        <Text style={styles.breadcrumbText}>{state.product.name}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {state.vendor && (
                    <>
                      <Icons.CaretRight size={14} color={colors.textFaint} weight="bold" />
                      <TouchableOpacity onPress={() => handleBreadcrumbClick(3)}>
                        <Text style={styles.breadcrumbText}>{state.vendor.name}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {state.assetType && (
                    <>
                      <Icons.CaretRight size={14} color={colors.textFaint} weight="bold" />
                      <TouchableOpacity activeOpacity={1}>
                        <Text style={styles.breadcrumbText} numberOfLines={1}>{state.assetType}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </>
              )}
            </View>
          </ScrollView>
        )}
      </View>

      {/* MAIN CONTENT AREA */}
      {!expandedWidget && (
        <ScrollView ref={mainScrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}>

          {/* SECTION QUICK NAV — jump straight to any dashboard section instead of scrolling past
              everything above it. */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 20 }}>
            {sectionNavItems.map((item) => (
              <TouchableOpacity
                key={item.key}
                onPress={() => { setActiveNavSection(item.key); scrollToPanel(item.ref); }}
                style={[styles.pillBtn, activeNavSection === item.key && styles.pillBtnActive]}
              >
                <Text style={[styles.pillText, activeNavSection === item.key && styles.pillTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* ORGANIZATIONAL OVERVIEW — headline org-wide numbers shown first: Acquisition/Depreciation
              value, at-risk mould count per category segment, and Domestic/International Running/NPA
              split. Backs the same totals shown per-brand/per-vendor in Brands Overview & Vendors Overview. */}
          <View ref={orgOverviewRef} style={{ marginBottom: 24 }}>
            <SectionTitle title="Organizational Overview" subtitle="Acquisition, current & depreciated value, at-risk moulds, and domestic/international split" />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, paddingHorizontal: 20 }}>
              <View style={{ flex: 1, minWidth: 200 }}>
                <StatTile value={formatINR(totalAcquisitionValue)} label="Acquisition Value" subtitle="Original purchase cost of all moulds" icon={<Icons.Coins size={20} color={colors.info} weight="duotone" />} tint={colors.info} tintBg={colors.infoSoft} />
              </View>
              <View style={{ flex: 1, minWidth: 200 }}>
                <StatTile value={formatINR(totalDepreciationValue)} label="Current Asset Value" subtitle="Net book value of all moulds today" icon={<Icons.Wallet size={20} color={colors.success} weight="duotone" />} tint={colors.success} tintBg={colors.successSoft} />
              </View>
              <View style={{ flex: 1, minWidth: 200 }}>
                <StatTile value={formatINR(totalAcquisitionValue - totalDepreciationValue)} label="Depreciated Value" subtitle="Value lost to depreciation (Acquisition − Current)" icon={<Icons.TrendDown size={20} color={colors.warning} weight="duotone" />} tint={colors.warning} tintBg={colors.warningSoft} />
              </View>
              <View style={{ flex: 1, minWidth: 200 }}>
                <StatTile value={domesticRunning} label="Domestic Running" subtitle="Running moulds located in India" icon={<Icons.PlayCircle size={20} color={colors.success} weight="duotone" />} tint={colors.success} tintBg={colors.successSoft} />
              </View>
              <View style={{ flex: 1, minWidth: 200 }}>
                <StatTile value={domesticNpa} label="Domestic NPA" subtitle="Non-productive moulds located in India" icon={<Icons.WarningCircle size={20} color={colors.danger} weight="duotone" />} tint={colors.danger} tintBg={colors.dangerSoft} />
              </View>
              <View style={{ flex: 1, minWidth: 200 }}>
                <StatTile value={internationalRunning} label="International Running" subtitle="Running moulds located outside India" icon={<Icons.PlayCircle size={20} color={colors.success} weight="duotone" />} tint={colors.success} tintBg={colors.successSoft} />
              </View>
              <View style={{ flex: 1, minWidth: 200 }}>
                <StatTile value={internationalNpa} label="International NPA" subtitle="Non-productive moulds located outside India" icon={<Icons.WarningCircle size={20} color={colors.danger} weight="duotone" />} tint={colors.danger} tintBg={colors.dangerSoft} />
              </View>
            </View>
            {atRiskBySegment.length > 0 && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, paddingHorizontal: 20, marginTop: 12 }}>
                {atRiskBySegment.map((seg) => (
                  <View key={seg.key} style={{ flex: 1, minWidth: 200 }}>
                    <StatTile
                      value={seg.count}
                      label={`At-Risk — ${seg.label}`}
                      subtitle="Moulds with 20% or less of mould life or mould shots remaining"
                      icon={<Icons.Warning size={20} color={colors.danger} weight="duotone" />}
                      tint={colors.danger}
                      tintBg={colors.dangerSoft}
                    />
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* INSPECTION & AT-RISK OVERVIEW — merged, since both sections drill down by the exact
              same Brand/Sub Brand/Vendor/Region/Domestic-International criteria: one shared filter
              bar scopes both the inspection coverage stats AND the At-Risk ranking tiles below, so
              there's no need to filter twice. Inspected vs not-inspected material coverage
              (ZinspCount > 0), total inspections submitted, overdue/stale coverage (ZlastInsp older
              than 90 days or never inspected), and the org's most recent inspection date, plus the
              lowest remaining-life% / remaining-shots% moulds (NPA moulds excluded — retired,
              remaining life/shots isn't actionable for them). */}
          <View ref={inspectionOverviewRef} style={{ marginBottom: 24 }}>
            <SectionTitle title="Inspection & At-Risk Overview" subtitle="Coverage, submissions & at-risk ranking for Running Assets — filter once by Brand, Sub Brand, Vendor, Region & Domestic/International" />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14, paddingHorizontal: 20 }}>
              <View style={{ flex: 1, minWidth: 210 }}>
                <StatTile style={styles.inspectionTile} value={runningMolds.length} label="Running Materials" subtitle="Running assets due for inspection" icon={<Icons.Cube size={22} color={colors.brand} weight="duotone" />} tint={colors.brand} tintBg={colors.brandSoft} />
              </View>
              <View style={{ flex: 1, minWidth: 210 }}>
                <StatTile style={styles.inspectionTile} value={`${totalInspected} (${inspectionRate}%)`} label="Inspected" subtitle="Running assets with at least one inspection submitted" icon={<Icons.CheckCircle size={22} color={colors.success} weight="duotone" />} tint={colors.success} tintBg={colors.successSoft} />
              </View>
              <View style={{ flex: 1, minWidth: 210 }}>
                <StatTile style={styles.inspectionTile} value={totalNotInspected} label="Not Inspected" subtitle="Running assets with no inspection submitted yet" icon={<Icons.WarningCircle size={22} color={colors.warning} weight="duotone" />} tint={colors.warning} tintBg={colors.warningSoft} />
              </View>
              <View style={{ flex: 1, minWidth: 210 }}>
                <StatTile style={styles.inspectionTile} value={totalInspectionSubmissions} label="Total Inspections" subtitle="Sum of inspection submissions on running assets" icon={<Icons.ClipboardText size={22} color={colors.info} weight="duotone" />} tint={colors.info} tintBg={colors.infoSoft} />
              </View>
              <View style={{ flex: 1, minWidth: 210 }}>
                <StatTile style={styles.inspectionTile} value={overdueInspections} label="Overdue" subtitle={`Running assets not inspected in ${INSPECTION_STALE_DAYS}+ days, or never`} icon={<Icons.Warning size={22} color={colors.danger} weight="duotone" />} tint={colors.danger} tintBg={colors.dangerSoft} />
              </View>
              <View style={{ flex: 1, minWidth: 210 }}>
                <StatTile
                  style={styles.inspectionTile}
                  value={mostRecentInspectionDate ? mostRecentInspectionDate.toLocaleDateString("en-IN") : "N/A"}
                  label="Most Recent Inspection"
                  subtitle="Latest inspection date across running assets"
                  icon={<Icons.CalendarCheck size={22} color={colors.brand} weight="duotone" />}
                  tint={colors.brand}
                  tintBg={colors.brandSoft}
                />
              </View>
            </View>
            <View style={{ paddingHorizontal: 20 }}>
              <InspectionDimensionRow title="By Component/Part" items={drillByCompPart} selectedKey={drillCompPartFilter} onSelect={selectDrillCompPartFilter} secondaryLabel="at risk" />
              <InspectionDimensionRow title="By Brand" items={drillByBrand} selectedKey={drillBrandFilter} onSelect={selectDrillBrandFilter} secondaryLabel="at risk" />
              <InspectionDimensionRow title="By Sub Brand" items={drillBySubBrand} selectedKey={drillSubBrandFilter} onSelect={selectDrillSubBrandFilter} secondaryLabel="at risk" />
              <InspectionDimensionRow title="By Vendor" items={drillByVendor} selectedKey={drillVendorFilter} onSelect={selectDrillVendorFilter} secondaryLabel="at risk" />
              <InspectionDimensionRow title="By Region" items={drillByRegion} selectedKey={drillRegionFilter} onSelect={selectDrillRegionFilter} secondaryLabel="at risk" />
              <InspectionDimensionRow title="By Domestic / International" items={drillByDomesticIntl} selectedKey={drillDomIntlFilter} onSelect={selectDrillDomIntlFilter} secondaryLabel="at risk" />
            </View>
            <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
              <Text style={styles.inspectionDimensionLabel}>At-Risk Ranking (filtered by selection above)</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", gap: 16, marginTop: 8 }}>
                <TopAtRiskCard title="Remaining Mould Life" materials={drillFinalScope} remainingKey="remainingLife" totalKey="mouldLife" />
                <TopAtRiskCard title="Remaining Mould Shots" materials={drillFinalScope} remainingKey="remainingShots" totalKey="mouldShots" />
              </View>
            </View>
          </View>

          {/* CRITICALITY OVERVIEW — real Zcriticality values (grouped dynamically, no assumed scheme
              since we don't know this org's criticality codes/labels) instead of the old MOCK_MOLDS
              placeholder. */}
          {criticalityChartData.length > 0 && (
            <View ref={criticalityOverviewRef} style={{ marginBottom: 24 }}>
              <SectionTitle title="Criticality Overview" subtitle="Materials by criticality" />
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, paddingHorizontal: 20 }}>
                {criticalityChartData.map((c, i) => (
                  <View key={c.label} style={{ flex: 1, minWidth: 140 }}>
                    <StatTile
                      value={c.value}
                      label={c.label}
                      subtitle={`${Math.round((c.value / allMolds.length) * 100)}% of all materials`}
                      icon={<Icons.Warning size={18} color={LEVEL_ACCENTS[i % LEVEL_ACCENTS.length].icon} weight="duotone" />}
                      tint={LEVEL_ACCENTS[i % LEVEL_ACCENTS.length].icon}
                      tintBg={LEVEL_ACCENTS[i % LEVEL_ACCENTS.length].icon + "18"}
                    />
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* BRANDS OVERVIEW — real per-brand Running/NPA/Acquisition/Depreciation from groupedBrands
              (ZVendDashboardSet). Tapping a tile expands an inline panel right below the grid — no
              modal — showing that brand's Vendor breakdown, then each vendor's full material list. */}
          {groupedBrandsScoped.length > 0 && (
            <View ref={brandsOverviewRef} style={{ marginBottom: 24 }}>
              <SectionTitle title="Brands Overview" subtitle="Starts from Component/Part — tap a brand to see its vendor & material breakdown" />
              <View style={{ paddingHorizontal: 20 }}>
                <Text style={styles.inspectionDimensionLabel}>By Component/Part</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 8, paddingBottom: 4 }}>
                  {overviewCompPartOptions.map((opt) => (
                    <TouchableOpacity
                      key={opt.key}
                      onPress={() => {
                        setBrandsCompPartFilter((prev) => (prev === opt.key ? null : opt.key));
                        setShowAllBrandsOverview(false);
                      }}
                      style={[styles.pillBtn, brandsCompPartFilter === opt.key && styles.pillBtnActive]}
                    >
                      <Text style={[styles.pillText, brandsCompPartFilter === opt.key && styles.pillTextActive]}>{opt.label} ({opt.count})</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={[styles.searchBar, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}>
                <Icons.MagnifyingGlass size={18} color={colors.textFaint} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search brands..."
                  placeholderTextColor={colors.textFaint}
                  value={brandOverviewSearch}
                  onChangeText={setBrandOverviewSearch}
                />
                {!!brandOverviewSearch && (
                  <TouchableOpacity onPress={() => setBrandOverviewSearch("")}>
                    <Icons.XCircle size={18} color={colors.textFaint} weight="fill" />
                  </TouchableOpacity>
                )}
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14, paddingHorizontal: 20 }}>
                {visibleBrandsOverview.map((brand: any, i: number) => (
                  <EntityOverviewCard
                    key={brand.id}
                    entity={brand}
                    icon={Icons.Package}
                    accentIndex={i}
                    isSelected={expandedBrandId === brand.id}
                    onPress={() => toggleBrandDrilldown(brand.id)}
                  />
                ))}
              </View>
              {!brandOverviewSearch && !showAllBrandsOverview && filteredBrandsOverview.length > OVERVIEW_TOP_N && (
                <TouchableOpacity
                  onPress={() => setShowAllBrandsOverview(true)}
                  style={[styles.pillBtn, { alignSelf: "center", marginTop: 14 }]}
                >
                  <Text style={styles.pillText}>Show more ({filteredBrandsOverview.length - OVERVIEW_TOP_N} more)</Text>
                </TouchableOpacity>
              )}
              {!!expandedBrandId && (
                <View ref={brandPanelRef} style={{ paddingHorizontal: 20, marginTop: 14 }}>
                  <EntityDrilldownPanel
                    sectionLabel="Brands"
                    mode="Brand"
                    entityId={expandedBrandId}
                    entityDisplayName={expandedBrandId}
                    allMolds={allMolds}
                    onClose={() => setExpandedBrandId(null)}
                  />
                </View>
              )}
            </View>
          )}

          {/* VENDORS OVERVIEW — same pattern as Brands Overview, real data from groupedVendors: tap a tile
              to expand its inline panel — Brand breakdown, then each brand's full material list. */}
          {groupedVendorsScoped.length > 0 && (
            <View ref={vendorsOverviewRef} style={{ marginBottom: 24 }}>
              <SectionTitle title="Vendors Overview" subtitle="Starts from Component/Part — tap a vendor to see its brand & material breakdown" />
              <View style={{ paddingHorizontal: 20 }}>
                <Text style={styles.inspectionDimensionLabel}>By Component/Part</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 8, paddingBottom: 4 }}>
                  {overviewCompPartOptions.map((opt) => (
                    <TouchableOpacity
                      key={opt.key}
                      onPress={() => {
                        setVendorsCompPartFilter((prev) => (prev === opt.key ? null : opt.key));
                        setShowAllVendorsOverview(false);
                      }}
                      style={[styles.pillBtn, vendorsCompPartFilter === opt.key && styles.pillBtnActive]}
                    >
                      <Text style={[styles.pillText, vendorsCompPartFilter === opt.key && styles.pillTextActive]}>{opt.label} ({opt.count})</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View style={[styles.searchBar, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}>
                <Icons.MagnifyingGlass size={18} color={colors.textFaint} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search vendors..."
                  placeholderTextColor={colors.textFaint}
                  value={vendorOverviewSearch}
                  onChangeText={setVendorOverviewSearch}
                />
                {!!vendorOverviewSearch && (
                  <TouchableOpacity onPress={() => setVendorOverviewSearch("")}>
                    <Icons.XCircle size={18} color={colors.textFaint} weight="fill" />
                  </TouchableOpacity>
                )}
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14, paddingHorizontal: 20 }}>
                {visibleVendorsOverview.map((vendor: any, i: number) => (
                  <EntityOverviewCard
                    key={vendor.id}
                    entity={vendor}
                    icon={Icons.Buildings}
                    accentIndex={i + 2}
                    isSelected={expandedVendorId === vendor.id}
                    onPress={() => toggleVendorDrilldown(vendor.id)}
                  />
                ))}
              </View>
              {!vendorOverviewSearch && !showAllVendorsOverview && filteredVendorsOverview.length > OVERVIEW_TOP_N && (
                <TouchableOpacity
                  onPress={() => setShowAllVendorsOverview(true)}
                  style={[styles.pillBtn, { alignSelf: "center", marginTop: 14 }]}
                >
                  <Text style={styles.pillText}>Show more ({filteredVendorsOverview.length - OVERVIEW_TOP_N} more)</Text>
                </TouchableOpacity>
              )}
              {!!expandedVendorId && (() => {
                const vendor = groupedVendorsScoped.find((v: any) => v.id === expandedVendorId);
                return (
                  <View ref={vendorPanelRef} style={{ paddingHorizontal: 20, marginTop: 14 }}>
                    <EntityDrilldownPanel
                      sectionLabel="Vendors"
                      mode="Vendor"
                      entityId={expandedVendorId}
                      entityDisplayName={vendor?.name || expandedVendorId}
                      allMolds={allMolds}
                      onClose={() => setExpandedVendorId(null)}
                    />
                  </View>
                );
              })()}
            </View>
          )}

          {/* PORTFOLIO INSIGHTS — real KPI charts fed from already-computed groupedVendors/groupedBrands/allMolds values only.
              Criticality now has its own dedicated "Criticality Overview" section above (real Zcriticality
              values), so it isn't duplicated here as a chart. */}
          <View ref={portfolioInsightsRef} style={{ marginBottom: 24 }}>
            <SectionTitle title="Portfolio Insights" subtitle="Cost, depreciation, category & region" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 16, paddingBottom: 4 }}>
              <View style={[styles.boxCard3D, shadow.soft, { width: 260, padding: 20, alignItems: 'center' }]}>
                <Text style={styles.insightCardTitle}>Running vs NPA</Text>
                <PieChart3D
                  data={[
                    { label: "Running", value: totalRunningAll, color: colors.success },
                    { label: "NPA", value: totalNpaAll, color: colors.danger },
                  ]}
                  size={140}
                  depth={15}
                  showLegend={false}
                />
                <View style={{ flexDirection: 'row', gap: 16, marginTop: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success }} /><Text style={styles.insightLegendText}>Running ({totalRunningAll})</Text></View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.danger }} /><Text style={styles.insightLegendText}>NPA ({totalNpaAll})</Text></View>
                </View>
              </View>

              <View style={[styles.boxCard3D, shadow.soft, { width: 300, padding: 20 }]}>
                <Text style={styles.insightCardTitle}>Domestic vs International</Text>
                <GroupedBarChart
                  data={regionSplitChartData}
                  seriesLabels={["Running", "NPA"]}
                  colors={[colors.success, colors.danger]}
                  height={180}
                />
              </View>

              <View style={[styles.boxCard3D, shadow.soft, { width: 320, padding: 20, overflow: "hidden" }]}>
                <Text style={styles.insightCardTitle}>Cost by Vendor</Text>
                <BarChart data={vendorCostChartData} height={180} colors={[colors.success]} valueFormatter={formatINR} />
              </View>

              <View style={[styles.boxCard3D, shadow.soft, { width: 320, padding: 20, overflow: "hidden" }]}>
                <Text style={styles.insightCardTitle}>Depreciation by Vendor</Text>
                <BarChart data={vendorDeprChartData} height={180} colors={[colors.danger]} valueFormatter={formatINR} />
              </View>

              <View style={[styles.boxCard3D, shadow.soft, { width: 340, padding: 20, overflow: "hidden" }]}>
                <Text style={styles.insightCardTitle}>Assets by Category</Text>
                <BarChart data={categoryChartData} height={190} />
              </View>

              <View style={[styles.boxCard3D, shadow.soft, { width: 340, padding: 20, overflow: "hidden" }]}>
                <Text style={styles.insightCardTitle}>Assets by Region</Text>
                <BarChart data={regionChartData} height={190} />
              </View>
            </ScrollView>
          </View>

          <View ref={systemOverviewRef}>{renderSystemOverview()}</View>

          {/* INDIA ASSET MAP — not required, commented out. */}
          {/* <View style={{ paddingHorizontal: 20 }}>
            <GeoMap3D data={vendorAssetsData} />
          </View> */}

          {/* COST ANALYSIS — not required, commented out. */}
          {/* <View ref={costAnalysisRef}>{renderCostAnalysis()}</View> */}

          {/* HIERARCHY TOGGLE + DRILLDOWN (Brand-wise/Vendor-wise, starting from Component/Part) —
              not required, commented out. */}
          {/* <View ref={drilldownRef}>
            <View style={{ flexDirection: 'row', paddingHorizontal: 20, marginBottom: 20, marginTop: 10, gap: 12 }}>
              <TouchableOpacity onPress={() => { setHierarchyMode("Brand-wise"); setState({ compPart: null, vendor: null, assetType: null, brand: null, product: null, material: null }); }} style={[styles.pillBtn, hierarchyMode === "Brand-wise" && styles.pillBtnActive]}>
                <Text style={[styles.pillText, hierarchyMode === "Brand-wise" && styles.pillTextActive]}>Brand-wise Drilldown</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setHierarchyMode("Vendor-wise"); setState({ compPart: null, vendor: null, assetType: null, brand: null, product: null, material: null }); }} style={[styles.pillBtn, hierarchyMode === "Vendor-wise" && styles.pillBtnActive]}>
                <Text style={[styles.pillText, hierarchyMode === "Vendor-wise" && styles.pillTextActive]}>Vendor-wise Drilldown</Text>
              </TouchableOpacity>
            </View>

            {hierarchyMode === "Vendor-wise" ? renderVendorWiseFlow() : renderBrandWiseFlow()}
          </View> */}
        </ScrollView>
      )}

      {/* REPORT MODAL */}
      <ReportDetailsModal
        visible={!!state.material}
        report={state.material ? { Matnr: state.material.materialCode, Lifnr: state.vendor?.id, Maktx: state.material.materialDescription } : null}
        onClose={() => setState({ ...state, material: null })}
      />

      {/* CHART DETAILS MODAL — one row per material, Running/NPA indicated per row */}
      <Modal visible={!!chartDetail} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <Text style={styles.modalTitle} numberOfLines={2}>{chartDetail?.title}</Text>

            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 24, marginBottom: 12 }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: colors.success, fontSize: 24, fontWeight: 'bold' }}>{chartDetail?.running}</Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>Running</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: colors.danger, fontSize: 24, fontWeight: 'bold' }}>{chartDetail?.npa}</Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>NPA</Text>
              </View>
            </View>

            {chartDetail?.materials && (
              <View style={{ flex: 1, width: '100%' }}>
                <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                    <Text style={styles.drilldownSectionLabel}>
                      {chartDetail.materials.length} Material{chartDetail.materials.length === 1 ? "" : "s"}
                    </Text>
                    <MaterialListActions
                      materials={chartDetail.materials}
                      exportName={`${chartDetail.title}-materials`.replace(/[^a-z0-9-]+/gi, "_")}
                      printTitle={`${chartDetail.title} — Materials`}
                    />
                  </View>
                  <View style={{ marginTop: 10 }}>
                    <MaterialsTable materials={chartDetail.materials} />
                  </View>
                  <MaterialLifeShotsCharts materials={chartDetail.materials} />
                </ScrollView>
              </View>
            )}

            <TouchableOpacity style={styles.closeBtn} onPress={() => setChartDetail(null)}>
              <Text style={styles.closeBtnText}>Close Details</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTop: { flexDirection: "row", alignItems: "center" },
  headerIconWrap: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brandSoft,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.brand + "30",
  },
  headerKicker: { color: colors.textMuted, fontSize: font.micro, fontWeight: font.bold, letterSpacing: 1 },
  headerTitle: { color: colors.ink, fontSize: 24, fontWeight: font.black, marginTop: 2 },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, height: 18, borderRadius: radius.pill, backgroundColor: colors.successSoft },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.success },
  liveBadgeText: { color: colors.success, fontSize: 9, fontWeight: font.black, letterSpacing: 0.5 },

  breadcrumbScroll: { marginTop: 16 },
  breadcrumb: { flexDirection: "row", alignItems: "center", gap: 6 },
  breadcrumbText: { color: colors.ink, fontSize: font.sub, fontWeight: font.semibold },

  heroStatsRow: { flexDirection: "row", gap: 10, marginTop: 18 },
  heroStatCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderRadius: radius._12,
    padding: 10,
  },
  heroStatIcon: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  heroStatValue: { color: colors.ink, fontSize: 17, fontWeight: font.black },
  heroStatLabel: { color: colors.textMuted, fontSize: 10, fontWeight: font.semibold, marginTop: 1 },

  chartLegendChip: {
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius._15,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 80,
  },
  chartLegendChipLabel: { fontSize: font.micro, fontWeight: font.bold, color: colors.ink },

  insightCardTitle: { fontSize: font.sub, fontWeight: font.bold, color: colors.ink, marginBottom: 12 },

  // At-Risk Moulds card — page-size selector + prev/next pagination footer
  atRiskPageSizeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  atRiskPageSizeLabel: { fontSize: font.micro, color: colors.textFaint, fontWeight: font.semibold },
  atRiskPageSizeBtn: {
    minWidth: 32,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  atRiskPageSizeBtnActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  atRiskPageSizeBtnText: { fontSize: font.micro, fontWeight: font.bold, color: colors.textMuted },
  atRiskPageSizeBtnTextActive: { color: "#fff" },
  atRiskPaginationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  atRiskPaginationLabel: { fontSize: font.micro, color: colors.textMuted, fontWeight: font.semibold },
  atRiskPageNavBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  atRiskPageNavBtnDisabled: { opacity: 0.4 },
  insightLegendText: { fontSize: font.micro, color: colors.textMuted, fontWeight: font.medium },
  brandMetricLabel: { fontSize: font.micro, color: colors.textFaint, fontWeight: font.semibold, textTransform: "uppercase" },
  brandMetricValue: { fontSize: font.sub, color: colors.ink, fontWeight: font.black, marginTop: 2 },

  // Inline Brand/Vendor Overview drill-down panel
  drilldownPanel: { width: "100%", padding: 18, alignItems: "flex-start" },
  drilldownBreadcrumb: { flexDirection: "row", alignItems: "center", gap: 6, width: "100%" },
  drilldownCrumbLink: { color: colors.brand, fontSize: font.sub, fontWeight: font.bold },
  drilldownCrumbActive: { color: colors.ink, fontSize: font.sub, fontWeight: font.black, flexShrink: 1 },
  drilldownSectionLabel: { fontSize: font.micro, color: colors.textFaint, fontWeight: font.bold, textTransform: "uppercase", letterSpacing: 0.4 },
  drilldownRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius._12,
    padding: 12,
  },
  drilldownRowTitle: { fontSize: font.body, fontWeight: font.bold, color: colors.ink },

  // Compact materials table (inside the drill-down panel / chart-tap popup material list) —
  // one row per material, every field its own column.
  materialStatusDot: { width: 8, height: 8, borderRadius: 4 },
  materialStatusPill: { paddingHorizontal: 6, height: 18, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  materialTableHeaderRow: {
    flexDirection: "row",
    gap: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  materialTableHeaderCell: { fontSize: 9, color: colors.textFaint, fontWeight: font.semibold, textTransform: "uppercase" },
  // Frozen Status/Material/Code block to the left of the horizontally-scrollable rest of the
  // table — a plain sibling View (not CSS `position: sticky`), so it behaves identically on
  // native and web and never scrolls out of view.
  materialTableFrozen: {
    borderRightWidth: 1,
    borderRightColor: colors.border,
    backgroundColor: colors.surface,
    paddingRight: 12,
    marginRight: 12,
    zIndex: 1,
  },

  // Per-material Remaining Life / Remaining Shots mini bar chart card
  materialChartCard: {
    width: 260,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius._12,
    padding: 12,
  },
  materialChartTitle: { fontSize: font.sub, fontWeight: font.bold, color: colors.ink },
  materialChartSubtitle: { fontSize: font.micro, color: colors.textMuted, marginTop: 2, fontWeight: font.medium },

  // Inspection Overview — coverage chips (label + fraction + inspected/not-inspected bar)
  inspectionDimensionLabel: { fontSize: font.sub, color: colors.ink, fontWeight: font.black, textTransform: "uppercase", letterSpacing: 0.4 },
  inspectionDimensionSearch: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    height: 38,
    minWidth: 190,
  },
  inspectionDimensionSearchInput: { flex: 1, fontSize: font.sub, color: colors.ink, outlineStyle: "none" as any },
  inspectionDimensionClear: {
    backgroundColor: colors.brandSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    height: 22,
    justifyContent: "center",
  },
  inspectionDimensionClearText: { fontSize: font.micro, fontWeight: font.bold, color: colors.brand },
  inspectionChip: {
    width: 210,
    minHeight: 92,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius._15,
    padding: 14,
    position: "relative",
    ...shadow.soft,
  },
  inspectionChipSelected: { borderColor: colors.brand, backgroundColor: colors.brandSoft + "40" },
  // Flags a By Brand/Sub Brand/Vendor/Region chip that has at least one at-risk mould in it,
  // so risk is visible at a glance across the whole row of chips, not just in the text below.
  inspectionChipAtRisk: { borderColor: colors.danger, backgroundColor: colors.dangerSoft + "30" },
  inspectionChipCheck: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  inspectionChipLabel: { fontSize: font.body, fontWeight: font.black, color: colors.ink },
  inspectionChipValue: { fontSize: font.sub, color: colors.textBody, fontWeight: font.bold, marginTop: 4, marginBottom: 10 },
  inspectionChipTrack: { height: 10, borderRadius: 5, backgroundColor: colors.dangerSoft, overflow: "hidden" },

  // Highlighted Running/NPA/Value/Depreciation stat chips (row-level + scope-summary variants)
  rowStatChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  rowStatChipLarge: { paddingHorizontal: 12, paddingVertical: 6 },
  rowStatChipText: { fontSize: 10, fontWeight: font.black },
  rowStatChipTextLarge: { fontSize: font.sub, fontWeight: font.black },

  // Export Excel / Print buttons on a material list header
  listActionBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill },
  listActionBtnText: { fontSize: font.micro, fontWeight: font.bold },
  meterTrack: { height: 10, borderRadius: 5, backgroundColor: colors.border, overflow: "hidden", width: "100%" },
  meterFill: { height: "100%", borderRadius: 5 },
  materialTableRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  materialTableCell: { fontSize: font.micro, color: colors.ink, fontWeight: font.semibold },

  content: { paddingVertical: 20 },

  inspectionTile: { padding: 18, minHeight: 128 },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: radius._15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: font.body,
    color: colors.ink,
    outlineStyle: "none" as any,
  },

  pillBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  pillBtnActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  pillText: { fontSize: font.sub, color: colors.textMuted, fontWeight: font.bold },
  pillTextActive: { color: '#fff' },

  loadingScreen: {
    alignItems: "center",
    justifyContent: "center",
  },
  loadingIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingTitle: {
    marginTop: 20,
    fontSize: font.title,
    fontWeight: font.black,
    color: colors.ink,
  },
  loadingSubtitle: {
    marginTop: 6,
    fontSize: font.sub,
    color: colors.textMuted,
    fontWeight: font.semibold,
  },

  gridList: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    gap: 12,
    paddingBottom: 10
  },

  boxCard3D: {
    height: "auto",
    minHeight: 150,
    backgroundColor: colors.surface,
    borderRadius: radius._20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  boxCardSelected3D: {
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
  },
  iconCircle: {
    backgroundColor: colors.brandSoft,
    alignItems: "center", justifyContent: "center",
    marginBottom: 10,
  },
  boxTitle: { fontSize: font.sub, fontWeight: font.bold, color: colors.ink, marginBottom: 4 },
  boxSubtitle: { fontSize: font.micro, color: colors.textMuted },

  assetTabsWrap: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginTop: 24,
    gap: 12,
  },
  assetTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderRadius: radius._15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  assetTabActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  assetTabText: { fontSize: font.sub, fontWeight: font.bold, color: colors.textMuted },
  assetTabTextActive: { color: "#fff" },

  viewReportBtn: {
    backgroundColor: colors.brandSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    marginTop: 10,
  },
  viewReportText: { fontSize: font.micro, color: colors.brand, fontWeight: font.bold },

  globalTooltip: {
    position: 'absolute',
    backgroundColor: colors.ink,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    zIndex: 99999,
    elevation: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  tooltipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },

  modernCard: {
    backgroundColor: '#ffffff',
    borderRadius: 32,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
  },
  modernPillBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
  modernPillBtnActive: {
    backgroundColor: colors.ink,
  },
  modernPillText: {
    fontSize: font.body,
    color: colors.textMuted,
    fontWeight: '700',
  },
  modernPillTextActive: {
    color: '#ffffff',
  },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center'
  },
  modalContent: {
    backgroundColor: '#fff', borderRadius: radius._20, padding: 24, width: '80%', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 10
  },
  modalTitle: { fontSize: font.h3, fontWeight: font.bold, color: colors.ink },
  closeBtn: { marginTop: 24, backgroundColor: colors.surfaceAlt, paddingVertical: 12, borderRadius: radius.pill, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  closeBtnText: { fontSize: font.body, fontWeight: font.bold, color: colors.ink },
});
