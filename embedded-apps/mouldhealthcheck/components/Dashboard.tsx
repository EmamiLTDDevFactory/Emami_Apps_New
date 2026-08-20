import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Icons from "phosphor-react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  LayoutAnimation,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Chip from "@/components/ui/Chip";
import EmptyState from "@/components/ui/EmptyState";
import GlassSurface from "@/components/ui/GlassSurface";
import ProgressRing from "@/components/ui/ProgressRing";
import ReportDetailsModal from "@/components/ui/ReportDetailsModal";
import SectionTitle from "@/components/ui/SectionTitle";
import StatTile from "@/components/ui/StatTile";
import StatusPill from "@/components/ui/StatusPill";
import { BarChart, DonutChart } from "@/components/ui/charts";
import { colors, font, gradients, radius, shadow } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/config";
import { MouldRecord, progressOf, useInspection } from "@/lib/inspectionStore";
import { useBreakpoint, SIDEBAR_WIDTH } from "@/utils/responsive";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type VendorType = { vendorCode: string; vendorName: string; email: string; matnr: string };
type MaterialItem = {
  materialCode: string;
  materialDescription: string;
  componentPart: string;
  runnerType: string;
  granulesGrade: string;
  machineCode: string;
  cavity: string;
  runningCavity: string;
  cycleTime: string;
  efficiency: string;
  hoursPerDay: string;
  designCode: string;
  mouldLife: string;
  mouldShots: string;
  planningCode: string;
  fgCode: string;
};

const STATUS_FILTERS = [
  { key: "All", label: "All" },
  { key: "in_progress", label: "In progress" },
  { key: "done", label: "Done" },
  { key: "not_started", label: "Not started" },
] as const;

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const formatSAPDate = (odataDate: string) => {
  if (!odataDate || !odataDate.startsWith("/Date(")) {
    return { display: odataDate || "—", raw: odataDate || "" };
  }
  const timestamp = parseInt(odataDate.match(/\d+/)?.[0] || "0", 10);
  const d = new Date(timestamp);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');

  return {
    display: `${dd}/${mm}/${yyyy}`,
    raw: `${yyyy}${mm}${dd}`
  };
};

const DetailItem = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.detailItem}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue} numberOfLines={1}>
      {value || "—"}
    </Text>
  </View>
);

function statusKind(rec?: MouldRecord) {
  if (rec?.status === "done") return "done" as const;
  if (rec?.status === "in_progress") return "inprogress" as const;
  return "notstarted" as const;
}

const SpecChip = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
  <View style={styles.specChip}>
    {icon}
    <Text style={styles.specText}>{text}</Text>
  </View>
);

const HeroStat = ({ value, label }: { value: number; label: string }) => (
  <View style={styles.heroStat}>
    <Text style={styles.heroStatValue}>{value}</Text>
    <Text style={styles.heroStatLabel}>{label}</Text>
  </View>
);

// ============================================================================
// 1. VENDOR (USER) DASHBOARD
// ============================================================================
function MouldCard({
  item,
  index,
  record,
  onInspect,
}: {
  item: MaterialItem;
  index: number;
  record?: MouldRecord;
  onInspect: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const progress = progressOf(record);
  const started = record && record.status !== "not_started";

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.selectionAsync();
    setExpanded((e) => !e);
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(450)} style={[styles.card, shadow.card]}>
      <View style={styles.cardTop}>
        <View style={styles.thumb}>
          <Icons.Cube size={26} color={colors.brand} weight="duotone" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.code} numberOfLines={1}>
            {item.materialCode}
          </Text>
          <Text style={styles.desc} numberOfLines={2}>
            {item.materialDescription}
          </Text>
        </View>
        {started ? (
          <ProgressRing progress={progress} size={50} strokeWidth={6} />
        ) : (
          <View style={styles.ringPlaceholder}>
            <Icons.ArrowRight size={18} color={colors.brand} weight="bold" />
          </View>
        )}
      </View>

      <View style={styles.metaRow}>
        <StatusPill kind={statusKind(record)} />
        {!!record?.photos && (
          <View style={styles.photoChip}>
            <Icons.Camera size={13} color={colors.textMuted} weight="fill" />
            <Text style={styles.photoChipText}>{record.photos}</Text>
          </View>
        )}
      </View>

      <View style={styles.specRow}>
        {!!item.machineCode && <SpecChip icon={<Icons.Factory size={13} color={colors.textMuted} weight="bold" />} text={item.machineCode} />}
        {!!item.cavity && <SpecChip icon={<Icons.GridFour size={13} color={colors.textMuted} weight="bold" />} text={`${item.cavity} cav`} />}
        {!!item.cycleTime && <SpecChip icon={<Icons.Timer size={13} color={colors.textMuted} weight="bold" />} text={`${item.cycleTime}s`} />}
      </View>

      {expanded && (
        <View style={styles.detailsGrid}>
          <DetailItem label="Runner" value={item.runnerType} />
          <DetailItem label="Grade" value={item.granulesGrade} />
          <DetailItem label="Running Cav." value={item.runningCavity} />
          <DetailItem label="Efficiency" value={item.efficiency} />
          <DetailItem label="Hours / Day" value={item.hoursPerDay} />
          <DetailItem label="Design Code" value={item.designCode} />
          <DetailItem label="Mould Life" value={item.mouldLife} />
          <DetailItem label="Mould Shots" value={item.mouldShots} />
        </View>
      )}

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.detailsBtn} onPress={toggle} activeOpacity={0.7}>
          <Text style={styles.detailsBtnText}>{expanded ? "Hide" : "Details"}</Text>
          <Icons.CaretDown
            size={15}
            color={colors.textMuted}
            weight="bold"
            style={{ transform: [{ rotate: expanded ? "180deg" : "0deg" }] }}
          />
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.9} onPress={onInspect} style={{ flex: 1 }}>
          <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.inspectBtn}>
            <Icons.ClipboardText size={17} color="#fff" weight="fill" />
            <Text style={styles.inspectText}>{started ? "Continue" : "Start Inspection"}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

function VendorDashboard() {
  const { user, logout: handleLogout } = useAuth();
  const { records, startInspection, getRecord } = useInspection();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isTabletUp } = useBreakpoint();

  const [vendor, setVendor] = useState<VendorType | null>(null);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("All");

  useFocusEffect(
    useCallback(() => {
      const hasData = materials.length > 0;
      loadDashboard(!hasData);
    }, [user?.Email])
  );

  const loadDashboard = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const validEmail = user?.Email || user?.email;
      const { data } = await api.get("/ZMM_MOULD_CARE_SRV/ZMouldDetailsSet", {
        params: {
          "$filter": `SmtpAddr eq '${validEmail}'`,
          "$format": "json"
        }
      });

      const results = data?.d?.results || [];

      if (results.length > 0) {
        setVendor({
          vendorCode: results[0].Lifnr,
          vendorName: results[0].Name1,
          email: results[0].SmtpAddr,
          matnr: results[0].Matnr,
        });

        const mappedMaterials = results.map((item: any) => ({
          materialCode: item.Matnr,
          materialDescription: item.Maktx,
          componentPart: item.ZzcompPart,
          runnerType: item.Zzrunner,
          granulesGrade: item.Zzgran,
          machineCode: item.Zzmach,
          cavity: item.ZzcavityNo,
          runningCavity: item.ZzrunCavity,
          cycleTime: item.ZzcycTime,
          efficiency: item.ZzfacProd,
          hoursPerDay: item.ZzhoursDay,
          designCode: item.ZzmdsCode,
          mouldLife: item.ZzmoldLife,
          mouldShots: item.ZzmoldShots,
          planningCode: item.ZzplanCode,
          fgCode: item.ZzfgCode,
        }));

        const unique = mappedMaterials.filter(
          (it: any, i: number, self: any[]) =>
            i === self.findIndex((t) => t.materialCode === it.materialCode)
        );

        setMaterials(unique);
      } else {
        setMaterials([]);
      }
    } catch (e) {
      console.error("Fetch failed", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const counts = useMemo(() => {
    let done = 0;
    let inProgress = 0;
    for (const m of materials) {
      const s = records[m.materialCode]?.status;
      if (s === "done") done++;
      else if (s === "in_progress") inProgress++;
    }
    const total = materials.length;
    return { done, inProgress, notStarted: total - done - inProgress, total };
  }, [materials, records]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return materials.filter((m) => {
      const matchesQuery = !q || m.materialCode?.toLowerCase().includes(q) || m.materialDescription?.toLowerCase().includes(q);
      const s = records[m.materialCode]?.status ?? "not_started";
      const matchesFilter = filter === "All" || s === filter;
      return matchesQuery && matchesFilter;
    });
  }, [materials, query, filter, records]);

  const onInspect = (item: MaterialItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    startInspection({ materialCode: item.materialCode, materialDescription: item.materialDescription });
    router.push({ pathname: "/apps/mouldhealthcheck/(modals)/InjectMould", params: { ...item } });
  };

  if (loading) {
    return (
      <View style={[styles.loader, isTabletUp && { paddingLeft: SIDEBAR_WIDTH }]}>
        <ActivityIndicator size="large" color={colors.brand} />
        <Text style={styles.loaderText}>Loading your moulds…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, isTabletUp && { paddingLeft: SIDEBAR_WIDTH }]}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadDashboard(); }} tintColor={colors.brand} colors={[colors.brand]} />}
      >
        <View style={[styles.hero, { paddingTop: insets.top + 14 }]}>
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>{greeting()} 👋</Text>
              <Text style={styles.vendorName} numberOfLines={1}>{vendor?.vendorName || "Vendor"}</Text>
              {!!vendor?.vendorCode && (
                <View style={styles.vendorCodeChip}>
                  <Icons.Factory size={12} color={colors.brand} weight="fill" />
                  <Text style={styles.vendorCodeText}>Vendor {vendor.vendorCode}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={() => { handleLogout(); router.replace("/apps/mouldhealthcheck/(auth)/login"); }} style={styles.avatar}>
              <Icons.SignOut size={24} color={colors.textBody} weight="fill" />
            </TouchableOpacity>
          </View>

          <View style={styles.heroStats}>
            <HeroStat value={counts.total} label="Total moulds" />
            <View style={styles.heroDivider} />
            <HeroStat value={counts.notStarted} label="Not started" />
            <View style={styles.heroDivider} />
            <HeroStat value={counts.inProgress} label="In progress" />
            <View style={styles.heroDivider} />
            <HeroStat value={counts.done} label="Inspected" />
          </View>

          <View style={styles.searchBar}>
            <Icons.MagnifyingGlass size={20} color={colors.textMuted} weight="bold" />
            <TextInput placeholder="Search mould code or name" placeholderTextColor={colors.textFaint} value={query} onChangeText={setQuery} style={styles.searchInput} />
            {!!query && (
              <TouchableOpacity onPress={() => setQuery("")} hitSlop={8}>
                <Icons.XCircle size={20} color={colors.textFaint} weight="fill" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Animated.ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {STATUS_FILTERS.map((f) => (
            <Chip key={f.key} label={f.label} active={filter === f.key} onPress={() => setFilter(f.key)} />
          ))}
        </Animated.ScrollView>

        <View style={{ marginTop: 10 }}>
          <SectionTitle title="Your Moulds" subtitle={`${filtered.length} item${filtered.length === 1 ? "" : "s"}`} />
          {filtered.length === 0 ? (
            <EmptyState
              icon={<Icons.Cube size={34} color={colors.brand} weight="duotone" />}
              title={materials.length === 0 ? "No moulds assigned yet" : "No matches"}
              message={materials.length === 0 ? "Pull down to refresh once moulds are assigned to you." : "Try a different search or filter."}
            />
          ) : (
            <View style={{ paddingHorizontal: 16, gap: 14 }}>
              {filtered.map((item, i) => (
                <MouldCard key={item.materialCode + i} item={item} index={i} record={getRecord(item.materialCode)} onInspect={() => onInspect(item)} />
              ))}
            </View>
          )}
        </View>
      </Animated.ScrollView>
    </View>
  );
}
// ============================================================================
// 2. ADMIN DASHBOARD
// ============================================================================
function AdminDashboard() {
  const { user, logout: handleLogout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isPhone, isTabletUp } = useBreakpoint();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [reportToApprove, setReportToApprove] = useState<any | null>(null);
  const [reportToView, setReportToView] = useState<any | null>(null);

  // PO Modal State
  const [poModalReport, setPoModalReport] = useState<any | null>(null);
  const [poDetails, setPoDetails] = useState({
    vendor: "",
    purchOrg: "",
    purchGroup: "",
    compCode: "",
    amount: "",
    plant: "",
    quantity: "",
    unit: "",
    docType: "",
    docDate: "",
    incoterms1: "",
    incoterms2: ""
  });

  const [vendorFilter, setVendorFilter] = useState("");
  const [materialFilter, setMaterialFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [criticalityFilter, setCriticalityFilter] = useState("");

  const loadReports = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const validEmail = user?.Email || user?.email;

      const { data } = await api.get("/ZMM_MOULD_CARE_SRV/ZmouldDataReportSet", {
        params: {
          "$filter": `Email eq '${validEmail}'`,
          "$format": "json"
        }
      });

      const results = data?.d?.results || [];
      console.log("Results: ", results);

      const SECTION_TITLES: Record<string, string> = {
        VB: "Visual & Basic Condition",
        MA: "Mould Base & Alignment",
        CC: "Cavity & Core Condition",
        CS: "Cooling System",
        ES: "Ejection System",
        MC: "Mechanism Check",
        HC: "Hydraulic Core / Slides",
        FC: "Collapsible Core",
        NI: "Component Quality Details",
      };

      const processedReports = await Promise.all(results.map(async (r: any) => {
        let okCount = 0;
        let issueCount = 0;
        try {
          const detRes = await api.get("/ZMM_MOULD_CARE_SRV/ZMouldGetDataSet", {
            params: {
              $filter: `Matnr eq '${r.Matnr}' and Lifnr eq '${r.Lifnr}' and Zaction eq 'X'`,
              $format: "json",
            },
          });
          const detItems = detRes.data?.d?.results || [];
          detItems.forEach((item: any) => {
            const colId = item.ZmouldColId;
            if (SECTION_TITLES[colId]) {
              const val1 = item.ZmouldColVal1?.trim();
              if (val1 === "Yes" || val1 === "Condition OK") okCount++;
              else if (val1 === "No" || val1 === "Issue Detected") issueCount++;
              else if (val1 === "Action Initiated" || val1 === "Action Taken") { /* ignore */ }
              else okCount++;
            }
          });
        } catch (e) {
          console.warn("Failed to fetch details for", r.Matnr);
        }

        return {
          ...r,
          LIFNR: r.Lifnr,
          MATNR: r.Matnr,
          MAKTX: r.Name1,
          SUBDATE: r.ZsubDate,
          COMPLETED_FLAG: r.CompletedFlag,
          DRAFT_FLAG: r.DraftFlag,
          CREATED_BY: r.CreatedBy,
          CREATED_ON: r.CreatedOn,
          AdminRevFlag: r.AdminRevFlag,
          AdminApprvFlag: r.AdminApprvFlag,
          Criticality: r.Zcriticality || "Ok",
          parsedDate: formatSAPDate(r.ZsubDate),
          ZokCount: okCount,
          ZissueCount: issueCount,
        };
      }));

      setReports(processedReports);
    } catch (e) {
      console.error("Failed to load admin reports", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadReports(reports.length === 0);
    }, [])
  );

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const vMatch = !vendorFilter || r.LIFNR?.toLowerCase().includes(vendorFilter.toLowerCase());
      const mMatch = !materialFilter || r.MATNR?.toLowerCase().includes(materialFilter.toLowerCase()) || r.MAKTX?.toLowerCase().includes(materialFilter.toLowerCase());
      const dMatch = !dateFilter || r.parsedDate.raw.includes(dateFilter) || r.parsedDate.display.includes(dateFilter);
      const cMatch = !criticalityFilter || r.Criticality?.toLowerCase().includes(criticalityFilter.toLowerCase());
      return vMatch && mMatch && dMatch && cMatch;
    });
  }, [reports, vendorFilter, materialFilter, dateFilter, criticalityFilter]);

  // Chart-only aggregates — derived from the already-fetched `reports` state,
  // no new API calls. Real flags/fields only (see loadReports() mapping above).
  const approvalFunnelData = useMemo(() => ([
    { label: "Submitted", value: reports.length },
    { label: "Completed", value: reports.filter((r) => r.COMPLETED_FLAG === 'X').length },
    { label: "Reviewed", value: reports.filter((r) => r.AdminRevFlag === 'X').length },
    { label: "Approved", value: reports.filter((r) => r.AdminApprvFlag === 'X').length },
  ]), [reports]);

  const criticalityDonutData = useMemo(() => ([
    { label: "Critical", value: reports.filter((r) => r.Criticality === "Critical").length, color: colors.danger },
    { label: "Major", value: reports.filter((r) => r.Criticality === "Major").length, color: colors.warning },
    { label: "Minor", value: reports.filter((r) => r.Criticality === "Minor").length, color: colors.info },
    { label: "Ok", value: reports.filter((r) => r.Criticality === "Ok").length, color: colors.success },
  ]), [reports]);

  const conditionDonutData = useMemo(() => {
    // Same 18/3 per-report fallback used by the existing badge text (line ~703/706 above).
    const ok = reports.reduce((sum, r) => sum + (r.ZokCount !== undefined ? Number(r.ZokCount) : 18), 0);
    const issues = reports.reduce((sum, r) => sum + (r.ZissueCount !== undefined ? Number(r.ZissueCount) : 3), 0);
    return [
      { label: "Conditions OK", value: ok, color: colors.success },
      { label: "Issues Detected", value: issues, color: colors.danger },
    ];
  }, [reports]);

  const initiateApproval = (report: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setReportToApprove(report);
  };

  const handleOpenPO = (report: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPoDetails({
      vendor: report.Lifnr || "",
      purchOrg: "",
      purchGroup: "",
      compCode: "",
      amount: "",
      plant: "HO00",
      quantity: "",
      unit: "",
      docType: "",
      docDate: "",
      incoterms1: "",
      incoterms2: ""
    });
    setPoModalReport(report);
  };

  const submitPoDetails = async () => {
    console.log("Submitting PO payload:", { report: poModalReport?.Matnr, ...poDetails });
    setPoModalReport(null);
    if (Platform.OS === 'web') {
      window.alert("PO Details saved successfully.");
    } else {
      Alert.alert("Success", "PO Details saved successfully.");
    }
  };

  const confirmApproval = async () => {
    if (!reportToApprove) return;

    try {
      const payload = {

        Lifnr: reportToApprove.LIFNR,
        Matnr: reportToApprove.MATNR,
        ZsubDate: reportToApprove.SUBDATE,
        ZinspId: reportToApprove.ZinspId,
        Zstat: "R",
        Zdate: `\/Date(${new Date().getTime()})\/`,
        Ztime: "PT00H00M00S",
        ApprovedBy: user?.Email || user?.email || "ADMIN",
        ApprovedOn: `\/Date(${new Date().getTime()})\/`,
        ReviewedBy: user?.Email || user?.email || "ADMIN",
        ReviewedOn: `\/Date(${new Date().getTime()})\/`,
      };

      console.log("Sending approval payload:", payload);

      await api.post("/ZMM_MOULD_CARE_SRV/ZMouldLogSet", payload);

      setReportToApprove(null);
      setRefreshing(true);
      await new Promise((resolve) => setTimeout(resolve, 800));
      await loadReports(false);

      if (Platform.OS === 'web') {
        window.alert("Report approved successfully.");
      } else {
        Alert.alert("Success", "Report approved successfully.");
      }
    } catch (error: any) {
      console.error("Approval error:", error);
      const errorMessage = error?.response?.data?.error || error.message || "Could not reach the server.";

      if (Platform.OS === 'web') {
        window.alert(`Error: ${errorMessage}`);
      } else {
        Alert.alert("Approval Failed", errorMessage);
      }
      setReportToApprove(null);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loader, isTabletUp && { paddingLeft: SIDEBAR_WIDTH }]}>
        <ActivityIndicator size="large" color={colors.brand} />
        <Text style={styles.loaderText}>Loading global reports…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, isTabletUp && { paddingLeft: SIDEBAR_WIDTH }]}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadReports(); }} tintColor={colors.brand} />}
      >
        <View style={[styles.hero, { paddingTop: insets.top + 14 }]}>
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>{greeting()} Admin 👋</Text>
              <Text style={styles.vendorName}>Global Overview</Text>
            </View>
            <TouchableOpacity onPress={() => { handleLogout(); router.replace("/apps/mouldhealthcheck/(auth)/login"); }} style={styles.avatar}>
              <Icons.SignOut size={24} color={colors.textBody} weight="fill" />
            </TouchableOpacity>
          </View>

          <View style={styles.heroStats}>
            <HeroStat value={reports.length} label="Total Reports" />
            <View style={styles.heroDivider} />
            <HeroStat value={reports.filter(r => r.COMPLETED_FLAG === 'X').length} label="Inspection Completed" />
            <View style={styles.heroDivider} />
            <HeroStat value={reports.filter(r => r.DRAFT_FLAG === 'X').length} label="Drafts" />
          </View>
        </View>

        <View style={{ marginTop: 24, paddingHorizontal: 20 }}>
          <SectionTitle title="Criticality Overview" subtitle="Network asset health" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 16, paddingBottom: 16, paddingRight: 20 }}
          >
            <View style={{ width: 160 }}>
              <StatTile value={reports.filter(r => r.Criticality === "Critical").length} label="Critical" subtitle="Needs immediate action" icon={<Icons.Warning size={20} color={colors.danger} weight="duotone" />} tint={colors.danger} tintBg={colors.dangerSoft} />
            </View>
            <View style={{ width: 160 }}>
              <StatTile value={reports.filter(r => r.Criticality === "Major").length} label="Major" subtitle="Schedule action soon" icon={<Icons.WarningCircle size={20} color={colors.warning} weight="duotone" />} tint={colors.warning} tintBg={colors.warningSoft} />
            </View>
            <View style={{ width: 160 }}>
              <StatTile value={reports.filter(r => r.Criticality === "Minor").length} label="Minor" subtitle="Low-priority findings" icon={<Icons.Info size={20} color={colors.info} weight="duotone" />} tint={colors.info} tintBg={colors.infoSoft} />
            </View>
            <View style={{ width: 160 }}>
              <StatTile value={reports.filter(r => r.Criticality === "Ok").length} label="Ok" subtitle="No issues found" icon={<Icons.Check size={20} color={colors.success} weight="duotone" />} tint={colors.success} tintBg={colors.successSoft} />
            </View>
          </ScrollView>

          <View style={[styles.chartsRow, isPhone && styles.chartsRowPhone]}>
            <View style={[styles.chartCard, shadow.card, isPhone && styles.chartCardPhone]}>
              <Text style={styles.chartCardTitle}>Criticality Split</Text>
              <DonutChart data={criticalityDonutData} size={116} strokeWidth={16} showLegend={!isPhone} />
            </View>
            <View style={[styles.chartCard, shadow.card, isPhone && styles.chartCardPhone]}>
              <Text style={styles.chartCardTitle}>Condition Overview</Text>
              <DonutChart data={conditionDonutData} size={116} strokeWidth={16} showLegend={!isPhone} />
            </View>
          </View>
        </View>

        <View style={{ marginTop: 24, paddingHorizontal: 20 }}>
          <SectionTitle title="Approval Funnel" subtitle="Submitted → Completed → Reviewed → Approved" />
          <View style={[styles.chartCard, shadow.card, { width: "100%" }]}>
            <BarChart data={approvalFunnelData} height={170} />
          </View>
        </View>

        <View style={styles.adminFiltersContainer}>
          <Text style={styles.filterTitle}>Filter Reports</Text>
          <View style={[styles.filterInputsRow, { flexWrap: "wrap", marginBottom: 12 }]}>
            <View style={[styles.searchBarAdminCompact, { minWidth: '31%', flex: 1 }]}>
              <Icons.Buildings size={14} color={colors.textMuted} />
              <TextInput placeholder="Vendor" placeholderTextColor={colors.textFaint} value={vendorFilter} onChangeText={setVendorFilter} style={styles.searchInputCompact} />
            </View>
            <View style={[styles.searchBarAdminCompact, { minWidth: '31%', flex: 1 }]}>
              <Icons.Cube size={14} color={colors.textMuted} />
              <TextInput placeholder="Material" placeholderTextColor={colors.textFaint} value={materialFilter} onChangeText={setMaterialFilter} style={styles.searchInputCompact} />
            </View>
            <View style={[styles.searchBarAdminCompact, { minWidth: '31%', flex: 1 }]}>
              <Icons.Calendar size={14} color={colors.textMuted} />
              <TextInput placeholder="Date" placeholderTextColor={colors.textFaint} value={dateFilter} onChangeText={setDateFilter} style={styles.searchInputCompact} />
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
            {["All", "Critical", "Major", "Minor", "Ok"].map((opt) => {
              const isActive = (criticalityFilter === "" && opt === "All") || (criticalityFilter.toLowerCase() === opt.toLowerCase());
              return (
                <TouchableOpacity
                  key={opt}
                  onPress={() => setCriticalityFilter(opt === "All" ? "" : opt)}
                  activeOpacity={0.7}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: isActive ? "#1e293b" : colors.surfaceAlt,
                  }}
                >
                  <Text style={{
                    fontSize: font.sub,
                    fontWeight: font.bold,
                    color: isActive ? "#ffffff" : colors.textMuted
                  }}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={{ marginTop: 14 }}>
          <SectionTitle title="Submitted Reports" subtitle={`${filteredReports.length} record${filteredReports.length === 1 ? "" : "s"}`} />
          {filteredReports.length === 0 ? (
            <EmptyState
              icon={<Icons.FileMagnifyingGlass size={34} color={colors.brand} weight="duotone" />}
              title="No reports found"
              message="Adjust your filters or pull to refresh."
            />
          ) : (
            <View style={{ paddingHorizontal: 16, gap: 12 }}>
              {filteredReports.map((report, i) => (
                <Animated.View key={i} entering={FadeInDown.delay(i * 30).duration(400)} style={shadow.card}>
                  <TouchableOpacity
                    style={styles.adminCard}
                    activeOpacity={0.7}
                    onPress={() => setReportToView(report)}
                  >
                    <View style={styles.adminCardHeader}>
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={styles.adminCardCode} numberOfLines={1}>{report.Maktx || "Material Description"}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                          <Text style={styles.adminCardDesc} numberOfLines={1}>Code: {report.Matnr}</Text>
                          {(report.Zinspid || report.ZinspId) ? (
                            <View style={{ backgroundColor: '#10b981', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                              <Text style={{ fontSize: 10, fontWeight: '800', color: '#fff' }}>Insp ID: {report.Zinspid || report.ZinspId}</Text>
                            </View>
                          ) : null}
                        </View>
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                          <View style={[styles.adminBadge, { backgroundColor: report.Criticality === 'Critical' ? '#fee2e2' : report.Criticality === 'Major' ? '#fef9c3' : report.Criticality === 'Minor' ? '#dbeafe' : '#dcfce7', borderColor: report.Criticality === 'Critical' ? '#f87171' : report.Criticality === 'Major' ? '#facc15' : report.Criticality === 'Minor' ? '#60a5fa' : '#4ade80' }]}>
                            <Text style={[styles.adminBadgeText, { color: report.Criticality === 'Critical' ? '#dc2626' : report.Criticality === 'Major' ? '#ca8a04' : report.Criticality === 'Minor' ? '#2563eb' : '#16a34a' }]}>
                              Criticality: {report.Criticality || "Ok"}
                            </Text>
                          </View>
                          <View style={[styles.adminBadge, { backgroundColor: '#dcfce7', borderColor: '#4ade80' }]}>
                            <Text style={[styles.adminBadgeText, { color: '#16a34a' }]}>{report.ZokCount !== undefined ? report.ZokCount : 18} Condition OK</Text>
                          </View>
                          <View style={[styles.adminBadge, { backgroundColor: '#fee2e2', borderColor: '#f87171' }]}>
                            <Text style={[styles.adminBadgeText, { color: '#dc2626' }]}>{report.ZissueCount !== undefined ? report.ZissueCount : 3} Issue Detected</Text>
                          </View>
                        </View>
                      </View>

                      <View style={{ alignItems: "flex-end", gap: 6 }}>
                        <View style={[styles.adminBadge, report.CompletedFlag === 'X' ? styles.badgeDone : styles.badgeDraft]}>
                          <Text style={[styles.adminBadgeText, report.CompletedFlag === 'X' ? styles.badgeDoneText : styles.badgeDraftText]}>
                            {report.CompletedFlag === 'X' ? 'Inspection Completed' : 'Draft'}
                          </Text>
                        </View>
                        <View style={[styles.adminBadge, report.AdminRevFlag === 'X' ? styles.badgeDone : styles.badgeDraft]}>
                          <Text style={[styles.adminBadgeText, report.AdminRevFlag === 'X' ? styles.badgeDoneText : styles.badgeDraftText]}>
                            {report.AdminRevFlag === 'X' ? 'Admin Reviewed' : 'Not Reviewed'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.adminCardMid}>
                      <View style={styles.adminMicroCol}>
                        <Text style={styles.adminMicroLabel}>Vendor</Text>
                        <Text style={styles.adminMicroValue} numberOfLines={1}>{report.Lifnr}</Text>
                      </View>
                      <View style={styles.adminMicroCol}>
                        <Text style={styles.adminMicroLabel}>Sub. Date</Text>
                        <Text style={styles.adminMicroValue}>{report.parsedDate.display}</Text>
                      </View>
                      <View style={styles.adminMicroCol}>
                        <Text style={styles.adminMicroLabel}>Created By</Text>
                        <Text style={styles.adminMicroValue} numberOfLines={1}>{report.CreatedBy}</Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
                      <TouchableOpacity activeOpacity={0.8} style={[styles.adminApproveBtn, { flex: 1, backgroundColor: "#3b82f6" }]} onPress={() => handleOpenPO(report)}>
                        <Icons.FileText size={16} color="#fff" weight="bold" />
                        <Text style={styles.adminApproveBtnText}>
                          Fill PO
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity activeOpacity={0.8} style={[styles.adminApproveBtn, { flex: 1 }]} onPress={() => initiateApproval(report)}>
                        <Icons.CheckCircle size={16} color="#fff" weight="bold" />
                        <Text style={styles.adminApproveBtnText}>
                          Approve
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          )}
        </View>
      </Animated.ScrollView>

      {/* PO DETAILS MODAL */}
      <Modal visible={!!poModalReport} transparent={true} animationType="slide" onRequestClose={() => setPoModalReport(null)}>
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.modalContainer, { maxHeight: "85%" }]}>
            <View style={modalStyles.header}>
              <View style={{ flex: 1, marginRight: 15 }}>
                <Text style={modalStyles.title}>Fill PO Details</Text>
                <Text style={modalStyles.subtitle} numberOfLines={1}>{poModalReport?.Maktx}</Text>
              </View>
              <TouchableOpacity onPress={() => setPoModalReport(null)} style={modalStyles.closeBtn}>
                <Icons.X size={20} color={colors.textMuted} weight="bold" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
              <View style={styles.poInputContainer}>
                <Text style={styles.poInputLabel}>Vendor</Text>
                <TextInput style={styles.poInput} value={poDetails.vendor} onChangeText={(t) => setPoDetails({ ...poDetails, vendor: t })} placeholder="Enter Vendor" placeholderTextColor={colors.textFaint} />
              </View>
              <View style={styles.poInputContainer}>
                <Text style={styles.poInputLabel}>Plant</Text>
                <TextInput style={styles.poInput} value={poDetails.plant} onChangeText={(t) => setPoDetails({ ...poDetails, plant: t })} placeholder="e.g. HO00" placeholderTextColor={colors.textFaint} />
              </View>
              <View style={styles.poInputContainer}>
                <Text style={styles.poInputLabel}>Purchase Organization</Text>
                <TextInput style={styles.poInput} value={poDetails.purchOrg} onChangeText={(t) => setPoDetails({ ...poDetails, purchOrg: t })} placeholder="e.g. 1000" placeholderTextColor={colors.textFaint} />
              </View>
              <View style={styles.poInputContainer}>
                <Text style={styles.poInputLabel}>Purchase Group</Text>
                <TextInput style={styles.poInput} value={poDetails.purchGroup} onChangeText={(t) => setPoDetails({ ...poDetails, purchGroup: t })} placeholder="e.g. P01" placeholderTextColor={colors.textFaint} />
              </View>
              <View style={styles.poInputContainer}>
                <Text style={styles.poInputLabel}>Company Code</Text>
                <TextInput style={styles.poInput} value={poDetails.compCode} onChangeText={(t) => setPoDetails({ ...poDetails, compCode: t })} placeholder="e.g. 1000" placeholderTextColor={colors.textFaint} />
              </View>
              <View style={styles.poInputContainer}>
                <Text style={styles.poInputLabel}>PO Amount</Text>
                <TextInput style={styles.poInput} value={poDetails.amount} onChangeText={(t) => setPoDetails({ ...poDetails, amount: t })} placeholder="Enter Amount" placeholderTextColor={colors.textFaint} keyboardType="numeric" />
              </View>
              <View style={styles.poInputContainer}>
                <Text style={styles.poInputLabel}>Quantity</Text>
                <TextInput style={styles.poInput} value={poDetails.quantity} onChangeText={(t) => setPoDetails({ ...poDetails, quantity: t })} placeholder="Enter Quantity" placeholderTextColor={colors.textFaint} keyboardType="numeric" />
              </View>
              <View style={styles.poInputContainer}>
                <Text style={styles.poInputLabel}>Unit</Text>
                <TextInput style={styles.poInput} value={poDetails.unit} onChangeText={(t) => setPoDetails({ ...poDetails, unit: t })} placeholder="e.g. PCS" placeholderTextColor={colors.textFaint} />
              </View>
              <View style={styles.poInputContainer}>
                <Text style={styles.poInputLabel}>Document Type</Text>
                <TextInput style={styles.poInput} value={poDetails.docType} onChangeText={(t) => setPoDetails({ ...poDetails, docType: t })} placeholder="e.g. NB" placeholderTextColor={colors.textFaint} />
              </View>
              <View style={styles.poInputContainer}>
                <Text style={styles.poInputLabel}>Document Date</Text>
                <TextInput style={styles.poInput} value={poDetails.docDate} onChangeText={(t) => setPoDetails({ ...poDetails, docDate: t })} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textFaint} />
              </View>
              <View style={styles.poInputContainer}>
                <Text style={styles.poInputLabel}>Incoterms 1</Text>
                <TextInput style={styles.poInput} value={poDetails.incoterms1} onChangeText={(t) => setPoDetails({ ...poDetails, incoterms1: t })} placeholder="e.g. FOB" placeholderTextColor={colors.textFaint} />
              </View>
              <View style={styles.poInputContainer}>
                <Text style={styles.poInputLabel}>Incoterms 2</Text>
                <TextInput style={styles.poInput} value={poDetails.incoterms2} onChangeText={(t) => setPoDetails({ ...poDetails, incoterms2: t })} placeholder="e.g. Port Name" placeholderTextColor={colors.textFaint} />
              </View>
            </ScrollView>

            <View style={modalStyles.footer}>
              <TouchableOpacity style={[modalStyles.footerCloseBtn, { backgroundColor: colors.brand, borderColor: colors.brand }]} onPress={submitPoDetails} activeOpacity={0.8}>
                <Text style={[modalStyles.footerCloseBtnText, { color: "#fff" }]}>Submit PO Details</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!reportToApprove} transparent={true} animationType="fade" onRequestClose={() => setReportToApprove(null)}>
        <View style={styles.modalOverlay}>
          <GlassSurface intensity="modal" tint="light" borderRadius={radius._20} style={styles.modalContent as any}>
            <View style={styles.modalHeader}>
              <Icons.WarningCircle size={28} color={colors.brand} weight="duotone" />
              <Text style={styles.modalTitle}>Approve Report</Text>
            </View>
            <Text style={styles.modalMessage}>
              Are you sure you want to approve the report for material <Text style={{ fontWeight: 'bold' }}>{reportToApprove?.Matnr}</Text>? This action cannot be undone.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setReportToApprove(null)}>
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnApprove} onPress={confirmApproval}>
                <Text style={styles.modalBtnApproveText}>Yes, Approve</Text>
              </TouchableOpacity>
            </View>
          </GlassSurface>
        </View>
      </Modal>

      <ReportDetailsModal
        visible={!!reportToView}
        report={reportToView ? { ...reportToView, Criticality: reportToView.Criticality } : null}
        onClose={async () => {
          setReportToView(null);
          setRefreshing(true);
          await new Promise((resolve) => setTimeout(resolve, 800));
          await loadReports(false);
        }}
      />
    </View>
  );
}

// ============================================================================
// 3. MAIN EXPORT (ROUTER LAYER WITH SAP INTEGRITY)
// ============================================================================
export default function DashboardScreen() {
  const { user } = useAuth();
  const isAdmin = user?.Role?.toLowerCase() === "admin";
  return (
    <>
      <StatusBar style="dark" />
      {isAdmin ? <AdminDashboard /> : <VendorDashboard />}
    </>
  );
}

const isWeb = Platform.OS === 'web';
const cardPadding = isWeb ? 12 : 16;
const cardRadius = isWeb ? 12 : radius._24;
const btnHeight = isWeb ? 36 : 44;
const btnRadius = isWeb ? 8 : radius._15;
const thumbSize = isWeb ? 40 : 50;
const thumbRadius = isWeb ? 10 : 15;
const titleSize = isWeb ? font.body : font.title;
const spaceMt = isWeb ? 8 : 12;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  loader: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg, gap: 12 },
  loaderText: { color: colors.textMuted, fontWeight: font.medium, fontSize: font.sub },

  hero: {
    paddingHorizontal: 20,
    paddingBottom: 22,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  heroTopRow: { flexDirection: "row", alignItems: "center" },
  greeting: { color: colors.textMuted, fontSize: font.sub, fontWeight: font.semibold },
  vendorName: { color: colors.ink, fontSize: 22, fontWeight: font.black, marginTop: 2, letterSpacing: -0.4 },
  vendorCodeChip: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", backgroundColor: colors.brandSoft, paddingHorizontal: 10, height: 24, borderRadius: radius.pill, marginTop: 8 },
  vendorCodeText: { color: colors.brand, fontSize: font.micro, fontWeight: font.bold },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  heroStats: {
    flexDirection: "row",
    paddingVertical: 14,
    marginTop: 18,
    backgroundColor: colors.brandSoft,
    borderRadius: radius._20,
  },
  heroStat: { flex: 1, alignItems: "center" },
  heroStatValue: { color: colors.ink, fontSize: 20, fontWeight: font.black },
  heroStatLabel: { color: colors.textMuted, fontSize: font.micro, fontWeight: font.semibold, marginTop: 2 },
  heroDivider: { width: 1, backgroundColor: colors.border, marginVertical: 4 },

  chartsRow: { flexDirection: "row", gap: 14, marginTop: 16 },
  chartsRowPhone: { flexDirection: "column" },
  chartCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius._20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    alignItems: "center",
  },
  chartCardPhone: { width: "100%" },
  chartCardTitle: { fontSize: font.sub, fontWeight: font.bold, color: colors.ink, marginBottom: 12, alignSelf: "flex-start" },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius._17,
    paddingHorizontal: 14,
    height: 50,
    marginTop: 16,
  },
  searchInput: { flex: 1, fontSize: font.body, color: colors.ink, fontWeight: font.medium, padding: 0 },

  chipsRow: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 4, gap: 10 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: cardRadius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: cardPadding,
  },
  cardTop: { flexDirection: "row", gap: isWeb ? 10 : 12, alignItems: "center" },
  thumb: {
    width: thumbSize,
    height: thumbSize,
    borderRadius: thumbRadius,
    backgroundColor: colors.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  ringPlaceholder: {
    width: thumbSize,
    height: thumbSize,
    borderRadius: thumbSize / 2,
    borderWidth: 2,
    borderColor: colors.brandSoft2,
    backgroundColor: colors.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  code: { fontSize: titleSize, fontWeight: font.black, color: colors.ink },
  desc: { fontSize: font.sub, color: colors.textMuted, marginTop: 2, lineHeight: 18 },

  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: spaceMt },
  photoChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 8, height: 26, borderRadius: radius.pill },
  photoChipText: { fontSize: font.caption, color: colors.textBody, fontWeight: font.bold },

  specRow: { flexDirection: "row", flexWrap: "wrap", gap: isWeb ? 6 : 8, marginTop: spaceMt },
  specChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    height: 28,
    borderRadius: radius.pill,
  },
  specText: { fontSize: font.caption, color: colors.textBody, fontWeight: font.semibold },

  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceAlt,
    borderRadius: isWeb ? 8 : radius._15,
    padding: isWeb ? 10 : 12,
    marginTop: spaceMt,
  },
  detailItem: { width: "48%", marginBottom: 10 },
  detailLabel: { fontSize: font.micro, color: colors.textFaint, fontWeight: font.semibold, textTransform: "uppercase" },
  detailValue: { fontSize: font.sub, color: colors.textBody, fontWeight: font.bold, marginTop: 2 },

  cardActions: { flexDirection: "row", alignItems: "center", gap: isWeb ? 8 : 10, marginTop: spaceMt + 4 },
  detailsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    height: btnHeight,
    borderRadius: btnRadius,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  detailsBtnText: { fontSize: font.sub, fontWeight: font.bold, color: colors.textBody },
  inspectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: btnHeight,
    borderRadius: btnRadius,
  },
  inspectText: { color: "#fff", fontSize: font.body, fontWeight: font.bold },

  adminFiltersContainer: {
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  filterTitle: {
    fontSize: font.sub,
    fontWeight: font.bold,
    color: colors.ink,
    marginBottom: 8,
  },
  filterInputsRow: {
    flexDirection: "row",
    gap: 6,
  },
  searchBarAdminCompact: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius._12,
    paddingHorizontal: 8,
    height: 40,
  },
  searchInputCompact: {
    flex: 1,
    fontSize: font.micro,
    color: colors.ink,
    padding: 0
  },

  adminCard: {
    backgroundColor: colors.surface,
    borderRadius: btnRadius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: cardPadding,
  },
  adminCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  adminCardCode: {
    fontSize: font.body,
    fontWeight: font.black,
    color: colors.ink,
  },
  adminCardDesc: {
    fontSize: font.micro,
    color: colors.textMuted,
    marginTop: 2,
  },
  adminBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  badgeDone: { backgroundColor: "#dcfce7", borderColor: "#4ade80" },
  badgeDraft: { backgroundColor: "#fef9c3", borderColor: "#facc15" },
  adminBadgeText: { fontSize: font.micro, fontWeight: font.bold },
  badgeDoneText: { color: "#16a34a" },
  badgeDraftText: { color: "#ca8a04" },

  adminCardMid: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceAlt,
    borderRadius: btnRadius,
    padding: isWeb ? 8 : 10,
    marginBottom: isWeb ? 8 : 12,
  },
  adminMicroCol: {
    flex: 1,
  },
  adminMicroLabel: {
    fontSize: font.micro,
    color: colors.textFaint,
    fontWeight: font.semibold,
    textTransform: "uppercase",
  },
  adminMicroValue: {
    fontSize: font.sub,
    color: colors.textBody,
    fontWeight: font.bold,
    marginTop: 2,
  },

  adminApproveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.brand,
    paddingVertical: isWeb ? 8 : 10,
    borderRadius: btnRadius,
  },
  adminApproveBtnText: {
    color: "#fff",
    fontSize: font.sub,
    fontWeight: font.bold,
  },

  poInputContainer: {
    marginBottom: 16
  },
  poInputLabel: {
    fontSize: font.sub,
    fontWeight: font.bold,
    color: colors.ink,
    marginBottom: 8
  },
  poInput: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius._12,
    paddingHorizontal: 14,
    height: 48,
    fontSize: font.body,
    color: colors.ink
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    padding: 24,
    width: "100%",
    maxWidth: 400,
    ...shadow.card,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: font.title,
    fontWeight: font.black,
    color: colors.ink,
  },
  modalMessage: {
    fontSize: font.body,
    color: colors.textMuted,
    lineHeight: 22,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalBtnCancel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius._12,
    backgroundColor: colors.surfaceAlt,
  },
  modalBtnCancelText: {
    fontSize: font.body,
    fontWeight: font.bold,
    color: colors.textBody,
  },
  modalBtnApprove: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius._12,
    backgroundColor: colors.brand,
  },
  modalBtnApproveText: {
    fontSize: font.body,
    fontWeight: font.bold,
    color: "#fff",
  },
});

// import * as Haptics from "expo-haptics";
// import { LinearGradient } from "expo-linear-gradient";
// import { useFocusEffect, useRouter } from "expo-router";
// import { StatusBar } from "expo-status-bar";
// import * as Icons from "phosphor-react-native";
// import React, { useCallback, useEffect, useMemo, useState } from "react";
// import {
//   ActivityIndicator,
//   Alert,
//   LayoutAnimation,
//   Modal,
//   Platform,
//   RefreshControl,
//   ScrollView,
//   StyleSheet,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   UIManager,
//   View,
// } from "react-native";
// import Animated, { FadeInDown } from "react-native-reanimated";
// import { useSafeAreaInsets } from "react-native-safe-area-context";

// import Chip from "@/components/ui/Chip";
// import EmptyState from "@/components/ui/EmptyState";
// import ProgressRing from "@/components/ui/ProgressRing";
// import SectionTitle from "@/components/ui/SectionTitle";
// import StatusPill from "@/components/ui/StatusPill";
// import { colors, font, gradients, radius, shadow } from "@/constants/theme";
// import { useAuth } from "@/contexts/AuthContext";
// import { api } from "@/lib/config";
// import { MouldRecord, progressOf, useInspection } from "@/lib/inspectionStore";

// if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
//   UIManager.setLayoutAnimationEnabledExperimental(true);
// }

// type VendorType = { vendorCode: string; vendorName: string; email: string; matnr: string };
// type MaterialItem = {
//   materialCode: string;
//   materialDescription: string;
//   componentPart: string;
//   runnerType: string;
//   granulesGrade: string;
//   machineCode: string;
//   cavity: string;
//   runningCavity: string;
//   cycleTime: string;
//   efficiency: string;
//   hoursPerDay: string;
//   designCode: string;
//   mouldLife: string;
//   mouldShots: string;
//   planningCode: string;
//   fgCode: string;
// };

// const STATUS_FILTERS = [
//   { key: "All", label: "All" },
//   { key: "in_progress", label: "In progress" },
//   { key: "done", label: "Done" },
//   { key: "not_started", label: "Not started" },
// ] as const;

// const SECTION_TITLES: Record<string, string> = {
//   VB: "Visual & Basic Condition",
//   MA: "Mould Base & Alignment",
//   CC: "Cavity & Core Condition",
//   CS: "Cooling System",
//   ES: "Ejection System",
//   MC: "Mechanism Check",
//   HC: "Hydraulic Core / Slides",
//   FC: "Collapsible Core",
//   NI: "Component Quality Details",
// };

// function greeting() {
//   const h = new Date().getHours();
//   if (h < 12) return "Good morning";
//   if (h < 17) return "Good afternoon";
//   return "Good evening";
// }

// // Helper function to handle SAP OData V2 Dates like /Date(1783209600000)/
// const formatSAPDate = (odataDate: string) => {
//   if (!odataDate || !odataDate.startsWith("/Date(")) {
//     return { display: odataDate || "—", raw: odataDate || "" };
//   }
//   const timestamp = parseInt(odataDate.match(/\d+/)?.[0] || "0", 10);
//   const d = new Date(timestamp);
//   const yyyy = d.getFullYear();
//   const mm = String(d.getMonth() + 1).padStart(2, '0');
//   const dd = String(d.getDate()).padStart(2, '0');

//   return {
//     display: `${dd}/${mm}/${yyyy}`,
//     raw: `${yyyy}${mm}${dd}` // Useful for filtering
//   };
// };

// //const formatToODataDateTime = (odataDate?: string) => formatSAPDate(odataDate || "");

// const DetailItem = ({ label, value }: { label: string; value: string }) => (
//   <View style={styles.detailItem}>
//     <Text style={styles.detailLabel}>{label}</Text>
//     <Text style={styles.detailValue} numberOfLines={1}>
//       {value || "—"}
//     </Text>
//   </View>
// );

// function statusKind(rec?: MouldRecord) {
//   if (rec?.status === "done") return "done" as const;
//   if (rec?.status === "in_progress") return "inprogress" as const;
//   return "notstarted" as const;
// }

// const SpecChip = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
//   <View style={styles.specChip}>
//     {icon}
//     <Text style={styles.specText}>{text}</Text>
//   </View>
// );

// const HeroStat = ({ value, label }: { value: number; label: string }) => (
//   <View style={styles.heroStat}>
//     <Text style={styles.heroStatValue}>{value}</Text>
//     <Text style={styles.heroStatLabel}>{label}</Text>
//   </View>
// );

// // ============================================================================
// // REPORT DETAILS MODAL COMPONENT (FOR ADMIN VIEW)
// // ============================================================================
// function ReportDetailsModal({ visible, report, onClose }: { visible: boolean; report: any; onClose: () => void }) {
//   const [loading, setLoading] = useState(false);
//   const [data, setData] = useState<any>(null);

//   useEffect(() => {
//     if (visible && report) {
//       fetchReportData();
//     } else {
//       setData(null);
//     }
//   }, [visible, report]);

//   const fetchReportData = async () => {
//     try {
//       setLoading(true);
//       // const formattedDate = formatToODataDateTime(report.ZsubDate);
//       const res = await api.get("/ZMouldGetDataSet", {
//         params: {
//           $filter: `Matnr eq '${report.Matnr}' and Lifnr eq '${report.Lifnr}' and Zaction eq 'X'`,
//           $format: "json",
//         },
//       });

//       const rawResults = res.data?.d?.results || [];
//       const grouped: any = { checklists: {}, PM: [], SP: [], IS: [] };

//       rawResults.forEach((item: any) => {
//         const colId = item.ZmouldColId;
//         const record = {
//           name: item.ZmouldColName?.trim(),
//           val1: item.ZmouldColVal1?.trim(),
//           val2: item.ZmouldColVal2?.trim(),
//           val3: item.ZmouldColVal3?.trim(),
//         };

//         if (colId === "PM") grouped.PM.push(record);
//         else if (colId === "SP") grouped.SP.push(record);
//         else if (colId === "IS") grouped.IS.push(record);
//         else if (SECTION_TITLES[colId]) {
//           if (!grouped.checklists[colId]) grouped.checklists[colId] = [];
//           grouped.checklists[colId].push(record);
//         }
//       });

//       setData(grouped);
//     } catch (error) {
//       console.error("Failed to load report details:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
//       <View style={modalStyles.overlay}>
//         <View style={modalStyles.modalContainer}>

//           {/* Header */}
//           <View style={modalStyles.header}>
//             <View style={{ flex: 1, marginRight: 15 }}>
//               <Text style={modalStyles.title} numberOfLines={1}>{report?.Matnr}</Text>
//               <Text style={modalStyles.subtitle} numberOfLines={1}>{report?.Maktx}</Text>
//             </View>
//             <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
//               <Icons.X size={20} color={colors.textMuted} weight="bold" />
//             </TouchableOpacity>
//           </View>

//           {/* Content */}
//           {loading ? (
//             <View style={modalStyles.loader}>
//               <ActivityIndicator size="large" color={colors.brand} />
//               <Text style={modalStyles.loaderText}>Loading report data...</Text>
//             </View>
//           ) : (
//             <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={modalStyles.scrollContent}>

//               {/* CHECKLISTS */}
//               {data && Object.keys(data.checklists).map((key) => (
//                 <View key={key} style={modalStyles.sectionContainer}>
//                   <SectionTitle title={SECTION_TITLES[key]} subtitle={`${data.checklists[key].length} checks`} />
//                   <View style={[modalStyles.card, shadow.soft]}>
//                     {data.checklists[key].map((item: any, idx: number) => (
//                       <View key={idx} style={[modalStyles.row, idx !== data.checklists[key].length - 1 && modalStyles.borderBottom]}>
//                         <View style={{ flex: 1 }}>
//                           <Text style={modalStyles.taskName}>{item.name}</Text>
//                           {!!item.val2 && <Text style={modalStyles.remarksText}>Remarks: {item.val2}</Text>}
//                         </View>
//                         <View style={[modalStyles.badge, item.val1 === "Yes" ? modalStyles.badgeSuccess : modalStyles.badgeDanger]}>
//                           <Text style={[modalStyles.badgeText, item.val1 === "Yes" ? modalStyles.badgeSuccessText : modalStyles.badgeDangerText]}>
//                             {item.val1 || "N/A"}
//                           </Text>
//                         </View>
//                       </View>
//                     ))}
//                   </View>
//                 </View>
//               ))}

//               {/* PREVENTIVE MAINTENANCE */}
//               {data?.PM && data.PM.length > 0 && (
//                 <View style={modalStyles.sectionContainer}>
//                   <SectionTitle title="Preventive Maintenance" subtitle={`${data.PM.length} tasks`} />
//                   <View style={[modalStyles.card, shadow.soft]}>
//                     {data.PM.map((item: any, idx: number) => (
//                       <View key={idx} style={[modalStyles.row, idx !== data.PM.length - 1 && modalStyles.borderBottom]}>
//                         <View style={{ flex: 1 }}>
//                           <Text style={modalStyles.taskName}>{item.name}</Text>
//                           <Text style={modalStyles.remarksText}>Date: {item.val3 || "No date"}</Text>
//                         </View>
//                         <View style={[modalStyles.badge, item.val1 === "Yes" ? modalStyles.badgeWarning : modalStyles.badgeNeutral]}>
//                           <Text style={[modalStyles.badgeText, item.val1 === "Yes" ? modalStyles.badgeWarningText : modalStyles.badgeNeutralText]}>
//                             {item.val1 === "Yes" ? item.val2 || "Priority" : "Not Required"}
//                           </Text>
//                         </View>
//                       </View>
//                     ))}
//                   </View>
//                 </View>
//               )}

//               {/* SPARE PARTS */}
//               {data?.SP && data.SP.length > 0 && (
//                 <View style={modalStyles.sectionContainer}>
//                   <SectionTitle title="Spare Parts" subtitle={`${data.SP.length} parts`} />
//                   <View style={[modalStyles.card, shadow.soft]}>
//                     {data.SP.map((item: any, idx: number) => (
//                       <View key={idx} style={[modalStyles.row, idx !== data.SP.length - 1 && modalStyles.borderBottom]}>
//                         <View style={{ flex: 1 }}>
//                           <Text style={modalStyles.taskName}>{item.name}</Text>
//                           <Text style={modalStyles.remarksText}>Qty/Spec: {item.val1}</Text>
//                         </View>
//                         <Text style={modalStyles.costText}>{item.val2 ? `₹ ${item.val2}` : "—"}</Text>
//                       </View>
//                     ))}
//                   </View>
//                 </View>
//               )}

//               {/* INSPECTION SUMMARY */}
//               {data?.IS && data.IS.length > 0 && (
//                 <View style={modalStyles.sectionContainer}>
//                   <SectionTitle title="Inspection Summary" subtitle="Matrix review" />
//                   {data.IS.map((item: any, idx: number) => (
//                     <View key={idx} style={[modalStyles.summaryCard, shadow.soft]}>
//                       <View style={modalStyles.summaryItem}>
//                         <Text style={modalStyles.summaryLabel}>Condition</Text>
//                         <Text style={modalStyles.summaryValue}>{item.val1}</Text>
//                       </View>
//                       <View style={modalStyles.summaryItem}>
//                         <Text style={modalStyles.summaryLabel}>Action Required</Text>
//                         <Text style={modalStyles.summaryValue}>{item.val2}</Text>
//                       </View>
//                       {!!item.val3 && (
//                         <View style={modalStyles.summaryItem}>
//                           <Text style={modalStyles.summaryLabel}>Remarks</Text>
//                           <Text style={modalStyles.summaryValue}>{item.val3}</Text>
//                         </View>
//                       )}
//                     </View>
//                   ))}
//                 </View>
//               )}

//               {(!data || (Object.keys(data.checklists).length === 0 && data.PM.length === 0 && data.SP.length === 0 && data.IS.length === 0)) && (
//                 <EmptyState title="No details found" message="There is no inspection data available for this report." />
//               )}
//             </ScrollView>
//           )}

//           {/* Sticky Bottom Close Button */}
//           <View style={modalStyles.footer}>
//             <TouchableOpacity style={modalStyles.footerCloseBtn} onPress={onClose} activeOpacity={0.8}>
//               <Text style={modalStyles.footerCloseBtnText}>Close Report</Text>
//             </TouchableOpacity>
//           </View>

//         </View>
//       </View>
//     </Modal>
//   );
// }

// // ============================================================================
// // 1. VENDOR (USER) DASHBOARD
// // ============================================================================
// function MouldCard({
//   item,
//   index,
//   record,
//   onInspect,
// }: {
//   item: MaterialItem;
//   index: number;
//   record?: MouldRecord;
//   onInspect: () => void;
// }) {
//   const [expanded, setExpanded] = useState(false);
//   const progress = progressOf(record);
//   const started = record && record.status !== "not_started";

//   const toggle = () => {
//     LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
//     Haptics.selectionAsync();
//     setExpanded((e) => !e);
//   };

//   return (
//     <Animated.View entering={FadeInDown.delay(index * 60).duration(450)} style={[styles.card, shadow.card]}>
//       <View style={styles.cardTop}>
//         <View style={styles.thumb}>
//           <Icons.Cube size={26} color={colors.brand} weight="duotone" />
//         </View>
//         <View style={{ flex: 1 }}>
//           <Text style={styles.code} numberOfLines={1}>
//             {item.materialCode}
//           </Text>
//           <Text style={styles.desc} numberOfLines={2}>
//             {item.materialDescription}
//           </Text>
//         </View>
//         {started ? (
//           <ProgressRing progress={progress} size={50} strokeWidth={6} />
//         ) : (
//           <View style={styles.ringPlaceholder}>
//             <Icons.ArrowRight size={18} color={colors.brand} weight="bold" />
//           </View>
//         )}
//       </View>

//       <View style={styles.metaRow}>
//         <StatusPill kind={statusKind(record)} />
//         {!!record?.photos && (
//           <View style={styles.photoChip}>
//             <Icons.Camera size={13} color={colors.textMuted} weight="fill" />
//             <Text style={styles.photoChipText}>{record.photos}</Text>
//           </View>
//         )}
//       </View>

//       <View style={styles.specRow}>
//         {!!item.machineCode && <SpecChip icon={<Icons.Factory size={13} color={colors.textMuted} weight="bold" />} text={item.machineCode} />}
//         {!!item.cavity && <SpecChip icon={<Icons.GridFour size={13} color={colors.textMuted} weight="bold" />} text={`${item.cavity} cav`} />}
//         {!!item.cycleTime && <SpecChip icon={<Icons.Timer size={13} color={colors.textMuted} weight="bold" />} text={`${item.cycleTime}s`} />}
//       </View>

//       {expanded && (
//         <View style={styles.detailsGrid}>
//           <DetailItem label="Runner" value={item.runnerType} />
//           <DetailItem label="Grade" value={item.granulesGrade} />
//           <DetailItem label="Running Cav." value={item.runningCavity} />
//           <DetailItem label="Efficiency" value={item.efficiency} />
//           <DetailItem label="Hours / Day" value={item.hoursPerDay} />
//           <DetailItem label="Design Code" value={item.designCode} />
//           <DetailItem label="Mould Life" value={item.mouldLife} />
//           <DetailItem label="Mould Shots" value={item.mouldShots} />
//         </View>
//       )}

//       <View style={styles.cardActions}>
//         <TouchableOpacity style={styles.detailsBtn} onPress={toggle} activeOpacity={0.7}>
//           <Text style={styles.detailsBtnText}>{expanded ? "Hide" : "Details"}</Text>
//           <Icons.CaretDown
//             size={15}
//             color={colors.textMuted}
//             weight="bold"
//             style={{ transform: [{ rotate: expanded ? "180deg" : "0deg" }] }}
//           />
//         </TouchableOpacity>

//         <TouchableOpacity activeOpacity={0.9} onPress={onInspect} style={{ flex: 1 }}>
//           <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.inspectBtn}>
//             <Icons.ClipboardText size={17} color="#fff" weight="fill" />
//             <Text style={styles.inspectText}>{started ? "Continue" : "Start Inspection"}</Text>
//           </LinearGradient>
//         </TouchableOpacity>
//       </View>
//     </Animated.View>
//   );
// }

// function VendorDashboard() {
//   const { user } = useAuth();
//   const { records, startInspection, getRecord } = useInspection();
//   const router = useRouter();
//   const insets = useSafeAreaInsets();

//   const [vendor, setVendor] = useState<VendorType | null>(null);
//   const [materials, setMaterials] = useState<MaterialItem[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [query, setQuery] = useState("");
//   const [filter, setFilter] = useState<string>("All");

//   useFocusEffect(
//     useCallback(() => {
//       const hasData = materials.length > 0;
//       loadDashboard(!hasData);
//     }, [user?.Email])
//   );

//   const loadDashboard = async (showLoader = true) => {
//     if (showLoader) setLoading(true);
//     try {
//       const validEmail = user?.Email || user?.email;
//       console.log("Loading dashboard for email:", validEmail);

//       const { data } = await api.get("/ZMouldDetailsSet", {
//         params: {
//           "$filter": `SmtpAddr eq '${validEmail}'`,
//           "$format": "json"
//         }
//       });

//       console.log("Dashboard SAP Response:", data);
//       const results = data?.d?.results || [];

//       if (results.length > 0) {
//         // Build vendor card information from the first matching record fields safely
//         setVendor({
//           vendorCode: results[0].Lifnr,
//           vendorName: results[0].Name1,
//           email: results[0].SmtpAddr,
//           matnr: results[0].Matnr,
//         });

//         const mappedMaterials = results.map((item: any) => ({
//           materialCode: item.Matnr,
//           materialDescription: item.Maktx,
//           componentPart: item.ZzcompPart,
//           runnerType: item.Zzrunner,
//           granulesGrade: item.Zzgran,
//           machineCode: item.Zzmach,
//           cavity: item.ZzcavityNo,
//           runningCavity: item.ZzrunCavity,
//           cycleTime: item.ZzcycTime,
//           efficiency: item.ZzfacProd,
//           hoursPerDay: item.ZzhoursDay,
//           designCode: item.ZzmdsCode,
//           mouldLife: item.ZzmoldLife,
//           mouldShots: item.ZzmoldShots,
//           planningCode: item.ZzplanCode,
//           fgCode: item.ZzfgCode,
//         }));

//         const unique = mappedMaterials.filter(
//           (it: any, i: number, self: any[]) =>
//             i === self.findIndex((t) => t.materialCode === it.materialCode)
//         );

//         setMaterials(unique);
//       } else {
//         console.log("No materials found");
//         setMaterials([]);
//       }
//     } catch (e) {
//       console.error("Fetch failed", e);
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   };

//   const counts = useMemo(() => {
//     let done = 0;
//     let inProgress = 0;
//     for (const m of materials) {
//       const s = records[m.materialCode]?.status;
//       if (s === "done") done++;
//       else if (s === "in_progress") inProgress++;
//     }
//     return { done, inProgress, total: materials.length };
//   }, [materials, records]);

//   const filtered = useMemo(() => {
//     const q = query.trim().toLowerCase();
//     return materials.filter((m) => {
//       const matchesQuery = !q || m.materialCode?.toLowerCase().includes(q) || m.materialDescription?.toLowerCase().includes(q);
//       const s = records[m.materialCode]?.status ?? "not_started";
//       const matchesFilter = filter === "All" || s === filter;
//       return matchesQuery && matchesFilter;
//     });
//   }, [materials, query, filter, records]);

//   const onInspect = (item: MaterialItem) => {
//     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
//     startInspection({ materialCode: item.materialCode, materialDescription: item.materialDescription });
//     router.push({ pathname: "/apps/mouldhealthcheck/(modals)/InjectMould", params: { ...item } });
//   };

//   if (loading) {
//     return (
//       <View style={[styles.loader, isTabletUp && { paddingLeft: SIDEBAR_WIDTH }]}>
//         <ActivityIndicator size="large" color={colors.brand} />
//         <Text style={styles.loaderText}>Loading your moulds…</Text>
//       </View>
//     );
//   }

//   return (
//     <View style={styles.root}>
//       <Animated.ScrollView
//         showsVerticalScrollIndicator={false}
//         contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
//         refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadDashboard(); }} tintColor={colors.brand} colors={[colors.brand]} />}
//       >
//         <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { paddingTop: insets.top + 14 }]}>
//           <View style={styles.heroBlob} />
//           <View style={styles.heroTopRow}>
//             <View style={{ flex: 1 }}>
//               <Text style={styles.greeting}>{greeting()} 👋</Text>
//               <Text style={styles.vendorName} numberOfLines={1}>{vendor?.vendorName || "Vendor"}</Text>
//               {!!vendor?.vendorCode && (
//                 <View style={styles.vendorCodeChip}>
//                   <Icons.Factory size={12} color="#fff" weight="fill" />
//                   <Text style={styles.vendorCodeText}>Vendor {vendor.vendorCode}</Text>
//                 </View>
//               )}
//             </View>
//             <View style={styles.avatar}>
//               <Icons.Factory size={24} color="#fff" weight="fill" />
//             </View>
//           </View>

//           <View style={styles.heroStats}>
//             <HeroStat value={counts.total} label="Total moulds" />
//             <View style={styles.heroDivider} />
//             <HeroStat value={counts.inProgress} label="In progress" />
//             <View style={styles.heroDivider} />
//             <HeroStat value={counts.done} label="Inspected" />
//           </View>

//           <View style={styles.searchBar}>
//             <Icons.MagnifyingGlass size={20} color={colors.textMuted} weight="bold" />
//             <TextInput placeholder="Search mould code or name" placeholderTextColor={colors.textFaint} value={query} onChangeText={setQuery} style={styles.searchInput} />
//             {!!query && (
//               <TouchableOpacity onPress={() => setQuery("")} hitSlop={8}>
//                 <Icons.XCircle size={20} color={colors.textFaint} weight="fill" />
//               </TouchableOpacity>
//             )}
//           </View>
//         </LinearGradient>

//         <Animated.ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
//           {STATUS_FILTERS.map((f) => (
//             <Chip key={f.key} label={f.label} active={filter === f.key} onPress={() => setFilter(f.key)} />
//           ))}
//         </Animated.ScrollView>

//         <View style={{ marginTop: 10 }}>
//           <SectionTitle title="Your Moulds" subtitle={`${filtered.length} item${filtered.length === 1 ? "" : "s"}`} />
//           {filtered.length === 0 ? (
//             <EmptyState
//               icon={<Icons.Cube size={34} color={colors.brand} weight="duotone" />}
//               title={materials.length === 0 ? "No moulds assigned yet" : "No matches"}
//               message={materials.length === 0 ? "Pull down to refresh once moulds are assigned to you." : "Try a different search or filter."}
//             />
//           ) : (
//             <View style={{ paddingHorizontal: 16, gap: 14 }}>
//               {filtered.map((item, i) => (
//                 <MouldCard key={item.materialCode + i} item={item} index={i} record={getRecord(item.materialCode)} onInspect={() => onInspect(item)} />
//               ))}
//             </View>
//           )}
//         </View>
//       </Animated.ScrollView>
//     </View>
//   );
// }

// // ============================================================================
// // 2. ADMIN DASHBOARD
// // ============================================================================
// function AdminDashboard() {
//   const { user } = useAuth();
//   const insets = useSafeAreaInsets();
//   const [reports, setReports] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);

//   const [reportToApprove, setReportToApprove] = useState<any | null>(null);
//   const [reportToView, setReportToView] = useState<any | null>(null);

//   const [vendorFilter, setVendorFilter] = useState("");
//   const [materialFilter, setMaterialFilter] = useState("");
//   const [dateFilter, setDateFilter] = useState("");

//   const loadReports = async (showLoader = true) => {
//     if (showLoader) setLoading(true);
//     try {
//       const validEmail = user?.Email || user?.email;

//       const { data } = await api.get("/ZmouldDataReportSet", {
//         params: {
//           "$filter": `Email eq '${validEmail}'`,
//           "$format": "json"
//         }
//       });

//       const results = data?.d?.results || [];

//       const processedReports = results.map((r: any) => ({
//         ...r,
//         LIFNR: r.Lifnr,
//         MATNR: r.Matnr,
//         MAKTX: r.Name1,
//         SUBDATE: r.ZsubDate,
//         COMPLETED_FLAG: r.CompletedFlag,
//         DRAFT_FLAG: r.DraftFlag,
//         CREATED_BY: r.CreatedBy,
//         CREATED_ON: r.CreatedOn,
//         AdminRevFlag: r.AdminRevFlag,
//         AdminApprvFlag: r.AdminApprvFlag,
//         parsedDate: formatSAPDate(r.ZsubDate)
//       }));

//       setReports(processedReports);
//     } catch (e) {
//       console.error("Failed to load admin reports", e);
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   };

//   useFocusEffect(
//     useCallback(() => {
//       loadReports(reports.length === 0);
//     }, [])
//   );

//   const filteredReports = useMemo(() => {
//     return reports.filter((r) => {
//       const vMatch = !vendorFilter || r.LIFNR?.toLowerCase().includes(vendorFilter.toLowerCase());
//       const mMatch = !materialFilter || r.MATNR?.toLowerCase().includes(materialFilter.toLowerCase()) || r.MAKTX?.toLowerCase().includes(materialFilter.toLowerCase());
//       const dMatch = !dateFilter || r.parsedDate.raw.includes(dateFilter) || r.parsedDate.display.includes(dateFilter);
//       return vMatch && mMatch && dMatch;
//     });
//   }, [reports, vendorFilter, materialFilter, dateFilter]);

//   const initiateApproval = (report: any) => {
//     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
//     setReportToApprove(report);
//   };

//   const confirmApproval = async () => {
//     if (!reportToApprove) return;

//     try {
//       const payload = {
//         Lifnr: reportToApprove.LIFNR,
//         Matnr: reportToApprove.MATNR,
//         ZsubDate: reportToApprove.SUBDATE,
//         Zstat: "R", 
//         Zdate: `\/Date(${new Date().getTime()})\/`,
//         Ztime: "PT00H00M00S", 
//         ApprovedBy: user?.Email || user?.email || "ADMIN",
//         ApprovedOn: `\/Date(${new Date().getTime()})\/`,
//         ReviewedBy: user?.Email || user?.email || "ADMIN",
//         ReviewedOn: `\/Date(${new Date().getTime()})\/`,
//       };

//       console.log("Sending approval payload:", payload);

//       const { data } = await api.post("/ZMouldLogSet", payload);

//       setReportToApprove(null);
//       setRefreshing(true);
//       await new Promise((resolve) => setTimeout(resolve, 800));
//       await loadReports(false);

//       if (Platform.OS === 'web') {
//         window.alert("Report approved successfully.");
//       } else {
//         Alert.alert("Success", "Report approved successfully.");
//       }
//     } catch (error: any) {
//       console.error("Approval error:", error);
//       const errorMessage = error?.response?.data?.error || error.message || "Could not reach the server.";

//       if (Platform.OS === 'web') {
//         window.alert(`Error: ${errorMessage}`);
//       } else {
//         Alert.alert("Approval Failed", errorMessage);
//       }
//       setReportToApprove(null); 
//     }
//   };

//   if (loading) {
//     return (
//       <View style={[styles.loader, isTabletUp && { paddingLeft: SIDEBAR_WIDTH }]}>
//         <ActivityIndicator size="large" color={colors.brand} />
//         <Text style={styles.loaderText}>Loading global reports…</Text>
//       </View>
//     );
//   }

//   return (
//     <View style={styles.root}>
//       <Animated.ScrollView
//         showsVerticalScrollIndicator={false}
//         contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
//         refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadReports(); }} tintColor={colors.brand} />}
//       >
//         <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { paddingTop: insets.top + 14 }]}>
//           <View style={styles.heroBlob} />
//           <View style={styles.heroTopRow}>
//             <View style={{ flex: 1 }}>
//               <Text style={styles.greeting}>{greeting()} Admin 👋</Text>
//               <Text style={styles.vendorName}>Global Overview</Text>
//             </View>
//             <View style={styles.avatar}>
//               <Icons.ShieldCheck size={24} color="#fff" weight="fill" />
//             </View>
//           </View>

//           <View style={styles.heroStats}>
//             <HeroStat value={reports.length} label="Total Reports" />
//             <View style={styles.heroDivider} />
//             <HeroStat value={reports.filter(r => r.COMPLETED_FLAG === 'X').length} label="Inspection Completed" />
//             <View style={styles.heroDivider} />
//             <HeroStat value={reports.filter(r => r.DRAFT_FLAG === 'X').length} label="Drafts" />
//           </View>
//         </LinearGradient>

//         <View style={styles.adminFiltersContainer}>
//           <Text style={styles.filterTitle}>Filter Reports</Text>
//           <View style={styles.filterInputsRow}>
//             <View style={styles.searchBarAdminCompact}>
//               <Icons.Buildings size={14} color={colors.textMuted} />
//               <TextInput placeholder="Vendor" placeholderTextColor={colors.textFaint} value={vendorFilter} onChangeText={setVendorFilter} style={styles.searchInputCompact} />
//             </View>
//             <View style={styles.searchBarAdminCompact}>
//               <Icons.Cube size={14} color={colors.textMuted} />
//               <TextInput placeholder="Material" placeholderTextColor={colors.textFaint} value={materialFilter} onChangeText={setMaterialFilter} style={styles.searchInputCompact} />
//             </View>
//             <View style={styles.searchBarAdminCompact}>
//               <Icons.Calendar size={14} color={colors.textMuted} />
//               <TextInput placeholder="Date" placeholderTextColor={colors.textFaint} value={dateFilter} onChangeText={setDateFilter} style={styles.searchInputCompact} />
//             </View>
//           </View>
//         </View>

//         <View style={{ marginTop: 14 }}>
//           <SectionTitle title="Submitted Reports" subtitle={`${filteredReports.length} record${filteredReports.length === 1 ? "" : "s"}`} />
//           {filteredReports.length === 0 ? (
//             <EmptyState
//               icon={<Icons.FileMagnifyingGlass size={34} color={colors.brand} weight="duotone" />}
//               title="No reports found"
//               message="Adjust your filters or pull to refresh."
//             />
//           ) : (
//             <View style={{ paddingHorizontal: 16, gap: 12 }}>
//               {filteredReports.map((report, i) => (
//                 <Animated.View key={i} entering={FadeInDown.delay(i * 30).duration(400)} style={shadow.card}>
//                   <TouchableOpacity 
//                     style={styles.adminCard} 
//                     activeOpacity={0.7}
//                     onPress={() => setReportToView(report)}
//                   >
//                   <View style={styles.adminCardHeader}>
//                     <View style={{ flex: 1, marginRight: 10 }}>
//                       <Text style={styles.adminCardCode} numberOfLines={1}>{report.Matnr}</Text>
//                       <Text style={styles.adminCardDesc} numberOfLines={1}>{report.Maktx}</Text>
//                     </View>
//                     <View style={[styles.adminBadge, report.CompletedFlag === 'X' ? styles.badgeDone : styles.badgeDraft]}>
//                       <Text style={[styles.adminBadgeText, report.CompletedFlag === 'X' ? styles.badgeDoneText : styles.badgeDraftText]}>
//                         {report.CompletedFlag === 'X' ? 'Inspection Completed' : 'Draft'}
//                       </Text>
//                     </View>
//                     <View style={[styles.adminBadge, report.AdminRevFlag === 'X' ? styles.badgeDone : styles.badgeDraft]}>
//                       <Text style={[styles.adminBadgeText, report.AdminRevFlag === 'X' ? styles.badgeDoneText : styles.badgeDraftText]}>
//                         {report.AdminRevFlag === 'X' ? 'Admin Reviewed' : 'Not Reviewed'}
//                       </Text>
//                     </View>
//                   </View>

//                   <View style={styles.adminCardMid}>
//                     <View style={styles.adminMicroCol}>
//                       <Text style={styles.adminMicroLabel}>Vendor</Text>
//                       <Text style={styles.adminMicroValue} numberOfLines={1}>{report.Lifnr}</Text>
//                     </View>
//                     <View style={styles.adminMicroCol}>
//                       <Text style={styles.adminMicroLabel}>Sub. Date</Text>
//                       <Text style={styles.adminMicroValue}>{report.parsedDate.display}</Text>
//                     </View>
//                     <View style={styles.adminMicroCol}>
//                       <Text style={styles.adminMicroLabel}>Created By</Text>
//                       <Text style={styles.adminMicroValue} numberOfLines={1}>{report.CreatedBy}</Text>
//                     </View>
//                   </View>

//                   <TouchableOpacity activeOpacity={0.8} style={styles.adminApproveBtn} onPress={() => initiateApproval(report)}>
//                     <Icons.CheckCircle size={16} color="#fff" weight="bold" />
//                     <Text style={styles.adminApproveBtnText}>
//                       Approve Report
//                     </Text>
//                   </TouchableOpacity>
//                   </TouchableOpacity>
//                 </Animated.View>
//               ))}
//             </View>
//           )}
//         </View>
//       </Animated.ScrollView>

//       <Modal visible={!!reportToApprove} transparent={true} animationType="fade" onRequestClose={() => setReportToApprove(null)}>
//         <View style={styles.modalOverlay}>
//           <View style={styles.modalContent}>
//             <View style={styles.modalHeader}>
//               <Icons.WarningCircle size={28} color={colors.brand} weight="duotone" />
//               <Text style={styles.modalTitle}>Approve Report</Text>
//             </View>
//             <Text style={styles.modalMessage}>
//               Are you sure you want to approve the report for material <Text style={{fontWeight: 'bold'}}>{reportToApprove?.Matnr}</Text>? This action cannot be undone.
//             </Text>
//             <View style={styles.modalActions}>
//               <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setReportToApprove(null)}>
//                 <Text style={styles.modalBtnCancelText}>Cancel</Text>
//               </TouchableOpacity>
//               <TouchableOpacity style={styles.modalBtnApprove} onPress={confirmApproval}>
//                 <Text style={styles.modalBtnApproveText}>Yes, Approve</Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         </View>
//       </Modal>

//       <ReportDetailsModal 
//         visible={!!reportToView} 
//         report={reportToView} 
//         onClose={() => setReportToView(null)} 
//       />
//     </View>
//   );
// }

// // ============================================================================
// // 3. MAIN EXPORT (ROUTER LAYER WITH SAP INTEGRITY)
// // ============================================================================
// export default function DashboardScreen() {
//   const { user } = useAuth();
//   const isAdmin = user?.Role?.toLowerCase() === "admin";
//   return (
//     <>
//       <StatusBar style="light" />
//       {isAdmin ? <AdminDashboard /> : <VendorDashboard />}
//     </>
//   );
// }

// const isWeb = Platform.OS === 'web';
// const cardPadding = isWeb ? 12 : 16;
// const cardRadius = isWeb ? 12 : radius._24;
// const btnHeight = isWeb ? 36 : 44;
// const btnRadius = isWeb ? 8 : radius._15;
// const thumbSize = isWeb ? 40 : 50;
// const thumbRadius = isWeb ? 10 : 15;
// const titleSize = isWeb ? font.body : font.title;
// const spaceMt = isWeb ? 8 : 12;

// const styles = StyleSheet.create({
//   root: { flex: 1, backgroundColor: colors.bg },
//   loader: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg, gap: 12 },
//   loaderText: { color: colors.textMuted, fontWeight: font.medium, fontSize: font.sub },

//   hero: {
//     paddingHorizontal: 20,
//     paddingBottom: 22,
//     borderBottomLeftRadius: 30,
//     borderBottomRightRadius: 30,
//     overflow: "hidden",
//   },
//   heroBlob: { position: "absolute", width: 200, height: 200, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.10)", top: -80, right: -50 },
//   heroTopRow: { flexDirection: "row", alignItems: "center" },
//   greeting: { color: "rgba(255,255,255,0.92)", fontSize: font.sub, fontWeight: font.semibold },
//   vendorName: { color: "#fff", fontSize: 22, fontWeight: font.black, marginTop: 2, letterSpacing: -0.4 },
//   vendorCodeChip: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.18)", paddingHorizontal: 10, height: 24, borderRadius: radius.pill, marginTop: 8 },
//   vendorCodeText: { color: "#fff", fontSize: font.micro, fontWeight: font.bold },
//   avatar: {
//     width: 48,
//     height: 48,
//     borderRadius: 16,
//     backgroundColor: "rgba(255,255,255,0.2)",
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   heroStats: {
//     flexDirection: "row",
//     backgroundColor: "rgba(255,255,255,0.16)",
//     borderRadius: radius._20,
//     paddingVertical: 14,
//     marginTop: 18,
//   },
//   heroStat: { flex: 1, alignItems: "center" },
//   heroStatValue: { color: "#fff", fontSize: 20, fontWeight: font.black },
//   heroStatLabel: { color: "rgba(255,255,255,0.85)", fontSize: font.micro, fontWeight: font.semibold, marginTop: 2 },
//   heroDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.25)", marginVertical: 4 },

//   searchBar: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 10,
//     backgroundColor: "#fff",
//     borderRadius: radius._17,
//     paddingHorizontal: 14,
//     height: 50,
//     marginTop: 16,
//   },
//   searchInput: { flex: 1, fontSize: font.body, color: colors.ink, fontWeight: font.medium, padding: 0 },

//   chipsRow: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 4, gap: 10 },

//   card: {
//     backgroundColor: colors.surface,
//     borderRadius: cardRadius,
//     borderWidth: 1,
//     borderColor: colors.border,
//     padding: cardPadding,
//   },
//   cardTop: { flexDirection: "row", gap: isWeb ? 10 : 12, alignItems: "center" },
//   thumb: {
//     width: thumbSize,
//     height: thumbSize,
//     borderRadius: thumbRadius,
//     backgroundColor: colors.brandSoft,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   ringPlaceholder: {
//     width: thumbSize,
//     height: thumbSize,
//     borderRadius: thumbSize / 2,
//     borderWidth: 2,
//     borderColor: colors.brandSoft2,
//     backgroundColor: colors.brandSoft,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   code: { fontSize: titleSize, fontWeight: font.black, color: colors.ink },
//   desc: { fontSize: font.sub, color: colors.textMuted, marginTop: 2, lineHeight: 18 },

//   metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: spaceMt },
//   photoChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 8, height: 26, borderRadius: radius.pill },
//   photoChipText: { fontSize: font.caption, color: colors.textBody, fontWeight: font.bold },

//   specRow: { flexDirection: "row", flexWrap: "wrap", gap: isWeb ? 6 : 8, marginTop: spaceMt },
//   specChip: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 5,
//     backgroundColor: colors.surfaceAlt,
//     borderWidth: 1,
//     borderColor: colors.border,
//     paddingHorizontal: 10,
//     height: 28,
//     borderRadius: radius.pill,
//   },
//   specText: { fontSize: font.caption, color: colors.textBody, fontWeight: font.semibold },

//   detailsGrid: {
//     flexDirection: "row",
//     flexWrap: "wrap",
//     justifyContent: "space-between",
//     backgroundColor: colors.surfaceAlt,
//     borderRadius: isWeb ? 8 : radius._15,
//     padding: isWeb ? 10 : 12,
//     marginTop: spaceMt,
//   },
//   detailItem: { width: "48%", marginBottom: 10 },
//   detailLabel: { fontSize: font.micro, color: colors.textFaint, fontWeight: font.semibold, textTransform: "uppercase" },
//   detailValue: { fontSize: font.sub, color: colors.textBody, fontWeight: font.bold, marginTop: 2 },

//   cardActions: { flexDirection: "row", alignItems: "center", gap: isWeb ? 8 : 10, marginTop: spaceMt + 4 },
//   detailsBtn: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 5,
//     paddingHorizontal: 14,
//     height: btnHeight,
//     borderRadius: btnRadius,
//     borderWidth: 1,
//     borderColor: colors.border,
//     backgroundColor: colors.surfaceAlt,
//   },
//   detailsBtnText: { fontSize: font.sub, fontWeight: font.bold, color: colors.textBody },
//   inspectBtn: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "center",
//     gap: 8,
//     height: btnHeight,
//     borderRadius: btnRadius,
//   },
//   inspectText: { color: "#fff", fontSize: font.body, fontWeight: font.bold },

//   adminFiltersContainer: {
//     paddingHorizontal: 16,
//     paddingTop: 18,
//   },
//   filterTitle: {
//     fontSize: font.sub,
//     fontWeight: font.bold,
//     color: colors.ink,
//     marginBottom: 8,
//   },
//   filterInputsRow: {
//     flexDirection: "row",
//     gap: 6,
//   },
//   searchBarAdminCompact: {
//     flex: 1,
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 4,
//     backgroundColor: colors.surface,
//     borderWidth: 1,
//     borderColor: colors.border,
//     borderRadius: radius._12,
//     paddingHorizontal: 8,
//     height: 40,
//   },
//   searchInputCompact: {
//     flex: 1,
//     fontSize: font.micro,
//     color: colors.ink,
//     padding: 0
//   },

//   adminCard: {
//     backgroundColor: colors.surface,
//     borderRadius: btnRadius,
//     borderWidth: 1,
//     borderColor: colors.border,
//     padding: cardPadding,
//   },
//   adminCardHeader: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     marginBottom: 12,
//   },
//   adminCardCode: {
//     fontSize: font.body,
//     fontWeight: font.black,
//     color: colors.ink,
//   },
//   adminCardDesc: {
//     fontSize: font.micro,
//     color: colors.textMuted,
//     marginTop: 2,
//   },
//   adminBadge: {
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: radius.pill,
//     borderWidth: 1,
//   },
//   badgeDone: { backgroundColor: "#dcfce7", borderColor: "#4ade80" },
//   badgeDraft: { backgroundColor: "#fef9c3", borderColor: "#facc15" },
//   adminBadgeText: { fontSize: font.micro, fontWeight: font.bold },
//   badgeDoneText: { color: "#16a34a" },
//   badgeDraftText: { color: "#ca8a04" },

//   adminCardMid: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     backgroundColor: colors.surfaceAlt,
//     borderRadius: btnRadius,
//     padding: isWeb ? 8 : 10,
//     marginBottom: isWeb ? 8 : 12,
//   },
//   adminMicroCol: {
//     flex: 1,
//   },
//   adminMicroLabel: {
//     fontSize: font.micro,
//     color: colors.textFaint,
//     fontWeight: font.semibold,
//     textTransform: "uppercase",
//   },
//   adminMicroValue: {
//     fontSize: font.sub,
//     color: colors.textBody,
//     fontWeight: font.bold,
//     marginTop: 2,
//   },

//   adminApproveBtn: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "center",
//     gap: 6,
//     backgroundColor: colors.brand,
//     paddingVertical: isWeb ? 8 : 10,
//     borderRadius: btnRadius,
//   },
//   adminApproveBtnText: {
//     color: "#fff",
//     fontSize: font.sub,
//     fontWeight: font.bold,
//   },

//   modalOverlay: {
//     flex: 1,
//     backgroundColor: "rgba(0,0,0,0.5)",
//     justifyContent: "center",
//     alignItems: "center",
//     padding: 20,
//   },
//   modalContent: {
//     backgroundColor: colors.surface,
//     borderRadius: radius._20,
//     padding: 24,
//     width: "100%",
//     maxWidth: 400,
//     ...shadow.card,
//   },
//   modalHeader: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 10,
//     marginBottom: 12,
//   },
//   modalTitle: {
//     fontSize: font.title,
//     fontWeight: font.black,
//     color: colors.ink,
//   },
//   modalMessage: {
//     fontSize: font.body,
//     color: colors.textMuted,
//     lineHeight: 22,
//     marginBottom: 24,
//   },
//   modalActions: {
//     flexDirection: "row",
//     justifyContent: "flex-end",
//     gap: 12,
//   },
//   modalBtnCancel: {
//     paddingVertical: 10,
//     paddingHorizontal: 16,
//     borderRadius: radius._12,
//     backgroundColor: colors.surfaceAlt,
//   },
//   modalBtnCancelText: {
//     fontSize: font.body,
//     fontWeight: font.bold,
//     color: colors.textBody,
//   },
//   modalBtnApprove: {
//     paddingVertical: 10,
//     paddingHorizontal: 16,
//     borderRadius: radius._12,
//     backgroundColor: colors.brand,
//   },
//   modalBtnApproveText: {
//     fontSize: font.body,
//     fontWeight: font.bold,
//     color: "#fff",
//   },
// });

// const modalStyles = StyleSheet.create({
//   overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
//   modalContainer: { backgroundColor: colors.bg, borderTopLeftRadius: radius._24, borderTopRightRadius: radius._24, maxHeight: "90%", flex: 1 },
//   header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface, borderTopLeftRadius: radius._24, borderTopRightRadius: radius._24 },
//   title: { fontSize: font.h3, fontWeight: font.black, color: colors.ink },
//   subtitle: { fontSize: font.micro, color: colors.textMuted, marginTop: 2 },
//   closeBtn: { padding: 8, backgroundColor: colors.surfaceAlt, borderRadius: radius.pill },

//   loader: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingTop: 50 },
//   loaderText: { color: colors.textMuted, fontWeight: font.medium },
//   scrollContent: { padding: 16, paddingBottom: 20 },

//   sectionContainer: { marginBottom: 20 },
//   card: { backgroundColor: colors.surface, borderRadius: radius._20, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14 },
//   row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, gap: 12 },
//   borderBottom: { borderBottomWidth: 1, borderBottomColor: colors.border },

//   taskName: { fontSize: font.body, fontWeight: font.bold, color: colors.ink },
//   remarksText: { fontSize: font.micro, color: colors.textMuted, marginTop: 4 },
//   costText: { fontSize: font.body, fontWeight: font.black, color: colors.ink },

//   badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, borderWidth: 1 },
//   badgeText: { fontSize: font.micro, fontWeight: font.bold },
//   badgeSuccess: { backgroundColor: "#dcfce7", borderColor: "#4ade80" },
//   badgeSuccessText: { color: "#16a34a" },
//   badgeDanger: { backgroundColor: "#fee2e2", borderColor: "#f87171" },
//   badgeDangerText: { color: "#dc2626" },
//   badgeWarning: { backgroundColor: "#fef9c3", borderColor: "#facc15" },
//   badgeWarningText: { color: "#ca8a04" },
//   badgeNeutral: { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
//   badgeNeutralText: { color: colors.textMuted },

//   summaryCard: { backgroundColor: colors.surface, borderRadius: radius._15, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 10, gap: 10 },
//   summaryItem: { flexDirection: "column", gap: 2 },
//   summaryLabel: { fontSize: font.micro, color: colors.textFaint, fontWeight: font.bold, textTransform: "uppercase" },
//   summaryValue: { fontSize: font.sub, color: colors.ink, fontWeight: font.semibold },

//   footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
//   footerCloseBtn: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, paddingVertical: 14, borderRadius: radius._15, alignItems: "center" },
//   footerCloseBtnText: { fontSize: font.body, fontWeight: font.bold, color: colors.ink },
// });

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContainer: { backgroundColor: colors.bg, borderTopLeftRadius: radius._24, borderTopRightRadius: radius._24, maxHeight: "90%", flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface, borderTopLeftRadius: radius._24, borderTopRightRadius: radius._24 },
  title: { fontSize: font.h3, fontWeight: font.black, color: colors.ink },
  subtitle: { fontSize: font.micro, color: colors.textMuted, marginTop: 2 },
  closeBtn: { padding: 8, backgroundColor: colors.surfaceAlt, borderRadius: radius.pill },

  loader: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingTop: 50 },
  loaderText: { color: colors.textMuted, fontWeight: font.medium },
  scrollContent: { padding: 16, paddingBottom: 20 },

  sectionContainer: { marginBottom: 20 },
  card: { backgroundColor: colors.surface, borderRadius: radius._20, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, gap: 12 },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: colors.border },

  taskName: { fontSize: font.body, fontWeight: font.bold, color: colors.ink },
  remarksText: { fontSize: font.micro, color: colors.textMuted, marginTop: 4 },
  costText: { fontSize: font.body, fontWeight: font.black, color: colors.ink },

  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, borderWidth: 1 },
  badgeText: { fontSize: font.micro, fontWeight: font.bold },
  badgeSuccess: { backgroundColor: "#dcfce7", borderColor: "#4ade80" },
  badgeSuccessText: { color: "#16a34a" },
  badgeDanger: { backgroundColor: "#fee2e2", borderColor: "#f87171" },
  badgeDangerText: { color: "#dc2626" },
  badgeWarning: { backgroundColor: "#fef9c3", borderColor: "#facc15" },
  badgeWarningText: { color: "#ca8a04" },
  badgeNeutral: { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
  badgeNeutralText: { color: colors.textMuted },

  summaryCard: { backgroundColor: colors.surface, borderRadius: radius._15, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 10, gap: 10 },
  summaryItem: { flexDirection: "column", gap: 2 },
  summaryLabel: { fontSize: font.micro, color: colors.textFaint, fontWeight: font.bold, textTransform: "uppercase" },
  summaryValue: { fontSize: font.sub, color: colors.ink, fontWeight: font.semibold },

  footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  footerCloseBtn: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, paddingVertical: 14, borderRadius: radius._15, alignItems: "center" },
  footerCloseBtnText: { fontSize: font.body, fontWeight: font.bold, color: colors.ink },
});