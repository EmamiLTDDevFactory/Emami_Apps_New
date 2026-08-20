import EmptyState from "@/components/ui/EmptyState";
import GlassSurface from "@/components/ui/GlassSurface";
import SectionTitle from "@/components/ui/SectionTitle";
import { colors, font, radius, shadow, statusColors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/config";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Icons from "phosphor-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

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

  // State for the mandatory-comment Ignore confirmation modal
  const [ignoreTarget, setIgnoreTarget] = useState<{ sectionKey: string; idx: number; item: any } | null>(null);
  const [ignoreRemark, setIgnoreRemark] = useState("");
  const [ignoreError, setIgnoreError] = useState(false);

  // Condition OK / Issue Detected / All filter for the checklist sections
  const [statusFilter, setStatusFilter] = useState<"All" | "OK" | "Issue">("All");

  // "See Defect Photos" dialog — fetched from ZMoldAttachmentSet by ZinspId + ZinspItem (the
  // attachment metadata/base64 lives per-item, not per-report, so it's fetched on demand per row
  // rather than upfront for every checklist line).
  const [attachmentTarget, setAttachmentTarget] = useState<{ zinspItem: string; name: string } | null>(null);
  const [attachments, setAttachments] = useState<{ zattchId: string; mimeType: string; fileName: string; base: string }[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);

  // Full-screen zoomable preview for one attachment, opened by tapping its thumbnail.
  const [zoomAttachment, setZoomAttachment] = useState<{ mimeType: string; fileName: string; base: string } | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const ZOOM_MIN = 1;
  const ZOOM_MAX = 4;
  const ZOOM_STEP = 0.5;

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
      let ZinspId = "";

      rawResults.forEach((item: any) => {
        const inspId = item.Zinspid || item.ZinspId || item.ZinspID || item.ZINSPID;
        if (!ZinspId && inspId) ZinspId = inspId;
        const colId = item.ZmouldColId;
        const record = {
          sectionKey: colId,
          name: item.ZmouldColName?.trim(),
          val1: item.ZmouldColVal1?.trim(),
          val2: item.ZmouldColVal2?.trim(),
          val3: item.ZmouldColVal3?.trim(),
          ZinspItem: item.Zinspitem || item.ZinspItem || item.ZINSPITEM,
        };

        if (colId === "PM") grouped.PM.push(record);
        else if (colId === "SP") grouped.SP.push(record);
        else if (colId === "IS") grouped.IS.push(record);
        else if (SECTION_TITLES[colId]) {
          if (!grouped.checklists[colId]) grouped.checklists[colId] = [];
          grouped.checklists[colId].push(record);
        }
      });

      grouped.ZinspId = ZinspId;
      setData(grouped);
    } catch (error) {
      console.error("Failed to load report details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenIgnoreModal = (sectionKey: string, idx: number, item: any) => {
    setIgnoreTarget({ sectionKey, idx, item });
    setIgnoreRemark("");
    setIgnoreError(false);
  };

  const confirmIgnore = () => {
    if (!ignoreTarget) return;
    if (!ignoreRemark.trim()) {
      setIgnoreError(true);
      return;
    }
    const { sectionKey, idx } = ignoreTarget;

    setData((prevData: any) => {
      if (!prevData) return prevData;
      const newData = { ...prevData };
      if (newData.checklists && newData.checklists[sectionKey]) {
        newData.checklists[sectionKey] = [...newData.checklists[sectionKey]];
        const currentItem = newData.checklists[sectionKey][idx];
        newData.checklists[sectionKey][idx] = {
          ...currentItem,
          val1: "Yes", // Turns red check (val1 == "No") into green ("Yes" / Condition OK)
          val2: currentItem.val2 ? `${currentItem.val2} | Ignored: ${ignoreRemark.trim()}` : `Ignored: ${ignoreRemark.trim()}`,
        };
      }
      return newData;
    });

    setIgnoreTarget(null);
    setIgnoreRemark("");
    setIgnoreError(false);
  };

  const openAttachments = async (zinspItem: string, name: string) => {
    setAttachmentTarget({ zinspItem, name });
    setAttachments([]);
    setZoomAttachment(null);
    setAttachmentsLoading(true);
    try {
      const res = await api.get("/ZMM_MOULD_CARE_SRV/ZMoldAttachmentSet", {
        params: {
          $filter: `ZinspId eq '${data.ZinspId}' and ZinspItem eq '${zinspItem}'`,
          $format: "json",
        },
      });
      const results = res.data?.d?.results || [];
      setAttachments(
        results.map((a: any) => ({
          zattchId: a.ZattchId,
          mimeType: a.MimeType,
          fileName: a.FileName,
          base: a.Base,
        }))
      );
    } catch (error) {
      console.error("Failed to load defect photos:", error);
    } finally {
      setAttachmentsLoading(false);
    }
  };

  const openZoom = (att: { mimeType: string; fileName: string; base: string }) => {
    setZoomAttachment(att);
    setZoomScale(1);
  };

  const downloadAttachment = async (att: { mimeType: string; fileName: string; base: string }) => {
    if (!att.base) return;
    const dataUri = `data:${att.mimeType};base64,${att.base}`;
    try {
      if (Platform.OS === "web") {
        // A real download link works fine here (this is the shipped app, not a sandboxed preview).
        const a = document.createElement("a");
        a.href = dataUri;
        a.download = att.fileName || "attachment";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }
      // Native: write the decoded file into the cache dir, then hand it to the OS share sheet —
      // that's the standard Expo-friendly way to let the user save it without extra permissions
      // (a true "save to gallery" would need expo-media-library and photo-library access).
      const file = new File(Paths.cache, att.fileName || "attachment");
      file.create({ overwrite: true });
      file.write(att.base, { encoding: "base64" });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: att.mimeType });
      } else {
        Alert.alert("Saved", `File saved to ${file.uri}`);
      }
    } catch (error) {
      console.error("Failed to download attachment:", error);
      Alert.alert("Error", "Could not download this file.");
    }
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
            ZinspId: report.ZinspId,
            ZinspItem: item.ZinspItem,
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
              ZinspId: report.ZinspId,
              ZinspItem: item.ZinspItem,
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
        ReviewBy: user?.Email,
        ZinspId: report.ZinspId,
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[modalStyles.title, { flexShrink: 1 }]} numberOfLines={1}>{report?.Maktx || "Material Description"}</Text>
                {data?.ZinspId ? (
                  <View style={{ backgroundColor: colors.brand, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#fff' }}>Insp ID: {data.ZinspId}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[modalStyles.subtitle, { marginTop: 4 }]} numberOfLines={1}>Code: {report?.Matnr}</Text>

              {report?.Criticality && (
                <View style={[
                  modalStyles.badge,
                  {
                    marginTop: 6, alignSelf: 'flex-start',
                    backgroundColor: report.Criticality === 'Critical' ? statusColors.danger.bg : report.Criticality === 'Major' ? statusColors.warning.bg : report.Criticality === 'Minor' ? statusColors.info.bg : statusColors.success.bg,
                    borderColor: report.Criticality === 'Critical' ? statusColors.danger.border : report.Criticality === 'Major' ? statusColors.warning.border : report.Criticality === 'Minor' ? statusColors.info.border : statusColors.success.border
                  }
                ]}>
                  <Text style={[
                    modalStyles.badgeText,
                    { color: report.Criticality === 'Critical' ? statusColors.danger.fg : report.Criticality === 'Major' ? statusColors.warning.fg : report.Criticality === 'Minor' ? statusColors.info.fg : statusColors.success.fg }
                  ]}>Criticality: {report.Criticality}</Text>
                </View>
              )}

              {data && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setStatusFilter("All")}
                    style={[modalStyles.badge, modalStyles.badgeNeutral, statusFilter === "All" && modalStyles.badgeFilterActive]}
                  >
                    <Text style={[modalStyles.badgeText, modalStyles.badgeNeutralText]}>All</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setStatusFilter(statusFilter === "OK" ? "All" : "OK")}
                    style={[modalStyles.badge, modalStyles.badgeSuccess, statusFilter === "OK" && modalStyles.badgeFilterActive]}
                  >
                    <Text style={[modalStyles.badgeText, modalStyles.badgeSuccessText]}>{okCount} Condition OK</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setStatusFilter(statusFilter === "Issue" ? "All" : "Issue")}
                    style={[modalStyles.badge, issueCount > 0 ? modalStyles.badgeDanger : modalStyles.badgeNeutral, statusFilter === "Issue" && modalStyles.badgeFilterActive]}
                  >
                    <Text style={[modalStyles.badgeText, issueCount > 0 ? modalStyles.badgeDangerText : modalStyles.badgeNeutralText]}>{issueCount} Issue Detected</Text>
                  </TouchableOpacity>
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

              {data && Object.keys(data.checklists).map((key) => {
                // Keep each item's ORIGINAL index (needed so Ignore/Take Action still update the
                // right entry in data.checklists[key] after the list below is filtered for display).
                const indexed = data.checklists[key].map((item: any, originalIdx: number) => ({ item, originalIdx }));
                const visible = indexed.filter(({ item }: any) => {
                  if (statusFilter === "All") return true;
                  const isOk = item.val1 === "Yes" || item.val1 === "Condition OK";
                  if (statusFilter === "OK") return isOk;
                  const isIssue = item.val1 === "No" || item.val1 === "Issue Detected";
                  return isIssue;
                });
                if (visible.length === 0) return null;

                return (
                  <View key={key} style={modalStyles.sectionContainer}>
                    <SectionTitle
                      title={SECTION_TITLES[key]}
                      subtitle={statusFilter === "All" ? `${data.checklists[key].length} checks` : `${visible.length} of ${data.checklists[key].length} checks`}
                    />
                    <View style={[modalStyles.card, shadow.soft]}>
                      {visible.map(({ item, originalIdx }: any, i: number) => {
                        const isOk = item.val1 === "Yes" || item.val1 === "Condition OK";
                        const isIssue = item.val1 === "No" || item.val1 === "Issue Detected";
                        const isAction = item.val1 === "Action Initiated" || item.val1 === "Action Taken";

                        return (
                          <View key={originalIdx} style={[modalStyles.row, i !== visible.length - 1 && modalStyles.borderBottom]}>
                            <View style={{ flex: 1 }}>
                              <Text style={modalStyles.taskName}>
                                {item.ZinspItem ? <Text style={{ color: colors.textFaint, fontWeight: '600' }}>#{item.ZinspItem} </Text> : null}
                                {item.name}
                              </Text>
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

                              {/* Defect photos — visible to anyone (vendor or admin), only when this line has attachments */}
                              {!!item.val3 && /attachment/i.test(item.val3) && (
                                <TouchableOpacity
                                  style={[modalStyles.actionBtn, { backgroundColor: colors.infoSoft, borderColor: statusColors.info.border }]}
                                  onPress={() => openAttachments(item.ZinspItem, item.name)}
                                  activeOpacity={0.7}
                                >
                                  <Icons.Image size={13} color={statusColors.info.fg} weight="bold" />
                                  <Text style={[modalStyles.actionBtnText, { color: statusColors.info.fg }]}>{item.val3}</Text>
                                </TouchableOpacity>
                              )}

                              {/* Two action options for each checklist line - ADMIN ONLY */}
                              {user?.Role === 'Admin' && (
                                <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                                  <TouchableOpacity
                                    style={[
                                      modalStyles.actionBtn,
                                      isOk ? modalStyles.actionBtnActiveIgnore : { backgroundColor: colors.surfaceAlt }
                                    ]}
                                    onPress={() => handleOpenIgnoreModal(key, originalIdx, item)}
                                    activeOpacity={0.7}
                                  >
                                    <Icons.CheckCircle size={13} color={isOk ? statusColors.success.fg : colors.textMuted} weight="bold" />
                                    <Text style={[modalStyles.actionBtnText, { color: isOk ? statusColors.success.fg : colors.ink }]}>Ignore</Text>
                                  </TouchableOpacity>

                                  <TouchableOpacity
                                    style={[
                                      modalStyles.actionBtn,
                                      isAction ? modalStyles.actionBtnActiveAction : { backgroundColor: colors.brand, borderColor: colors.brand }
                                    ]}
                                    onPress={() => handleOpenActionModal(key, originalIdx, item)}
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
                );
              })}

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

      {/* IGNORE CONFIRMATION MODAL — comment is mandatory */}
      <Modal visible={!!ignoreTarget} transparent animationType="fade" onRequestClose={() => setIgnoreTarget(null)}>
        <View style={modalStyles.overlay}>
          <GlassSurface intensity="modal" tint="light" borderRadius={radius._20} style={modalStyles.actionModalContainer as any}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ fontSize: font.h3, fontWeight: font.bold, color: colors.ink }}>Ignore Issue</Text>
              <TouchableOpacity onPress={() => setIgnoreTarget(null)}>
                <Icons.X size={20} color={colors.textMuted} weight="bold" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: font.sub, fontWeight: font.semibold, color: colors.textMuted, marginBottom: 8 }}>
              Checklist Line: {ignoreTarget?.item?.name}
            </Text>

            <Text style={{ fontSize: font.micro, fontWeight: font.bold, color: colors.ink, marginBottom: 6 }}>
              Comment (required):
            </Text>
            <TextInput
              style={[modalStyles.actionTextInput, ignoreError && { borderColor: statusColors.danger.border }]}
              value={ignoreRemark}
              onChangeText={(v) => { setIgnoreRemark(v); if (ignoreError) setIgnoreError(false); }}
              placeholder="Explain why this issue is being ignored..."
              placeholderTextColor={colors.textFaint}
              multiline
            />
            {ignoreError && (
              <Text style={{ fontSize: font.micro, fontWeight: font.semibold, color: statusColors.danger.fg, marginTop: 6 }}>
                A comment is required to ignore this item.
              </Text>
            )}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                style={[modalStyles.actionModalBtn, { backgroundColor: colors.surfaceAlt, flex: 1 }]}
                onPress={() => setIgnoreTarget(null)}
              >
                <Text style={[modalStyles.actionModalBtnText, { color: colors.ink }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[modalStyles.actionModalBtn, { backgroundColor: colors.brand, flex: 1 }]}
                onPress={confirmIgnore}
              >
                <Text style={[modalStyles.actionModalBtnText, { color: '#fff' }]}>Confirm Ignore</Text>
              </TouchableOpacity>
            </View>
          </GlassSurface>
        </View>
      </Modal>

      {/* DEFECT PHOTOS DIALOG — fetched from ZMoldAttachmentSet by ZinspId + ZinspItem when opened.
          Centered (not bottom-anchored like the other dialogs above) since it's a media viewer.
          The zoom view lives INSIDE this same Modal (toggled by zoomAttachment) rather than as a
          second stacked <Modal> — nested RN Modals are unreliable across platforms (Android in
          particular can fail to pass touches to a second modal opened over a still-visible one). */}
      <Modal
        visible={!!attachmentTarget}
        transparent
        animationType="fade"
        onRequestClose={() => (zoomAttachment ? setZoomAttachment(null) : setAttachmentTarget(null))}
      >
        <View style={zoomAttachment ? modalStyles.zoomOverlay : modalStyles.centeredOverlay}>
          {zoomAttachment ? (
            <>
              <View style={modalStyles.zoomHeader}>
                <TouchableOpacity onPress={() => setZoomAttachment(null)} style={modalStyles.zoomHeaderBtn}>
                  <Icons.CaretLeft size={18} color="#fff" weight="bold" />
                </TouchableOpacity>
                <Text style={modalStyles.zoomHeaderText} numberOfLines={1}>{zoomAttachment.fileName}</Text>
                {!!zoomAttachment.base && (
                  <TouchableOpacity onPress={() => downloadAttachment(zoomAttachment)} style={modalStyles.zoomHeaderBtn}>
                    <Icons.DownloadSimple size={18} color="#fff" weight="bold" />
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center' }}
                minimumZoomScale={ZOOM_MIN}
                maximumZoomScale={ZOOM_MAX}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
              >
                <Image
                  source={{ uri: `data:${zoomAttachment.mimeType};base64,${zoomAttachment.base}` }}
                  style={[modalStyles.zoomImage, { transform: [{ scale: zoomScale }] }]}
                  resizeMode="contain"
                />
              </ScrollView>

              <View style={modalStyles.zoomControls}>
                <TouchableOpacity
                  style={[modalStyles.zoomBtn, zoomScale <= ZOOM_MIN && modalStyles.zoomBtnDisabled]}
                  disabled={zoomScale <= ZOOM_MIN}
                  onPress={() => setZoomScale((s) => Math.max(ZOOM_MIN, +(s - ZOOM_STEP).toFixed(2)))}
                >
                  <Icons.Minus size={18} color="#fff" weight="bold" />
                </TouchableOpacity>
                <Text style={modalStyles.zoomPctText}>{Math.round(zoomScale * 100)}%</Text>
                <TouchableOpacity
                  style={[modalStyles.zoomBtn, zoomScale >= ZOOM_MAX && modalStyles.zoomBtnDisabled]}
                  disabled={zoomScale >= ZOOM_MAX}
                  onPress={() => setZoomScale((s) => Math.min(ZOOM_MAX, +(s + ZOOM_STEP).toFixed(2)))}
                >
                  <Icons.Plus size={18} color="#fff" weight="bold" />
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <GlassSurface intensity="modal" tint="light" borderRadius={radius._20} style={modalStyles.attachmentModalContainer as any}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={{ fontSize: font.h3, fontWeight: font.bold, color: colors.ink, flex: 1 }} numberOfLines={1}>Defect Photos</Text>
                <TouchableOpacity onPress={() => setAttachmentTarget(null)}>
                  <Icons.X size={20} color={colors.textMuted} weight="bold" />
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: font.sub, fontWeight: font.semibold, color: colors.textMuted, marginBottom: 12 }} numberOfLines={2}>
                Checklist Line: {attachmentTarget?.name}
              </Text>

              {attachmentsLoading ? (
                <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                  <ActivityIndicator size="large" color={colors.brand} />
                </View>
              ) : attachments.length === 0 ? (
                <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                  <Icons.ImageBroken size={28} color={colors.textFaint} weight="duotone" />
                  <Text style={{ marginTop: 8, fontSize: font.sub, color: colors.textFaint }}>No attachments found.</Text>
                </View>
              ) : (
                <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: 12 }} showsVerticalScrollIndicator={false}>
                  {attachments.map((att) => {
                    const isImage = att.mimeType?.startsWith("image/") && !!att.base;
                    return (
                      <View key={att.zattchId} style={modalStyles.attachmentCard}>
                        <TouchableOpacity activeOpacity={isImage ? 0.85 : 1} onPress={() => isImage && openZoom(att)} disabled={!isImage}>
                          {isImage ? (
                            <Image
                              source={{ uri: `data:${att.mimeType};base64,${att.base}` }}
                              style={modalStyles.attachmentImage}
                              resizeMode="contain"
                            />
                          ) : (
                            <View style={[modalStyles.attachmentImage, { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt }]}>
                              <Icons.FilePdf size={28} color={colors.danger} weight="duotone" />
                            </View>
                          )}
                        </TouchableOpacity>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, gap: 8 }}>
                          <Text style={{ flex: 1, fontSize: font.micro, color: colors.textMuted }} numberOfLines={1}>
                            {att.fileName || att.zattchId}
                          </Text>
                          {!!att.base && (
                            <TouchableOpacity onPress={() => downloadAttachment(att)} hitSlop={6} style={modalStyles.downloadBtn}>
                              <Icons.DownloadSimple size={13} color={colors.brand} weight="bold" />
                            </TouchableOpacity>
                          )}
                        </View>
                        {!att.base && (
                          <Text style={{ fontSize: font.micro, color: statusColors.danger.fg, marginTop: 2, textAlign: 'center' }}>
                            Could not load file
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </ScrollView>
              )}

              <TouchableOpacity
                style={[modalStyles.actionModalBtn, { backgroundColor: colors.surfaceAlt, marginTop: 16 }]}
                onPress={() => setAttachmentTarget(null)}
              >
                <Text style={[modalStyles.actionModalBtnText, { color: colors.ink }]}>Close</Text>
              </TouchableOpacity>
            </GlassSurface>
          )}
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
  badgeSuccess: { backgroundColor: statusColors.success.bg, borderColor: statusColors.success.border },
  badgeSuccessText: { color: statusColors.success.fg },
  badgeDanger: { backgroundColor: statusColors.danger.bg, borderColor: statusColors.danger.border },
  badgeDangerText: { color: statusColors.danger.fg },
  badgeInfo: { backgroundColor: statusColors.info.bg, borderColor: statusColors.info.border },
  badgeInfoText: { color: statusColors.info.fg },
  badgeWarning: { backgroundColor: statusColors.warning.bg, borderColor: statusColors.warning.border },
  badgeWarningText: { color: statusColors.warning.fg },
  badgeNeutral: { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
  badgeNeutralText: { color: colors.textMuted },
  badgeFilterActive: { borderWidth: 2, borderColor: colors.ink },

  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  actionBtnActiveIgnore: { backgroundColor: statusColors.success.bg, borderColor: statusColors.success.border },
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

  attachmentModalContainer: { margin: 20, padding: 20, alignSelf: 'center', width: '90%', maxWidth: 480 },
  attachmentCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius._15, padding: 10 },
  attachmentImage: { width: '100%', height: 220, borderRadius: radius._12, backgroundColor: colors.surfaceAlt },
  centeredOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  downloadBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },

  zoomOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)" },
  zoomHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 50, paddingBottom: 12, gap: 12 },
  zoomHeaderText: { flex: 1, color: '#fff', fontSize: font.sub, fontWeight: font.bold },
  zoomHeaderBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  zoomImage: { width: '100%', height: '100%' },
  zoomControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 16, paddingBottom: 30 },
  zoomBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  zoomBtnDisabled: { opacity: 0.35 },
  zoomPctText: { color: '#fff', fontSize: font.body, fontWeight: font.bold, minWidth: 50, textAlign: 'center' },
});

