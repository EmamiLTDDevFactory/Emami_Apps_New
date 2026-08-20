import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Icons from "phosphor-react-native";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl, StyleSheet, Text, View,TouchableOpacity } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import EmptyState from "@/components/ui/EmptyState";
import ProgressRing from "@/components/ui/ProgressRing";
import SectionTitle from "@/components/ui/SectionTitle";
import StatTile from "@/components/ui/StatTile";
import StatusPill from "@/components/ui/StatusPill";
import ReportDetailsModal from "@/components/ui/ReportDetailsModal";
import { DonutChart, LineAreaChart } from "@/components/ui/charts";
import { colors, font, radius, shadow } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/config";
import { useBreakpoint, useResponsiveValue, SIDEBAR_WIDTH } from "@/utils/responsive";

// --- Types ---
type SubmissionType = {
  id: string;
  materialCode: string;
  materialDescription: string;
  vendorCode?: string; // Added for Admin view
  submissionDate: string;
  approvedDate: string;
  status: "Approved" | "Submitted" | "In Progress" | "L2 Approval In Progress" | "L1 approved and L2 Approval In Progress";
  Criticality?: string; // Added for Criticality KPI
  inspectionId?: string; // Added for UI card
  /** Chart-only: epoch ms parsed from ZsubDate, for the trend line below. Not used for display/logic. */
  _ts?: number;
};


type SubmissionTypeAdmin = {
  id: string;
  materialCode: string;
  materialDescription: string;
  vendorCode?: string; // Added for Admin view
  submissionDate: string;
  approvedDate: string;
  status: "Submitted" | "In Progress";
  Revstat: string;
  ReviewedOn: string;
  ReviewedBy: string;
  ApprovedBy: string;
  ApprovedOn: string;
  AprvStat: string;
};
// --- Helpers ---
const parseSAPDate = (sapDate?: string) => {
  if (!sapDate || !sapDate.startsWith("/Date(")) return "-";
  const match = sapDate.match(/\d+/);
  if (!match) return "-";
  const date = new Date(parseInt(match[0], 10));
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

/** Chart-only: epoch ms out of a SAP `/Date(ms)/` string. Used solely to order the trend chart below. */
const sapDateToTimestamp = (sapDate?: string): number | undefined => {
  if (!sapDate || !sapDate.startsWith("/Date(")) return undefined;
  const match = sapDate.match(/\d+/);
  return match ? parseInt(match[0], 10) : undefined;
};

/** Cumulative submissions-over-time series for the trend chart — purely a chart input, not stored state. */
function buildTrendSeries(submissions: SubmissionType[]) {
  const sorted = submissions
    .filter((s) => typeof s._ts === "number")
    .sort((a, b) => (a._ts as number) - (b._ts as number));
  return sorted.map((s, i) => ({ x: s._ts as number, y: i + 1 }));
}

// --- Shared Sub-Components ---
const RingStat = ({ color, label, value }: { color: string; label: string; value: number }) => (
  <View style={styles.ringStatRow}>
    <View style={[styles.ringDot, { backgroundColor: color }]} />
    <Text style={styles.ringStatLabel}>{label}</Text>
    <Text style={styles.ringStatValue}>{value}</Text>
  </View>
);

const DateBox = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <View style={styles.dateBox}>
    {icon}
    <View style={{ flex: 1 }}>
      <Text style={styles.dateLabel}>{label}</Text>
      <Text style={styles.dateValue} numberOfLines={1}>{value}</Text>
    </View>
  </View>
);


// ============================================================================
// 1. VENDOR STATISTICS
// ============================================================================
function VendorStatistics() {
  const { user, logout: handleLogout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, isTabletUp } = useBreakpoint();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submissions, setSubmissions] = useState<SubmissionType[]>([]);
  const [selectedReport, setSelectedReport] = useState<any>(null);

  // Responsive calculation
  const tileContainerPadding = 16;
  const tileGap = 12;
  const columns = useResponsiveValue({ phone: 1, tablet: 2, laptop: 3 });
  const dynamicTileWidth = isTabletUp
    ? (width - (tileContainerPadding * 2) - (tileGap * (columns - 1))) / columns
    : '100%';

  const total = submissions.length;
  const submitted = submissions.filter((s) => s.status === "Submitted").length;
  const inProgress = submissions.filter((s) => s.status === "In Progress").length;
  const rate = total ? Math.round((submitted / total) * 100) : 0;
  const trendData = useMemo(() => buildTrendSeries(submissions), [submissions]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [user?.vendorCode])
  );

  const load = async () => {
    try {
      if (!refreshing) setLoading(true);
      const vendorId = user?.vendorCode || user?.Vendor;

      if (!vendorId) {
        setSubmissions([]);
        return;
      }

      const { data } = await api.get("/ZMM_MOULD_CARE_SRV/ZmouldDataReportSet", {
        params: {
          "$filter": `Lifnr eq '${vendorId}'`,
          "$format": "json"
        }
      });
      const results = data?.d?.results || [];

      if (results.length > 0) {
        const groupedMap: Record<string, SubmissionType> = {};

        results.forEach((item: any) => {
          const uniqueKey = `${item.Matnr}_${item.ZsubDate}`;
          if (!groupedMap[uniqueKey]) {
            groupedMap[uniqueKey] = {
              id: item.Matnr,
              materialCode: item.Matnr,
              materialDescription: item.Maktx || `Material ${item.Matnr}`,
              submissionDate: item.CompletedFlag === "X" ? parseSAPDate(item.ZsubDate) : "-",
              approvedDate: item.ApprovedFlag === "X" ? parseSAPDate(item.ZsubDate) : "-",
              status: item.CompletedFlag === "X" ? "Submitted" : "In Progress",
              _ts: sapDateToTimestamp(item.ZsubDate),
            };
          }
        });
        console.log("Grouped Submissions:", groupedMap);
        setSubmissions(Object.values(groupedMap));
      } else {
        setSubmissions([]);
      }
    } catch (error) {
      console.error("Failed to load vendor statistics", error);
      setSubmissions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  return (
    <Animated.ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand} colors={[colors.brand]} />
      }
    >
      {/* VENDOR HERO */}
      <View style={[styles.hero, { paddingTop: insets.top + 16 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginBottom: 12 }}>
          <View>
            <Text style={styles.heroKicker}>VENDOR INSIGHTS</Text>
            <Text style={styles.heroTitle}>Your submission overview</Text>
          </View>
          <TouchableOpacity onPress={() => { handleLogout(); router.replace("/apps/mouldhealthcheck/(auth)/login"); }} style={{ backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, padding: 10, borderRadius: 14 }}>
            <Icons.SignOut size={24} color={colors.textBody} weight="bold" />
          </TouchableOpacity>
        </View>

        <View style={styles.ringCard}>
          <ProgressRing progress={rate} size={104} strokeWidth={11} sublabel="submitted" />
          <View style={{ flex: 1, marginLeft: 18, gap: 10 }}>
            <RingStat color={colors.success} label="Submitted" value={submitted} />
            <RingStat color={colors.warning} label="In Progress" value={inProgress} />
            <RingStat color={colors.info} label="Total Assigned" value={total} />
          </View>
        </View>
      </View>

      {/* VENDOR KPI */}
      <View style={styles.kpiContainer}>
        <View style={styles.kpiTileWrapper}>
          <StatTile value={total} label="Total" subtitle="Moulds assigned" icon={<Icons.ListChecks size={20} color={colors.info} weight="duotone" />} tint={colors.info} tintBg={colors.infoSoft} />
        </View>
        <View style={styles.kpiTileWrapper}>
          <StatTile value={submitted} label="Submitted" subtitle="Completed inspections" icon={<Icons.SealCheck size={20} color={colors.success} weight="duotone" />} tint={colors.success} tintBg={colors.successSoft} />
        </View>
        <View style={styles.kpiTileWrapper}>
          <StatTile value={inProgress} label="In Progress" subtitle="Awaiting completion" icon={<Icons.ClockCountdown size={20} color={colors.warning} weight="duotone" />} tint={colors.warning} tintBg={colors.warningSoft} />
        </View>
      </View>

      {/* VENDOR TREND */}
      {trendData.length >= 2 && (
        <View style={{ marginTop: 8, paddingHorizontal: 20 }}>
          <SectionTitle title="Submission Trend" subtitle="Cumulative submissions over time" />
          <View style={[styles.trendCard, shadow.card]}>
            <LineAreaChart data={trendData} width={width - 72} height={140} color={colors.brand} />
          </View>
        </View>
      )}

      {/* VENDOR HISTORY */}
      <View style={{ marginTop: 24 }}>
        <SectionTitle title="Submission history" subtitle="Latest inspection activity" />

        {submissions.length === 0 ? (
          <EmptyState title="No submissions yet" message="Your inspection submissions will appear here." />
        ) : (
          <View style={styles.tileGrid}>
            {submissions.map((item, i) => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.9}
                style={{ width: dynamicTileWidth }}
                onPress={() => setSelectedReport({ Matnr: item.materialCode, Lifnr: user?.vendorCode || user?.Vendor, Maktx: item.materialDescription })}
              >
                <Animated.View
                  entering={FadeInDown.delay(i * 50).duration(400)}
                  style={[styles.histTile, shadow.card, { width: "100%" }]}
                >
                  <View style={styles.histTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.histCode}>{item.materialCode}</Text>
                      <Text style={styles.histDesc}>{item.materialDescription}</Text>
                    </View>
                    <StatusPill kind={item.status === "Submitted" ? "Submitted" : "inprogress"} />
                  </View>

                  <View style={styles.tileDivider} />

                  <View style={styles.histDates}>
                    <DateBox icon={<Icons.CalendarBlank size={16} color={colors.info} weight="fill" />} label="Submitted" value={item.submissionDate} />
                  </View>
                </Animated.View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
      <ReportDetailsModal 
        visible={!!selectedReport} 
        report={selectedReport} 
        onClose={async () => {
          setSelectedReport(null);
          setRefreshing(true);
          await new Promise((resolve) => setTimeout(resolve, 800));
          await load();
        }} 
      />
    </Animated.ScrollView>
  );
}


// ============================================================================
// 2. ADMIN STATISTICS
// ============================================================================
function AdminStatistics() {
  const { user, logout: handleLogout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, isTabletUp } = useBreakpoint();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submissions, setSubmissions] = useState<SubmissionType[]>([]);
  const [selectedReport, setSelectedReport] = useState<any>(null);

  // Responsive calculation
  const tileContainerPadding = 16;
  const tileGap = 12;
  const columns = useResponsiveValue({ phone: 1, tablet: 2, laptop: 3 });
  const dynamicTileWidth = isTabletUp
    ? (width - (tileContainerPadding * 2) - (tileGap * (columns - 1))) / columns
    : '100%';

  const total = submissions.length;
  const approved = submissions.filter((s) => s.status === "Approved").length;
  const pending = submissions.filter((s) => s.status === "L1 approved and L2 Approval In Progress").length;
  const rate = total ? Math.round((approved / total) * 100) : 0;

  const trendData = useMemo(() => buildTrendSeries(submissions), [submissions]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [user?.Email, user?.email])
  );

  const load = async () => {
    try {
      if (!refreshing) setLoading(true);
      const validEmail = user?.Email || user?.email;

      // Fetch all reports using the direct SAP OData service path
      const { data } = await api.get("/ZMM_MOULD_CARE_SRV/ZMouldLogSet", {
        params: {
          "$filter": `ReviewedBy eq '${validEmail}' and ApprovedBy eq '${validEmail}'`,
          "$format": "json"
        }
      });
      const results = data?.mouldreport || data?.d?.results || [];

      if (results.length > 0) {
        const mappedSubmissions: SubmissionType[] = results.map((item: any) => {
          const approvedOnRaw = item.APPROVED_ON || item.ApprovedOn;
          const isApprovedDateBlank = !approvedOnRaw || approvedOnRaw === "00000000" || approvedOnRaw.trim() === "";
          const isReallyApproved = ((item.APRV_FLAG || item.AprvStat) === "X") && !isApprovedDateBlank;

          return {
            id: `${item.MATNR || item.Matnr}_${item.LIFNR || item.Lifnr}_${Math.random()}`, // Ensure unique key
            materialCode: item.MATNR || item.Matnr,
            vendorCode: item.LIFNR || item.Lifnr,
            materialDescription: item.MAKTX || item.Maktx || `Material ${item.MATNR || item.Matnr}`,
            submissionDate: parseSAPDate(item.SUBDATE || item.ZsubDate),
            approvedDate: isReallyApproved ? parseSAPDate(approvedOnRaw) : parseSAPDate(item.REVIEWED_ON || item.ReviewedOn) || "-",
            status: isReallyApproved ? "Approved" : "L1 approved and L2 Approval In Progress",
            Criticality: item.Criticality || "Ok",
            inspectionId: item.ZINSPID || item.Zinspid || item.ZinspId,
            _ts: sapDateToTimestamp(item.SUBDATE || item.ZsubDate),
          };
        });

        setSubmissions(mappedSubmissions);
      } else {
        setSubmissions([]);
      }
    } catch (error) {
      console.error("Failed to load admin statistics", error);
      setSubmissions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  return (
    <Animated.ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand} colors={[colors.brand]} />
      }
    >
      {/* ADMIN HERO */}
      <View style={[styles.hero, { paddingTop: insets.top + 16 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginBottom: 12 }}>
          <View>
            <Text style={styles.heroKicker}>GLOBAL INSIGHTS</Text>
            <Text style={styles.heroTitle}>Overall Network Status</Text>
          </View>
          <TouchableOpacity onPress={() => { handleLogout(); router.replace("/apps/mouldhealthcheck/(auth)/login"); }} style={{ backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, padding: 10, borderRadius: 14 }}>
            <Icons.SignOut size={24} color={colors.textBody} weight="bold" />
          </TouchableOpacity>
        </View>

        <View style={styles.ringCard}>
          <ProgressRing progress={rate} size={104} strokeWidth={11} sublabel="approved" />
          <View style={{ flex: 1, marginLeft: 18, gap: 10 }}>
            <RingStat color={colors.success} label="Approved" value={approved} />
            <RingStat color={colors.warning} label="Pending Review" value={pending} />
            <RingStat color={colors.info} label="Total Reports" value={total} />
          </View>
        </View>
      </View>

      {/* ADMIN KPI */}
      <View style={styles.kpiContainer}>
        <View style={styles.kpiTileWrapper}>
          <StatTile value={total} label="Total" subtitle="Network reports" icon={<Icons.Globe size={20} color={colors.info} weight="duotone" />} tint={colors.info} tintBg={colors.infoSoft} />
        </View>
        <View style={styles.kpiTileWrapper}>
          <StatTile value={approved} label="Approved" subtitle="Fully signed off" icon={<Icons.CheckCircle size={20} color={colors.success} weight="duotone" />} tint={colors.success} tintBg={colors.successSoft} />
        </View>
        <View style={styles.kpiTileWrapper}>
          <StatTile value={pending} label="Pending" subtitle="Awaiting L2 review" icon={<Icons.Hourglass size={20} color={colors.warning} weight="duotone" />} tint={colors.warning} tintBg={colors.warningSoft} />
        </View>
      </View>

      {/* ADMIN TREND */}
      {trendData.length >= 2 && (
        <View style={{ marginTop: 24, paddingHorizontal: 20 }}>
          <SectionTitle title="Submission Trend" subtitle="Cumulative submissions over time" />
          <View style={[styles.trendCard, shadow.card]}>
            <LineAreaChart data={trendData} width={width - 72} height={140} color={colors.info} />
          </View>
        </View>
      )}

      {/* ADMIN ACTIVITY LIST */}
      <View style={{ marginTop: 24 }}>
        <SectionTitle title="Global Activity" subtitle="Latest network submissions" />

        {submissions.length === 0 ? (
          <EmptyState title="No activity" message="No vendor submissions found across the network." />
        ) : (
          <View style={styles.tileGrid}>
            {submissions.map((item, i) => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.9}
                style={{ width: dynamicTileWidth }}
                onPress={() => setSelectedReport({ Matnr: item.materialCode, Lifnr: item.vendorCode, Maktx: item.materialDescription, Criticality: item.Criticality })}
              >
                <Animated.View
                  entering={FadeInDown.delay(i * 40).duration(400)}
                  style={[styles.histTile, shadow.card, { width: "100%" }]}
                >
                  <View style={styles.histTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.histCode}>{item.materialDescription}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <Text style={styles.histDesc} numberOfLines={1}>Code: {item.materialCode}</Text>
                        {item.inspectionId ? (
                          <View style={{ backgroundColor: '#10b981', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: '#fff' }}>Insp ID: {item.inspectionId}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                    <StatusPill kind={item.status === "Approved" ? "Approved" : item.status === "L1 approved and L2 Approval In Progress" ? "L1 approved and L2 Approval In Progress" : "inprogress"} />
                  </View>

                  <View style={styles.tileDivider} />

                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 6 }}>
                    <Icons.Buildings size={16} color={colors.textFaint} weight="fill" />
                    <Text style={{ fontSize: font.micro, color: colors.textMuted, fontWeight: font.bold }}>VENDOR: {item.vendorCode}</Text>
                  </View>

                  <View style={styles.histDates}>
                    <DateBox icon={<Icons.PaperPlaneRight size={16} color={colors.warning} weight="fill" />} label="Vendor Submission Date" value={item.submissionDate} />
                    <DateBox icon={<Icons.SealCheck size={16} color={colors.success} weight="fill" />} label="Approved" value={item.status === "Approved" ? item.approvedDate : "-"} />
                  </View>
                </Animated.View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
      <ReportDetailsModal 
        visible={!!selectedReport} 
        report={selectedReport} 
        onClose={async () => {
          setSelectedReport(null);
          setRefreshing(true);
          await new Promise((resolve) => setTimeout(resolve, 800));
          await load();
        }} 
      />
    </Animated.ScrollView>
  );
}


// ============================================================================
// 3. MAIN EXPORT (ROUTER)
// ============================================================================
export default function StatisticsScreen() {
  const { user } = useAuth();
  const { isTabletUp } = useBreakpoint();
  const isAdmin = user?.Role === "Admin" || user?.Role === "admin" || user?.Role === "admin";

  return (
    <View style={[styles.root, isTabletUp && { paddingLeft: SIDEBAR_WIDTH }]}>
      <StatusBar style="dark" />
      {isAdmin ? <AdminStatistics /> : <VendorStatistics />}
    </View>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  loader: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },

  hero: { paddingHorizontal: 20, paddingBottom: 22, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  heroKicker: { color: colors.textMuted, fontSize: font.micro, fontWeight: font.bold, letterSpacing: 1 },
  heroTitle: { color: colors.ink, fontSize: 22, fontWeight: font.black, marginTop: 4, letterSpacing: -0.4 },

  ringCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.brandSoft,
    borderRadius: radius._24,
    padding: 18,
    marginTop: 18,
  },
  ringStatRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  ringDot: { width: 9, height: 9, borderRadius: 5 },
  ringStatLabel: { flex: 1, fontSize: font.sub, color: colors.textMuted, fontWeight: font.semibold },
  ringStatValue: { fontSize: font.body, color: colors.ink, fontWeight: font.black },

  kpiContainer: { flexDirection: "row", flexWrap: "wrap", gap: 12, paddingHorizontal: 16, marginTop: 18 },
  kpiTileWrapper: { flex: 1, minWidth: 100 },

  trendCard: {
    backgroundColor: colors.surface,
    borderRadius: radius._20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    alignItems: "center",
  },

  tileGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 12,
  },

  histTile: {
    backgroundColor: colors.surface,
    borderRadius: radius._24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    flexGrow: 1,
  },
  histTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  histCode: { fontSize: font.title, fontWeight: font.black, color: colors.ink },
  histDesc: { fontSize: font.sub, color: colors.textMuted, marginTop: 4 },

  tileDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 14,
  },

  histDates: { flexDirection: "row", gap: 10 },
  dateBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius._15,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  dateLabel: { fontSize: font.micro, color: colors.textFaint, fontWeight: font.semibold },
  dateValue: { fontSize: font.sub, color: colors.ink, fontWeight: font.bold, marginTop: 2 },
});