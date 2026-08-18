import EmptyState from "@/components/ui/EmptyState";
import GlassSurface from "@/components/ui/GlassSurface";
import SectionTitle from "@/components/ui/SectionTitle";
import { colors, font, radius, shadow } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/config";
import * as Icons from "phosphor-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export const SECTION_TITLES: Record<string, string> = {
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

export default function ReportDetailsModal({ visible, report, onClose }: { visible: boolean; report: any; onClose: () => void }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  // State for Action Modal
  const [actionTarget, setActionTarget] = useState<{ sectionKey: string; idx: number; item: any } | null>(null);
  const [actionRemark, setActionRemark] = useState("");

  useEffect(() => {
    if (visible && report) {
      fetchReportData();
    } else {
      setData(null);
    }
  }, [visible, report]);

  const fetchReportData = async () => {
    if (!report) return;
    try {
      setLoading(true);
      const res = await api.get("/ZMM_MOULD_CARE_SRV/ZMouldGetDataSet", {
        params: {
          $filter: `Matnr eq '${report.Matnr}' and Lifnr eq '${report.Lifnr}' and Zaction eq 'X'`,
          $format: "json",
        },
      });

      const rawResults = res.data?.d?.results || [];
      const grouped: any = { checklists: {}, PM: [], SP: [], IS: [] };

      rawResults.forEach((item: any) => {
        const colId = item.ZmouldColId;
        const record = {
          sectionKey: colId,
          name: item.ZmouldColName?.trim(),
          val1: item.ZmouldColVal1?.trim(),
          val2: item.ZmouldColVal2?.trim(),
          val3: item.ZmouldColVal3?.trim(),
        };

        if (colId === "PM") grouped.PM.push(record);
        else if (colId === "SP") grouped.SP.push(record);
        else if (colId === "IS") grouped.IS.push(record);
        else if (SECTION_TITLES[colId]) {
          if (!grouped.checklists[colId]) grouped.checklists[colId] = [];
          grouped.checklists[colId].push(record);
        }
      });

      setData(grouped);
    } catch (error) {
      console.error("Failed to load report details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleIgnore = (sectionKey: string, idx: number) => {
    setData((prevData: any) => {
      if (!prevData) return prevData;
      const newData = { ...prevData };
      if (newData.checklists && newData.checklists[sectionKey]) {
        newData.checklists[sectionKey] = [...newData.checklists[sectionKey]];
        newData.checklists[sectionKey][idx] = {
          ...newData.checklists[sectionKey][idx],
          val1: "Yes" // Turns red check (val1 == "No") into green ("Yes" / Condition OK)
        };
      }
      return newData;
    });
  };

  const handleOpenActionModal = (sectionKey: string, idx: number, item: any) => {
    setActionTarget({ sectionKey, idx, item });
    setActionRemark(item.val2 ? `Action: ` : "Action initiated by Admin");
  };

  const confirmAction = () => {
    if (!actionTarget) return;
    const { sectionKey, idx } = actionTarget;

    setData((prevData: any) => {
      if (!prevData) return prevData;
      const newData = { ...prevData };
      if (newData.checklists && newData.checklists[sectionKey]) {
        newData.checklists[sectionKey] = [...newData.checklists[sectionKey]];
        const currentItem = newData.checklists[sectionKey][idx];
        newData.checklists[sectionKey][idx] = {
          ...currentItem,
          val1: "Action Initiated",
          val2: actionRemark ? `${currentItem.val2 ? currentItem.val2 + " | " : ""}${actionRemark}` : currentItem.val2
        };
      }
      return newData;
    });

    setActionTarget(null);
    setActionRemark("");
  };

  const handleSaveChanges = async () => {
    if (!data) return;
    try {
      setLoading(true);
      const sapDate = "/Date(" + Date.now() + ")/";

      const flatItems: any[] = [];

      Object.keys(data.checklists).forEach(key => {
        data.checklists[key].forEach((item: any) => {
          flatItems.push({
            Lifnr: report.Lifnr,
            Name1: "",
            ZsubDate: sapDate,
            ZmouldCat: "02",
            ZmouldCatIdH: "IM",
            ZmouldHeadIdH: "H",
            ZmouldColHead: "02",
            ZmouldColId: item.sectionKey || key,
            ZmouldColName: (item.name || " ").substring(0, 100),
            ZmouldColVal1: (item.val1 || " ").substring(0, 100),
            ZmouldColVal2: (item.val2 || " ").substring(0, 100),
            ZmouldColVal3: (item.val3 || " ").substring(0, 100),
          });
        });
      });

      ["PM", "SP", "IS"].forEach(key => {
        if (data[key]) {
          data[key].forEach((item: any) => {
            flatItems.push({
              Lifnr: report.Lifnr,
              Name1: "",
              ZsubDate: sapDate,
              ZmouldCat: "02",
              ZmouldCatIdH: "IM",
              ZmouldHeadIdH: "H",
              ZmouldColHead: "02",
              ZmouldColId: item.sectionKey || key,
              ZmouldColName: (item.name || " ").substring(0, 100),
              ZmouldColVal1: (item.val1 || " ").substring(0, 100),
              ZmouldColVal2: (item.val2 || " ").substring(0, 100),
              ZmouldColVal3: (item.val3 || " ").substring(0, 100),
            });
          });
        }
      });

      const payload = {
        Lifnr: report.Lifnr,
        Name1: "",
        ZsubDate: sapDate,
        CreatedBy: user?.Email || "",
        CreatedOn: sapDate,
        ChangedBy: user?.Email || "",
        ChangedOn: sapDate,
        DraftFlag: " ",
        CompletedFlag: "X",
        Zcriticality: report.Criticality || "Ok",
        Matnr: report.Matnr,
        ZmouldItemSet: flatItems,
      };

      const res = await api.post("/ZMM_MOULD_CARE_SRV/ZMouldDataHeaderSet", payload, { headers: { Prefer: "return=representation" } });
      if (res.status === 200 || res.status === 201) {
        if (Platform.OS === "web") {
          alert("Admin changes have been saved.");
        } else {
          Alert.alert("Success", "Admin changes have been saved.");
        }
        onClose();
      } else {
        if (Platform.OS === "web") {
          alert("Failed to save changes.");
        } else {
          Alert.alert("Error", "Failed to save changes.");
        }
      }
    } catch (error) {
      console.error("Failed to save changes:", error);
      if (Platform.OS === "web") {
        alert("Could not reach the server to save changes.");
      } else {
        Alert.alert("Error", "Could not reach the server to save changes.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Compute dynamic summary counts
  let okCount = 0;
  let issueCount = 0;
  let actionCount = 0;
  if (data && data.checklists) {
    Object.keys(data.checklists).forEach(key => {
      data.checklists[key].forEach((item: any) => {
        if (item.val1 === "Yes" || item.val1 === "Condition OK") okCount++;
        else if (item.val1 === "No" || item.val1 === "Issue Detected") issueCount++;
        else if (item.val1 === "Action Initiated" || item.val1 === "Action Taken") actionCount++;
        else okCount++;
      });
    });
  }

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.modalContainer}>

          <View style={modalStyles.header}>
            <View style={{ flex: 1, marginRight: 15 }}>
              <Text style={modalStyles.title} numberOfLines={1}>{report?.Matnr}</Text>
              <Text style={modalStyles.subtitle} numberOfLines={1}>{report?.Maktx}</Text>

              {report?.Criticality && (
                <View style={[
                  modalStyles.badge,
                  {
                    marginTop: 6, alignSelf: 'flex-start',
                    backgroundColor: report.Criticality === 'Critical' ? '#fee2e2' : report.Criticality === 'Major' ? '#fef9c3' : report.Criticality === 'Minor' ? '#dbeafe' : '#dcfce7',
                    borderColor: report.Criticality === 'Critical' ? '#f87171' : report.Criticality === 'Major' ? '#facc15' : report.Criticality === 'Minor' ? '#60a5fa' : '#4ade80'
                  }
                ]}>
                  <Text style={[
                    modalStyles.badgeText,
                    { color: report.Criticality === 'Critical' ? '#dc2626' : report.Criticality === 'Major' ? '#ca8a04' : report.Criticality === 'Minor' ? '#2563eb' : '#16a34a' }
                  ]}>Criticality: {report.Criticality}</Text>
                </View>
              )}

              {data && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  <View style={[modalStyles.badge, modalStyles.badgeSuccess]}>
                    <Text style={[modalStyles.badgeText, modalStyles.badgeSuccessText]}>{okCount} Condition OK</Text>
                  </View>
                  <View style={[modalStyles.badge, issueCount > 0 ? modalStyles.badgeDanger : modalStyles.badgeNeutral]}>
                    <Text style={[modalStyles.badgeText, issueCount > 0 ? modalStyles.badgeDangerText : modalStyles.badgeNeutralText]}>{issueCount} Issue Detected</Text>
                  </View>
                  {actionCount > 0 && (
                    <View style={[modalStyles.badge, modalStyles.badgeInfo]}>
                      <Text style={[modalStyles.badgeText, modalStyles.badgeInfoText]}>{actionCount} Action Initiated</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
              <Icons.X size={20} color={colors.textMuted} weight="bold" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={modalStyles.loader}>
              <ActivityIndicator size="large" color={colors.brand} />
              <Text style={modalStyles.loaderText}>Loading report data...</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={modalStyles.scrollContent}>

              {data && Object.keys(data.checklists).map((key) => (
                <View key={key} style={modalStyles.sectionContainer}>
                  <SectionTitle title={SECTION_TITLES[key]} subtitle={`${data.checklists[key].length} checks`} />
                  <View style={[modalStyles.card, shadow.soft]}>
                    {data.checklists[key].map((item: any, idx: number) => {
                      const isOk = item.val1 === "Yes" || item.val1 === "Condition OK";
                      const isIssue = item.val1 === "No" || item.val1 === "Issue Detected";
                      const isAction = item.val1 === "Action Initiated" || item.val1 === "Action Taken";

                      return (
                        <View key={idx} style={[modalStyles.row, idx !== data.checklists[key].length - 1 && modalStyles.borderBottom]}>
                          <View style={{ flex: 1 }}>
                            <Text style={modalStyles.taskName}>{item.name}</Text>
                            {!!item.val2 && <Text style={modalStyles.remarksText}>Remarks: {item.val2}</Text>}
                          </View>

                          <View style={{ alignItems: 'flex-end', gap: 6 }}>
                            <View style={[
                              modalStyles.badge,
                              isOk ? modalStyles.badgeSuccess : (isAction ? modalStyles.badgeInfo : modalStyles.badgeDanger)
                            ]}>
                              <Text style={[
                                modalStyles.badgeText,
                                isOk ? modalStyles.badgeSuccessText : (isAction ? modalStyles.badgeInfoText : modalStyles.badgeDangerText)
                              ]}>
                                {isOk ? "Condition OK" : (isIssue ? "Issue Detected" : (item.val1 || "N/A"))}
                              </Text>
                            </View>

                            {/* Two action options for each checklist line - ADMIN ONLY */}
                            {user?.Role === 'Admin' && (
                              <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                                <TouchableOpacity
                                  style={[
                                    modalStyles.actionBtn,
                                    isOk ? modalStyles.actionBtnActiveIgnore : { backgroundColor: colors.surfaceAlt }
                                  ]}
                                  onPress={() => handleIgnore(key, idx)}
                                  activeOpacity={0.7}
                                >
                                  <Icons.CheckCircle size={13} color={isOk ? "#16a34a" : colors.textMuted} weight="bold" />
                                  <Text style={[modalStyles.actionBtnText, { color: isOk ? "#16a34a" : colors.ink }]}>Ignore</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  style={[
                                    modalStyles.actionBtn,
                                    isAction ? modalStyles.actionBtnActiveAction : { backgroundColor: colors.brand, borderColor: colors.brand }
                                  ]}
                                  onPress={() => handleOpenActionModal(key, idx, item)}
                                  activeOpacity={0.7}
                                >
                                  <Icons.Wrench size={13} color="#fff" weight="bold" />
                                  <Text style={[modalStyles.actionBtnText, { color: '#fff' }]}>Take Action</Text>
                                </TouchableOpacity>
                              </View>
                            )}

                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))}

              {data?.PM && data.PM.length > 0 && (
                <View style={modalStyles.sectionContainer}>
                  <SectionTitle title="Preventive Maintenance" subtitle={`${data.PM.length} tasks`} />
                  <View style={[modalStyles.card, shadow.soft]}>
                    {data.PM.map((item: any, idx: number) => (
                      <View key={idx} style={[modalStyles.row, idx !== data.PM.length - 1 && modalStyles.borderBottom]}>
                        <View style={{ flex: 1 }}>
                          <Text style={modalStyles.taskName}>{item.name}</Text>
                          <Text style={modalStyles.remarksText}>Date: {item.val3 || "No date"}</Text>
                        </View>
                        <View style={[modalStyles.badge, item.val1 === "Yes" ? modalStyles.badgeWarning : modalStyles.badgeNeutral]}>
                          <Text style={[modalStyles.badgeText, item.val1 === "Yes" ? modalStyles.badgeWarningText : modalStyles.badgeNeutralText]}>
                            {item.val1 === "Yes" ? item.val2 || "Priority" : "Not Required"}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {data?.SP && data.SP.length > 0 && (
                <View style={modalStyles.sectionContainer}>
                  <SectionTitle title="Spare Parts" subtitle={`${data.SP.length} parts`} />
                  <View style={[modalStyles.card, shadow.soft]}>
                    {data.SP.map((item: any, idx: number) => (
                      <View key={idx} style={[modalStyles.row, idx !== data.SP.length - 1 && modalStyles.borderBottom]}>
                        <View style={{ flex: 1 }}>
                          <Text style={modalStyles.taskName}>{item.name}</Text>
                          <Text style={modalStyles.remarksText}>Qty/Spec: {item.val1}</Text>
                        </View>
                        <Text style={modalStyles.costText}>{item.val2 ? `₹ ${item.val2}` : "—"}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {data?.IS && data.IS.length > 0 && (
                <View style={modalStyles.sectionContainer}>
                  <SectionTitle title="Inspection Summary" subtitle="Matrix review" />
                  {data.IS.map((item: any, idx: number) => (
                    <View key={idx} style={[modalStyles.summaryCard, shadow.soft]}>
                      <View style={modalStyles.summaryItem}>
                        <Text style={modalStyles.summaryLabel}>Condition</Text>
                        <Text style={modalStyles.summaryValue}>{item.val1}</Text>
                      </View>
                      <View style={modalStyles.summaryItem}>
                        <Text style={modalStyles.summaryLabel}>Action Required</Text>
                        <Text style={modalStyles.summaryValue}>{item.val2}</Text>
                      </View>
                      {!!item.val3 && (
                        <View style={modalStyles.summaryItem}>
                          <Text style={modalStyles.summaryLabel}>Remarks</Text>
                          <Text style={modalStyles.summaryValue}>{item.val3}</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {(!data || (Object.keys(data.checklists).length === 0 && data.PM.length === 0 && data.SP.length === 0 && data.IS.length === 0)) && (
                <EmptyState title="No details found" message="There is no inspection data available for this report." />
              )}
            </ScrollView>
          )}

          <View style={modalStyles.footer}>
            <TouchableOpacity style={modalStyles.footerCloseBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={modalStyles.footerCloseBtnText}>Close</Text>
            </TouchableOpacity>
            {user?.Role === 'Admin' && (
              <TouchableOpacity style={modalStyles.footerSaveBtn} onPress={handleSaveChanges} activeOpacity={0.8}>
                <Text style={modalStyles.footerSaveBtnText}>Save Changes</Text>
              </TouchableOpacity>
            )}
          </View>

        </View>
      </View>

      {/* TAKE ACTION INPUT MODAL */}
      <Modal visible={!!actionTarget} transparent animationType="fade" onRequestClose={() => setActionTarget(null)}>
        <View style={modalStyles.overlay}>
          <GlassSurface intensity="modal" tint="light" borderRadius={radius._20} style={modalStyles.actionModalContainer as any}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ fontSize: font.h3, fontWeight: font.bold, color: colors.ink }}>Initiate Action</Text>
              <TouchableOpacity onPress={() => setActionTarget(null)}>
                <Icons.X size={20} color={colors.textMuted} weight="bold" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: font.sub, fontWeight: font.semibold, color: colors.textMuted, marginBottom: 8 }}>
              Checklist Line: {actionTarget?.item?.name}
            </Text>

            <Text style={{ fontSize: font.micro, fontWeight: font.bold, color: colors.ink, marginBottom: 6 }}>
              Action Remarks / Work Order Details:
            </Text>
            <TextInput
              style={modalStyles.actionTextInput}
              value={actionRemark}
              onChangeText={setActionRemark}
              placeholder="Enter action notes..."
              placeholderTextColor={colors.textFaint}
              multiline
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                style={[modalStyles.actionModalBtn, { backgroundColor: colors.surfaceAlt, flex: 1 }]}
                onPress={() => setActionTarget(null)}
              >
                <Text style={[modalStyles.actionModalBtnText, { color: colors.ink }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[modalStyles.actionModalBtn, { backgroundColor: colors.brand, flex: 1 }]}
                onPress={confirmAction}
              >
                <Text style={[modalStyles.actionModalBtnText, { color: '#fff' }]}>Confirm Action</Text>
              </TouchableOpacity>
            </View>
          </GlassSurface>
        </View>
      </Modal>
    </Modal>
  );
}

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
  badgeInfo: { backgroundColor: "#dbeafe", borderColor: "#60a5fa" },
  badgeInfoText: { color: "#2563eb" },
  badgeWarning: { backgroundColor: "#fef9c3", borderColor: "#facc15" },
  badgeWarningText: { color: "#ca8a04" },
  badgeNeutral: { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
  badgeNeutralText: { color: colors.textMuted },

  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  actionBtnActiveIgnore: { backgroundColor: "#f0fdf4", borderColor: "#86efac" },
  actionBtnActiveAction: { backgroundColor: colors.brand, borderColor: colors.brand },
  actionBtnText: { fontSize: font.micro, fontWeight: font.bold },

  summaryCard: { backgroundColor: colors.surface, borderRadius: radius._15, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 10, gap: 10 },
  summaryItem: { flexDirection: "column", gap: 2 },
  summaryLabel: { fontSize: font.micro, color: colors.textFaint, fontWeight: font.bold, textTransform: "uppercase" },
  summaryValue: { fontSize: font.sub, color: colors.ink, fontWeight: font.semibold },

  footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', gap: 12 },
  footerCloseBtn: { flex: 1, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, paddingVertical: 14, borderRadius: radius._15, alignItems: "center" },
  footerCloseBtnText: { fontSize: font.body, fontWeight: font.bold, color: colors.ink },
  footerSaveBtn: { flex: 1, backgroundColor: colors.brand, paddingVertical: 14, borderRadius: radius._15, alignItems: "center" },
  footerSaveBtnText: { fontSize: font.body, fontWeight: font.bold, color: "#fff" },

  actionModalContainer: { margin: 20, padding: 20, alignSelf: 'center', width: '90%' },
  actionTextInput: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, borderRadius: radius._12, padding: 12, fontSize: font.sub, color: colors.ink, minHeight: 80, textAlignVertical: 'top' },
  actionModalBtn: { paddingVertical: 12, borderRadius: radius._12, alignItems: 'center', justifyContent: 'center' },
  actionModalBtnText: { fontSize: font.sub, fontWeight: font.bold },
});

