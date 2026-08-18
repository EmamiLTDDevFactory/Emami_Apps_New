import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import * as Icons from "phosphor-react-native";
import React, { useEffect, useRef, useState } from "react";
import { LayoutAnimation, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, UIManager, View } from "react-native";
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import GeoMap3D from "@/components/ui/GeoMap3D";
import GlassSurface from "@/components/ui/GlassSurface";
import ReportDetailsModal from "@/components/ui/ReportDetailsModal";
import SectionTitle from "@/components/ui/SectionTitle";
import StatTile from "@/components/ui/StatTile";
import { BarChart, DonutChart, GroupedBarChart, StackedBarChart, PieChart3D, HorizontalBarChart3D } from "@/components/ui/charts";
import { chartPalette, colors, font, gradients, radius, shadow } from "@/constants/theme";
import { api } from "@/lib/config";
import { useBreakpoint } from "@/utils/responsive";

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

// --- FUTURISTIC ACCORDION COLOR SCHEME ---
const LEVEL_ACCENTS = [
  { gradient: ['#6366F1', '#8B5CF6'], glow: 'rgba(99,102,241,0.25)', bg: 'rgba(99,102,241,0.06)', icon: '#6366F1' },  // L0: Indigo-Violet
  { gradient: ['#0EA5E9', '#06B6D4'], glow: 'rgba(14,165,233,0.25)', bg: 'rgba(14,165,233,0.06)', icon: '#0EA5E9' },  // L1: Sky-Cyan
  { gradient: ['#F59E0B', '#F97316'], glow: 'rgba(245,158,11,0.25)', bg: 'rgba(245,158,11,0.06)', icon: '#F59E0B' },  // L2: Amber-Orange
  { gradient: ['#10B981', '#34D399'], glow: 'rgba(16,185,129,0.25)', bg: 'rgba(16,185,129,0.06)', icon: '#10B981' },  // L3: Emerald-Teal
  { gradient: ['#EC4899', '#F43F5E'], glow: 'rgba(236,72,153,0.25)', bg: 'rgba(236,72,153,0.06)', icon: '#EC4899' },  // L4: Pink-Rose
];

const AccordionNode = ({ title, subtitle, value, depr, isExpanded, onToggle, children, level = 0, isMaterial = false, statusColor, materialData, searchKey, searchValue, onSearchChange }: any) => {
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

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View style={{
              alignItems: 'flex-end',
              backgroundColor: 'rgba(16,185,129,0.08)',
              paddingHorizontal: 12, paddingVertical: 6,
              borderRadius: 10,
            }}>
              <Text style={{ fontSize: 9, color: '#059669', textTransform: 'uppercase', fontWeight: '900', letterSpacing: 0.8 }}>Acquisition</Text>
              <Text style={{ fontSize: 14, fontWeight: '900', color: '#059669', marginTop: 1 }}>₹{value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
            </View>
            {depr !== undefined && (
              <View style={{
                alignItems: 'flex-end',
                backgroundColor: 'rgba(244,63,94,0.08)',
                paddingHorizontal: 12, paddingVertical: 6,
                borderRadius: 10,
              }}>
                <Text style={{ fontSize: 9, color: '#E11D48', textTransform: 'uppercase', fontWeight: '900', letterSpacing: 0.8 }}>Depreciation</Text>
                <Text style={{ fontSize: 14, fontWeight: '900', color: '#E11D48', marginTop: 1 }}>₹{Math.abs(depr).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>

      {isExpanded && isMaterial && materialData && (
        <View style={{
          marginTop: 10,
          padding: 24,
          backgroundColor: '#0F172A',
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
  const [search, setSearch] = useState({ vendor: "", brand: "", product: "", region: "", moldCategory: "", criticality: "", moldDetail: "" });

  const [chartDetail, setChartDetail] = useState<any>(null);
  const [globalTooltip, setGlobalTooltip] = useState<{ visible: boolean, text: string, x: number, y: number } | null>(null);

  const [vendorAssetsData, setVendorAssetsData] = useState<any[]>([]);

  useEffect(() => {
    const fetchVendorData = async () => {
      try {
        const res = await api.get('/ZMM_MOULD_CARE_SRV/ZVendDashboardSet');
        console.log(res)
        setVendorAssetsData(res.data?.d?.results || []);
      } catch (err) {
        console.error("Failed to fetch vendor dashboard data", err);
      }
    };
    fetchVendorData();
  }, []);

  //console.log('Response', res.data?.d?.dashboardData);
  const groupedVendors = React.useMemo(() => {
    if (vendorAssetsData.length === 0) return [];
    const groups: Record<string, { id: string, name: string, running: number, npa: number, totalCost: number, materials: any[] }> = {};
    vendorAssetsData.forEach(asset => {
      const lifnr = asset.LIFNR || asset.Lifnr;
      const name1 = asset.NAME1 || asset.Name1;
      const zrunning = asset.ZRUNNING || asset.Zrunning;
      const znpa = asset.ZNPA || asset.Znpa;
      const matnr = asset.MATNR || asset.Matnr;
      const maktx = asset.MAKTX || asset.Maktx;
      const kansw = parseFloat(asset.KANSW || asset.Kansw || "0");

      if (!lifnr) return; // Skip if no valid vendor ID

      if (!groups[lifnr]) {
        groups[lifnr] = { id: lifnr, name: name1 || `Vendor ${lifnr}`, running: 0, npa: 0, totalCost: 0, materials: [] };
      }
      if (zrunning === 'X') groups[lifnr].running += 1;
      if (znpa === 'X') groups[lifnr].npa += 1;
      groups[lifnr].totalCost += kansw;
      groups[lifnr].materials.push({
        moldCode: matnr,
        description: maktx,
        status: zrunning === 'X' ? 'Running Asset' : 'NPA Asset',
        cost: kansw,
        assetNumber: asset.ANLN1 || asset.Anln1 || "N/A",
        acqYear: asset.ZUJHR || asset.Zujhr || "N/A",
        acqDate: asset.AIBDT || asset.Aibdt || "N/A",
        depreciation: parseFloat(asset.KNAFA || asset.Knafa || "0"),
        brandName: asset.BRANDDESC || asset.BrandDesc || asset.Branddesc || asset.brandDesc || "Unknown",
        vendorId: lifnr,
        vendorName: name1,
        category: `C${asset.ZzmoldCat || "1"}`
      });
    });
    return Object.values(groups);
  }, [vendorAssetsData]);

  const groupedBrands = React.useMemo(() => {
    if (vendorAssetsData.length === 0) return [];
    const groups: Record<string, { id: string, name: string, running: number, npa: number, totalCost: number, materials: any[] }> = {};
    vendorAssetsData.forEach(asset => {
      const brandDesc = asset.BRANDDESC || asset.BrandDesc || asset.Branddesc || asset.brandDesc;
      if (!brandDesc) return;

      const zrunning = asset.ZRUNNING || asset.Zrunning;
      const znpa = asset.ZNPA || asset.Znpa;
      const matnr = asset.MATNR || asset.Matnr;
      const maktx = asset.MAKTX || asset.Maktx;
      const kansw = parseFloat(asset.KANSW || asset.Kansw || "0");

      if (!groups[brandDesc]) {
        groups[brandDesc] = { id: brandDesc, name: brandDesc, running: 0, npa: 0, totalCost: 0, materials: [] };
      }
      if (zrunning === 'X') groups[brandDesc].running += 1;
      if (znpa === 'X') groups[brandDesc].npa += 1;
      groups[brandDesc].totalCost += kansw;
      groups[brandDesc].materials.push({
        moldCode: matnr,
        description: maktx,
        status: zrunning === 'X' ? 'Running Asset' : 'NPA Asset',
        cost: kansw,
        assetNumber: asset.ANLN1 || asset.Anln1 || "N/A",
        acqYear: asset.ZUJHR || asset.Zujhr || "N/A",
        acqDate: asset.AIBDT || asset.Aibdt || "N/A",
        depreciation: parseFloat(asset.KNAFA || asset.Knafa || "0"),
        brandName: brandDesc,
        vendorId: asset.LIFNR || asset.Lifnr || "",
        vendorName: asset.NAME1 || asset.Name1 || "",
        category: `C${asset.ZzmoldCat || "1"}`
      });
    });
    return Object.values(groups);
  }, [vendorAssetsData]);

  const allMolds = React.useMemo(() => {
    if (vendorAssetsData.length === 0) return MOCK_MOLDS;
    return vendorAssetsData.map(asset => ({
      moldCode: asset.MATNR || asset.Matnr || "",
      moldDescription: asset.MAKTX || asset.Maktx || "",
      status: (asset.ZRUNNING || asset.Zrunning) === 'X' ? 'Running Asset' : 'NPA Asset',
      cost: parseFloat(asset.KANSW || asset.Kansw || "0"),
      assetNumber: asset.ANLN1 || asset.Anln1 || "N/A",
      acqYear: asset.ZUJHR || asset.Zujhr || "N/A",
      acqDate: asset.AIBDT || asset.Aibdt || "N/A",
      depreciation: parseFloat(asset.KNAFA || asset.Knafa || "0"),
      region: asset.VendRegion || "Unknown",
      country: asset.COUNTRY || asset.Country || "IN",
      vendorId: asset.LIFNR || asset.Lifnr || "",
      brandName: asset.BRANDDESC || asset.BrandDesc || asset.Branddesc || asset.brandDesc || "",
      category: `C${asset.ZzmoldCat || "1"}`,
      criticality: "CR3",
      // New Detailed Fields
      runner: asset.Zzrunner || "02",
      grade: asset.Zzgran || "09",
      runningCav: asset.ZzrunCavity || "00016",
      efficiency: asset.Zzefficiency || asset.Efficiency || "0.95",
      hoursDay: asset.ZzhoursDay || "22.00",
      designCode: asset.ZzdesignCode || asset.DesignCode || "0000000017",
      mouldLife: asset.ZzmouldLife || asset.MouldLife || "5",
      mouldShots: asset.ZzmouldShots || asset.MouldShots || ".1995",
    }));
  }, [vendorAssetsData]);

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
  const [costFilter, setCostFilter] = useState<"Vendor" | "Brand" | "Product" | "Material">("Vendor");
  const [costSearch, setCostSearch] = useState("");
  const [selectedCostItem, setSelectedCostItem] = useState<{ label: string, filterType: string } | null>(null);
  const [poSearch, setPoSearch] = useState("");

  const generateCostData = () => {
    if (costFilter === "Vendor") return (groupedVendors.length > 0 ? groupedVendors : MOCK_VENDORS).map((v: any, i: number) => ({ label: v.name.split(" ")[0], value: v.totalCost || (12000 + (i * 5000)), materials: v.materials }));
    if (costFilter === "Brand") return (groupedBrands.length > 0 ? groupedBrands : MOCK_BRANDS).map((b: any, i: number) => ({ label: b.name.split(" ")[0] || b.name, value: b.totalCost || (8000 + (i * 3000)), materials: b.materials }));
    // if (costFilter === "Product") return MOCK_PRODUCTS.map((p, i) => ({ label: p.code.split("-")[1], value: 4000 + (i * 1500), materials: MOCK_MOLDS }));
    return allMolds.map((m: any) => ({ label: m.moldCode, value: m.cost, materials: [m] }));
  };

  const allCostData = generateCostData();
  const costData = allCostData.filter(d => d.label.toLowerCase().includes(costSearch.toLowerCase()));
  const maxCost = Math.max(...allCostData.map(d => d.value)) * 1.2;

  const resetFromLevel = (level: number) => {
    if (hierarchyMode === "Vendor-wise") {
      if (level <= 1) setState(s => ({ ...s, brand: null, regionType: null, moldCategory: null, assetType: null, material: null }));
      else if (level <= 2) setState(s => ({ ...s, regionType: null, moldCategory: null, assetType: null, material: null }));
      else if (level <= 3) setState(s => ({ ...s, moldCategory: null, assetType: null, material: null }));
      else if (level <= 4) setState(s => ({ ...s, assetType: null, material: null }));
      else if (level <= 5) setState(s => ({ ...s, material: null }));
    } else {
      if (level <= 1) setState(s => ({ ...s, vendor: null, moldCategory: null, assetType: null, material: null }));
      else if (level <= 2) setState(s => ({ ...s, moldCategory: null, assetType: null, material: null }));
      else if (level <= 3) setState(s => ({ ...s, assetType: null, material: null }));
      else if (level <= 4) setState(s => ({ ...s, material: null }));
    }
  };

  const handleBreadcrumbClick = (level: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.selectionAsync();
    resetFromLevel(level);
  };

  const handleSelectVendor = (v: any) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.selectionAsync();
    setState({ ...state, vendor: v });
    resetFromLevel(hierarchyMode === "Vendor-wise" ? 1 : 4);
  };
  const handleSelectBrand = (b: any) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.selectionAsync();
    setState({ ...state, brand: b });
    resetFromLevel(hierarchyMode === "Vendor-wise" ? 2 : 1);
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
    resetFromLevel(5);
  };
  const handleSelectAssetType = (type: "Running Asset" | "NPA Asset") => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.selectionAsync();
    setState({ ...state, assetType: type });
    resetFromLevel(6);
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
    ? (state.criticality ? "Molds" : state.assetType ? "Criticality" : state.moldCategory ? "Asset Types" : state.region ? "Categories" : state.product ? "Regions" : state.brand ? "Products" : state.vendor ? "Brands" : "Vendors")
    : (state.criticality ? "Molds" : state.assetType ? "Criticality" : state.moldCategory ? "Asset Types" : state.vendor ? "Categories" : state.region ? "Vendors" : state.product ? "Regions" : state.brand ? "Products" : "Brands");

  // Criticality calculations for dashboard
  const critCritical = MOCK_MOLDS.filter(m => m.criticality === "CR4").length;
  const critMajor = MOCK_MOLDS.filter(m => m.criticality === "CR1").length;
  const critMinor = MOCK_MOLDS.filter(m => m.criticality === "CR2").length;
  const critOk = MOCK_MOLDS.filter(m => m.criticality === "CR3").length;

  // --- CALCULATED VALUES FOR WIDGETS AND MODALS ---
  const filteredVendors = MOCK_VENDORS.filter(v => selectedVendors.includes(v.id));
  const vendorsRunning = vendorAssetsData.length > 0
    ? vendorAssetsData.filter(a => selectedVendors.includes(a.LIFNR || a.Lifnr)).filter(a => (a.ZRUNNING || a.Zrunning) === 'X').length
    : filteredVendors.reduce((acc, v) => acc + 60 + (MOCK_VENDORS.indexOf(v) * 10), 0);
  const vendorsNpa = vendorAssetsData.length > 0
    ? vendorAssetsData.filter(a => selectedVendors.includes(a.LIFNR || a.Lifnr)).filter(a => (a.ZNPA || a.Znpa) === 'X').length
    : filteredVendors.reduce((acc, v) => acc + 20 + (MOCK_VENDORS.indexOf(v) * 5), 0);

  const brandMult = selectedVendors.length >= 10 ? 1 : 0.6;
  const filteredBrandsMock = MOCK_BRANDS.filter(b => selectedBrands.includes(b.id));
  const brandsRunning = vendorAssetsData.length > 0
    ? vendorAssetsData.filter(a => selectedBrands.includes(a.BRANDDESC || a.BrandDesc || a.Branddesc || a.brandDesc)).filter(a => (a.ZRUNNING || a.Zrunning) === 'X').length
    : Math.round(filteredBrandsMock.reduce((acc, b, i) => acc + 80 - (i * 15), 0) * brandMult);
  const brandsNpa = vendorAssetsData.length > 0
    ? vendorAssetsData.filter(a => selectedBrands.includes(a.BRANDDESC || a.BrandDesc || a.Branddesc || a.brandDesc)).filter(a => (a.ZNPA || a.Znpa) === 'X').length
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

  // Category breakdown — asset count per already-computed `category` field (C1/C2/C3) on allMolds.
  const categoryDisplayNames: Record<string, string> = { C1: "Injection", C2: "Cubic", C3: "Core Back" };
  const categoryChartData = Object.entries(groupBy(allMolds, "category")).map(([cat, items]: any) => ({
    label: categoryDisplayNames[cat] || cat,
    value: items.length,
  }));

  // Region breakdown — asset count per already-computed `region` field (VendRegion) on allMolds.
  const regionChartData = Object.entries(groupBy(allMolds, "region")).map(([region, items]: any) => ({
    label: region,
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
          <View style={[styles.searchBar, { flex: 1, marginHorizontal: 0, marginTop: 0, marginBottom: 0, borderRadius: radius.pill, backgroundColor: '#F9FAFB', borderColor: 'transparent', paddingVertical: 12 }]}>
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
            {costFilter === 'Vendor' && groupedVendors.filter(v => v.name.toLowerCase().includes(costSearch.toLowerCase())).map((vendor: any) => (
              <AccordionNode
                key={vendor.id}
                title={vendor.name}
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
            ))}

            {costFilter === 'Brand' && groupedBrands.filter(b => b.name.toLowerCase().includes(costSearch.toLowerCase())).map((brand: any) => (
              <AccordionNode
                key={brand.id}
                title={brand.name}
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
            ))}

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
          const availableVendors = hierarchyMode === "Brand-wise" && state.brand ? Array.from(new Set(vendorAssetsData.filter(a => (a.BRANDDESC || a.BrandDesc || a.Branddesc || a.brandDesc) === state.brand.name).map(a => a.LIFNR || a.Lifnr).filter(Boolean))) : null;
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
          const availableBrands = hierarchyMode === "Vendor-wise" && state.vendor ? Array.from(new Set(vendorAssetsData.filter(a => (a.LIFNR || a.Lifnr) === state.vendor.id).map(a => a.BRANDDESC || a.BrandDesc || a.Branddesc || a.brandDesc).filter(Boolean))) : null;
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
          if (hierarchyMode === "Vendor-wise" && state.vendor && m.vendorId !== state.vendor.id) return false;
          if (hierarchyMode === "Vendor-wise" && state.brand && m.brandName !== state.brand.name) return false;
          if (hierarchyMode === "Brand-wise" && state.brand && m.brandName !== state.brand.name) return false;
          if (hierarchyMode === "Brand-wise" && state.vendor && m.vendorId !== state.vendor.id) return false;
          if (state.regionType) {
            const isDom = m.country === "IN";
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
                <Text style={[styles.boxTitle, { fontSize: isTablet ? font.body : font.sub }]} numberOfLines={1}>{m.moldCode}</Text>
                <Text style={[styles.boxSubtitle, { fontSize: isTablet ? font.sub : font.micro }, { textAlign: "center" }]} numberOfLines={2}>{m.moldDescription}</Text>
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
      {!state.vendor && renderVendorList()}
      {state.vendor && renderVendorList()}
      {state.vendor && renderBrandList()}
      {state.brand && renderRegionList()}
      {state.regionType && renderCategoryList()}
      {state.moldCategory && renderAssetTabs()}
      {state.assetType && renderMoldList()}
    </>
  );

  const renderBrandWiseFlow = () => (
    <>
      {!state.brand && renderBrandList()}
      {state.brand && renderBrandList()}
      {state.brand && renderVendorList()}
      {state.vendor && renderCategoryList()}
      {state.moldCategory && renderAssetTabs()}
      {state.assetType && renderMoldList()}
    </>
  );

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

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
      <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerIconWrap}>
            <Icons.SquaresFour size={24} color="#fff" weight="duotone" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerKicker}>ADMIN DASHBOARD</Text>
            <Text style={styles.headerTitle}>{currentLevel}</Text>
          </View>
        </View>

        {/* Hero KPI strip — real aggregate Running/NPA totals across every vendor group */}
        <GlassSurface intensity="chip" tint="dark" borderRadius={radius._20} style={styles.heroStats as any}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{totalRunningAll + totalNpaAll}</Text>
            <Text style={styles.heroStatLabel}>Total Assets</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{totalRunningAll}</Text>
            <Text style={styles.heroStatLabel}>Running</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{totalNpaAll}</Text>
            <Text style={styles.heroStatLabel}>NPA</Text>
          </View>
        </GlassSurface>

        {/* Clickable Breadcrumb */}
        {(hierarchyMode === "Vendor-wise" ? state.vendor : state.brand) && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.breadcrumbScroll}>
            <View style={styles.breadcrumb}>
              {hierarchyMode === "Vendor-wise" ? (
                <>
                  <TouchableOpacity onPress={() => handleBreadcrumbClick(1)}>
                    <Text style={styles.breadcrumbText}>{state.vendor?.name}</Text>
                  </TouchableOpacity>
                  {state.brand && (
                    <>
                      <Icons.CaretRight size={14} color="rgba(255,255,255,0.6)" weight="bold" />
                      <TouchableOpacity onPress={() => handleBreadcrumbClick(2)}>
                        <Text style={styles.breadcrumbText}>{state.brand.name}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {state.product && (
                    <>
                      <Icons.CaretRight size={14} color="rgba(255,255,255,0.6)" weight="bold" />
                      <TouchableOpacity activeOpacity={1}>
                        <Text style={styles.breadcrumbText} numberOfLines={1}>{state.product.name}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </>
              ) : (
                <>
                  <TouchableOpacity onPress={() => handleBreadcrumbClick(1)}>
                    <Text style={styles.breadcrumbText}>{state.brand?.name}</Text>
                  </TouchableOpacity>
                  {state.product && (
                    <>
                      <Icons.CaretRight size={14} color="rgba(255,255,255,0.6)" weight="bold" />
                      <TouchableOpacity onPress={() => handleBreadcrumbClick(2)}>
                        <Text style={styles.breadcrumbText}>{state.product.name}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {state.vendor && (
                    <>
                      <Icons.CaretRight size={14} color="rgba(255,255,255,0.6)" weight="bold" />
                      <TouchableOpacity onPress={() => handleBreadcrumbClick(3)}>
                        <Text style={styles.breadcrumbText}>{state.vendor.name}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {state.assetType && (
                    <>
                      <Icons.CaretRight size={14} color="rgba(255,255,255,0.6)" weight="bold" />
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
      </LinearGradient>

      {/* MAIN CONTENT AREA */}
      {!expandedWidget && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}>

          {/* CRITICALITY KPI OVERVIEW */}
          <View style={{ marginBottom: 24 }}>
            <SectionTitle title="Criticality Overview" subtitle="Network asset health" />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, paddingHorizontal: 16 }}>
              <View style={{ flex: 1, minWidth: 100 }}>
                <StatTile value={critCritical} label="Critical" icon={<Icons.Warning size={20} color={colors.danger} weight="duotone" />} tint={colors.danger} tintBg={colors.dangerSoft} />
              </View>
              <View style={{ flex: 1, minWidth: 100 }}>
                <StatTile value={critMajor} label="Major" icon={<Icons.WarningCircle size={20} color={colors.warning} weight="duotone" />} tint={colors.warning} tintBg={colors.warningSoft} />
              </View>
              <View style={{ flex: 1, minWidth: 100 }}>
                <StatTile value={critMinor} label="Minor" icon={<Icons.Info size={20} color={colors.info} weight="duotone" />} tint={colors.info} tintBg={colors.infoSoft} />
              </View>
              <View style={{ flex: 1, minWidth: 100 }}>
                <StatTile value={critOk} label="Ok" icon={<Icons.Check size={20} color={colors.success} weight="duotone" />} tint={colors.success} tintBg={colors.successSoft} />
              </View>
            </View>
          </View>

          {/* PORTFOLIO INSIGHTS — real KPI charts fed from already-computed groupedVendors/groupedBrands/allMolds values only.
              No criticality chart here on purpose: the `criticality: "CR3"` field on allMolds is a hardcoded placeholder
              (this SAP dataset has no real criticality signal), so a criticality chart would misrepresent fake data as real. */}
          <View style={{ marginBottom: 24 }}>
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

              <View style={[styles.boxCard3D, shadow.soft, { width: 320, padding: 20 }]}>
                <Text style={styles.insightCardTitle}>Cost by Vendor</Text>
                <BarChart data={vendorCostChartData} height={180} colors={[colors.success]} valueFormatter={(v) => { if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)}Cr`; if (v >= 100000) return `₹${(v / 100000).toFixed(2)}L`; if (v >= 1000) return `₹${(v / 1000).toFixed(1)}k`; return `₹${Math.round(v)}`; }} />
              </View>

              <View style={[styles.boxCard3D, shadow.soft, { width: 320, padding: 20 }]}>
                <Text style={styles.insightCardTitle}>Depreciation by Vendor</Text>
                <BarChart data={vendorDeprChartData} height={180} colors={[colors.danger]} valueFormatter={(v) => { if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)}Cr`; if (v >= 100000) return `₹${(v / 100000).toFixed(2)}L`; if (v >= 1000) return `₹${(v / 1000).toFixed(1)}k`; return `₹${Math.round(v)}`; }} />
              </View>

              <View style={[styles.boxCard3D, shadow.soft, { width: 260, padding: 20 }]}>
                <Text style={styles.insightCardTitle}>Assets by Category</Text>
                <BarChart data={categoryChartData} height={180} />
              </View>

              <View style={[styles.boxCard3D, shadow.soft, { width: 260, padding: 20 }]}>
                <Text style={styles.insightCardTitle}>Assets by Region</Text>
                <BarChart data={regionChartData} height={180} />
              </View>
            </ScrollView>
          </View>

          {renderSystemOverview()}
          <View style={{ paddingHorizontal: 20 }}>
            <GeoMap3D data={vendorAssetsData} />
          </View>
          {renderCostAnalysis()}

          {/* HIERARCHY TOGGLE */}
          <View style={{ flexDirection: 'row', paddingHorizontal: 20, marginBottom: 20, marginTop: 10, gap: 12 }}>
            <TouchableOpacity onPress={() => { setHierarchyMode("Brand-wise"); setState({ vendor: null, assetType: null, brand: null, product: null, material: null }); }} style={[styles.pillBtn, hierarchyMode === "Brand-wise" && styles.pillBtnActive]}>
              <Text style={[styles.pillText, hierarchyMode === "Brand-wise" && styles.pillTextActive]}>Brand-wise Drilldown</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setHierarchyMode("Vendor-wise"); setState({ vendor: null, assetType: null, brand: null, product: null, material: null }); }} style={[styles.pillBtn, hierarchyMode === "Vendor-wise" && styles.pillBtnActive]}>
              <Text style={[styles.pillText, hierarchyMode === "Vendor-wise" && styles.pillTextActive]}>Vendor-wise Drilldown</Text>
            </TouchableOpacity>
          </View>

          {hierarchyMode === "Vendor-wise" ? renderVendorWiseFlow() : renderBrandWiseFlow()}
        </ScrollView>
      )}

      {/* REPORT MODAL */}
      <ReportDetailsModal
        visible={!!state.material}
        report={state.material ? { Matnr: state.material.materialCode, Lifnr: state.vendor?.id, Maktx: state.material.materialDescription } : null}
        onClose={() => setState({ ...state, material: null })}
      />

      {/* CHART DETAILS MODAL WITH SEGREGATION */}
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
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.success, marginTop: 16, marginBottom: 8 }}>Running Assets</Text>
                  <View style={{ backgroundColor: colors.successSoft, borderRadius: radius._15, padding: 12 }}>
                    {chartDetail.materials.filter((m: any) => m.status === 'Running Asset').map((m: any, idx: number) => (
                      <View key={`r-${idx}`} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' }}>
                        <Icons.PlayCircle size={24} color={colors.success} weight="fill" />
                        <View style={{ marginLeft: 12, flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.ink }}>{m.moldCode} <Text style={{ fontSize: 11, fontWeight: 'normal', color: colors.textMuted }}>(Asset: {m.assetNumber})</Text></Text>
                          <Text style={{ fontSize: 11, color: colors.textMuted, marginVertical: 2 }}>{m.description}</Text>
                          <Text style={{ fontSize: 10, color: colors.textFaint }}>Acq Year: {m.acqYear} | Acq Date: {m.acqDate}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.success }}>₹{m.cost.toLocaleString('en-IN')}</Text>
                          <Text style={{ fontSize: 10, color: colors.textMuted }}>Depr: ₹{m.depreciation.toLocaleString('en-IN')}</Text>
                        </View>
                      </View>
                    ))}
                  </View>

                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.danger, marginTop: 20, marginBottom: 8 }}>NPA Assets</Text>
                  <View style={{ backgroundColor: colors.dangerSoft, borderRadius: radius._15, padding: 12 }}>
                    {chartDetail.materials.filter((m: any) => m.status === 'NPA Asset').map((m: any, idx: number) => (
                      <View key={`n-${idx}`} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' }}>
                        <Icons.WarningCircle size={24} color={colors.danger} weight="fill" />
                        <View style={{ marginLeft: 12, flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.ink }}>{m.moldCode} <Text style={{ fontSize: 11, fontWeight: 'normal', color: colors.textMuted }}>(Asset: {m.assetNumber})</Text></Text>
                          <Text style={{ fontSize: 11, color: colors.textMuted, marginVertical: 2 }}>{m.description}</Text>
                          <Text style={{ fontSize: 10, color: colors.textFaint }}>Acq Year: {m.acqYear} | Acq Date: {m.acqDate}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.danger }}>₹{m.cost.toLocaleString('en-IN')}</Text>
                          <Text style={{ fontSize: 10, color: colors.textMuted }}>Depr: ₹{m.depreciation.toLocaleString('en-IN')}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
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
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: { flexDirection: "row", alignItems: "center" },
  headerIconWrap: { padding: 10, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: radius._15 },
  headerKicker: { color: "rgba(255,255,255,0.85)", fontSize: font.micro, fontWeight: font.bold, letterSpacing: 1 },
  headerTitle: { color: "#fff", fontSize: 24, fontWeight: font.black, marginTop: 2 },

  breadcrumbScroll: { marginTop: 16 },
  breadcrumb: { flexDirection: "row", alignItems: "center", gap: 6 },
  breadcrumbText: { color: "#fff", fontSize: font.sub, fontWeight: font.semibold },

  heroStats: {
    flexDirection: "row",
    paddingVertical: 14,
    marginTop: 18,
  },
  heroStat: { flex: 1, alignItems: "center" },
  heroStatValue: { color: "#fff", fontSize: 20, fontWeight: font.black },
  heroStatLabel: { color: "rgba(255,255,255,0.85)", fontSize: font.micro, fontWeight: font.semibold, marginTop: 2 },
  heroDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.25)", marginVertical: 4 },

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
  insightLegendText: { fontSize: font.micro, color: colors.textMuted, fontWeight: font.medium },

  content: { paddingVertical: 20 },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius._15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: font.sub,
    color: colors.ink,
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
    borderBottomWidth: 6,
    borderBottomColor: '#E2E2E6',
    borderRightWidth: 2,
    borderRightColor: '#E2E2E6',
  },
  boxCardSelected3D: {
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
    borderBottomColor: colors.brandLight,
    borderRightColor: colors.brandLight,
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
    backgroundColor: '#F3F4F6',
  },
  modernPillBtnActive: {
    backgroundColor: '#1F2937',
  },
  modernPillText: {
    fontSize: font.body,
    color: '#6B7280',
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
