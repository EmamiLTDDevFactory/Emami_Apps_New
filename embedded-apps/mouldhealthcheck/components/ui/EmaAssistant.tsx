import React, { useMemo, useRef, useState } from "react";
import { Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as Icons from "phosphor-react-native";
import { colors, font, radius, shadow } from "@/constants/theme";

/**
 * EMA — a fully offline, rule-based Q&A assistant over the admin dashboard's own data.
 * No external API/LLM: every answer is computed by filtering/aggregating the `molds` array
 * (the same `allMolds` the rest of the dashboard renders from), so answers always match what's
 * on screen and there's no key/cost/latency to manage.
 */

type Mold = {
  moldCode?: string;
  moldDescription?: string;
  status?: string;
  cost?: number;
  depreciation?: number;
  vendorId?: string;
  vendorName?: string;
  brandName?: string;
  subBrandName?: string;
  compPart?: string;
  category?: string;
  region?: string;
  country?: string;
  criticality?: string;
  inspectionCount?: number;
  lastInspectionDate?: any;
  businessArea?: string;
  remainingLife?: any;
  remainingShots?: any;
  mouldLife?: any;
  mouldShots?: any;
  [key: string]: any;
};

type ChatMessage = { id: string; role: "user" | "bot"; text: string };

const AT_RISK_THRESHOLD = 0.2;
const STALE_DAYS = 90;

const formatINR = (v: number) => {
  if (!Number.isFinite(v)) return "N/A";
  if (Math.abs(v) >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
  if (Math.abs(v) >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
  return `₹${v.toLocaleString("en-IN")}`;
};

const parseSapDate = (value: any): Date | null => {
  if (!value) return null;
  if (typeof value === "string" && value.startsWith("/Date(")) {
    const ms = parseInt(value.replace(/[^0-9]/g, ""), 10);
    return Number.isFinite(ms) ? new Date(ms) : null;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const isRunning = (m: Mold) => m.status === "Running Asset";
const isInternational = (m: Mold) => m.businessArea === "03";
const isInspected = (m: Mold) => (m.inspectionCount || 0) > 0;
const isStale = (m: Mold) => {
  const d = parseSapDate(m.lastInspectionDate);
  if (!d) return true;
  return (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24) > STALE_DAYS;
};
const isAtRisk = (m: Mold) => {
  const life = parseFloat(m.remainingLife);
  const lifeTotal = parseFloat(m.mouldLife);
  const shots = parseFloat(m.remainingShots);
  const shotsTotal = parseFloat(m.mouldShots);
  const lifePct = Number.isFinite(life) && Number.isFinite(lifeTotal) && lifeTotal > 0 ? life / lifeTotal : null;
  const shotsPct = Number.isFinite(shots) && Number.isFinite(shotsTotal) && shotsTotal > 0 ? shots / shotsTotal : null;
  return (lifePct !== null && lifePct <= AT_RISK_THRESHOLD) || (shotsPct !== null && shotsPct <= AT_RISK_THRESHOLD);
};

const groupCount = (list: Mold[], key: keyof Mold) => {
  const counts: Record<string, number> = {};
  list.forEach((m) => {
    const k = (m[key] as string) || "Unspecified";
    counts[k] = (counts[k] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
};

const summarize = (list: Mold[]) => {
  const running = list.filter(isRunning).length;
  return { total: list.length, running, npa: list.length - running };
};

/** Find the best-matching distinct value of `key` that appears (as a substring) in the query. Longest match wins. */
const matchDistinctValue = (q: string, list: Mold[], key: keyof Mold): string | null => {
  const values = Array.from(new Set(list.map((m) => (m[key] as string) || "").filter(Boolean)));
  let best: string | null = null;
  values.forEach((v) => {
    const lv = v.toLowerCase();
    if (lv.length >= 3 && q.includes(lv) && (!best || lv.length > best.length)) best = v;
  });
  return best;
};

const matchCategoryCode = (q: string, list: Mold[]): string | null => {
  const codes = Array.from(new Set(list.map((m) => m.category).filter(Boolean))) as string[];
  const direct = codes.find((c) => new RegExp(`\\b${c.toLowerCase()}\\b`).test(q));
  return direct || null;
};

function answerQuery(query: string, molds: Mold[]): string {
  const q = query.toLowerCase().trim();
  if (!molds.length) return "I don't have any dashboard data loaded yet — try again once the assets have finished loading.";

  if (/^(hi|hello|hey|help|what can you|examples?)\b/.test(q)) {
    return (
      "I'm EMA — ask me about the data on this dashboard. For example:\n" +
      "• \"How many brands does <component/part> have?\"\n" +
      "• \"How many running assets does <brand> have?\"\n" +
      "• \"NPA count for <vendor>\"\n" +
      "• \"How many moulds are at risk?\"\n" +
      "• \"Total acquisition value for <brand>\"\n" +
      "• \"How many moulds are overdue for inspection?\"\n" +
      "• \"Show me criticality breakdown\"\n" +
      "• \"Details for material <code>\""
    );
  }

  // --- Specific material lookup (exact/substring code match) ---
  const codeMatch = q.match(/\b([a-z0-9][a-z0-9\-_.]{3,})\b/gi) || [];
  const material = molds.find((m) =>
    codeMatch.some((tok) => {
      const t = tok.toLowerCase();
      return (m.moldCode && String(m.moldCode).toLowerCase().includes(t) && t.length >= 4) ||
        (m.moldDescription && String(m.moldDescription).toLowerCase() === t);
    })
  );
  if (material && /(detail|status|about|info|tell me)/.test(q)) {
    const life = parseFloat(material.remainingLife);
    const shots = parseFloat(material.remainingShots);
    return (
      `${material.moldDescription || material.moldCode} (${material.moldCode})\n` +
      `• Status: ${material.status}\n` +
      `• Component/Part: ${material.compPart || "Unspecified"}\n` +
      `• Brand: ${material.brandName || "Unknown"} | Vendor: ${material.vendorName || "Unknown"}\n` +
      `• Region: ${material.region || "Unknown"} (${isInternational(material) ? "International" : "Domestic"})\n` +
      `• Acquisition Value: ${formatINR(material.cost || 0)} | Depreciation: ${formatINR(Math.abs(material.depreciation || 0))}\n` +
      `• Criticality: ${material.criticality || "Unspecified"}\n` +
      `• Remaining Life: ${Number.isFinite(life) ? life : "N/A"} | Remaining Shots: ${Number.isFinite(shots) ? shots : "N/A"}\n` +
      `• Inspections: ${material.inspectionCount || 0} | Last Inspected: ${(() => { const d = parseSapDate(material.lastInspectionDate); return d ? d.toLocaleDateString("en-IN") : "Never"; })()}` +
      (isAtRisk(material) ? "\n• ⚠️ This mould is currently AT RISK (remaining life or shots ≤ 20%)." : "")
    );
  }

  // --- Build filters from the query ---
  // Component/Part is the top-level grouping everywhere else on this dashboard, so it's matched
  // first here too (though since every filter below is AND-ed together, matching order doesn't
  // itself change the result — it just mirrors the dashboard's CompPart → Brand → ... ordering).
  let filtered = molds;
  const compPart = matchDistinctValue(q, molds, "compPart");
  if (compPart) filtered = filtered.filter((m) => m.compPart === compPart);
  const brand = matchDistinctValue(q, molds, "brandName");
  if (brand) filtered = filtered.filter((m) => m.brandName === brand);
  const vendor = matchDistinctValue(q, molds, "vendorName");
  if (vendor) filtered = filtered.filter((m) => m.vendorName === vendor);
  const region = matchDistinctValue(q, molds, "region");
  if (region) filtered = filtered.filter((m) => m.region === region);
  const criticality = matchDistinctValue(q, molds, "criticality");
  if (criticality) filtered = filtered.filter((m) => m.criticality === criticality);
  const category = matchCategoryCode(q, molds);
  if (category) filtered = filtered.filter((m) => m.category === category);
  if (/\bdomestic\b/.test(q)) filtered = filtered.filter((m) => !isInternational(m));
  if (/\binternational\b|\boverseas\b|\bexport\b/.test(q)) filtered = filtered.filter((m) => isInternational(m));
  if (/\bat[- ]?risk\b|\brisky\b/.test(q)) filtered = filtered.filter(isAtRisk);
  if (/\bnot inspected\b|\bnever inspected\b|\buninspected\b/.test(q)) filtered = filtered.filter((m) => !isInspected(m));
  else if (/\binspected\b/.test(q)) filtered = filtered.filter(isInspected);
  if (/\boverdue\b|\bstale\b/.test(q)) filtered = filtered.filter(isStale);
  if (/\brunning\b|\bactive\b/.test(q)) filtered = filtered.filter(isRunning);
  else if (/\bnpa\b|\bnon[- ]?performing\b|\binactive\b/.test(q)) filtered = filtered.filter((m) => !isRunning(m));

  const entityLabel = [compPart, brand, vendor, region, criticality, category].filter(Boolean).join(", ");
  const scope = entityLabel ? ` for ${entityLabel}` : "";

  // --- Granular "how many vendors for this brand" / "which vendors supply this brand" style
  // questions — asking for a distinct-value COUNT or LIST of one dimension, scoped by whatever
  // brand/vendor/region/etc. filters were already detected above. This is different from the
  // default branch further down, which just counts moulds — here the unit being counted/listed
  // is vendors, brands, sub-brands, regions, categories, or criticalities themselves.
  const DIMENSION_MAP: Record<string, { key: keyof Mold; label: string; plural: string }> = {
    component: { key: "compPart", label: "component/part", plural: "components/parts" },
    components: { key: "compPart", label: "component/part", plural: "components/parts" },
    part: { key: "compPart", label: "component/part", plural: "components/parts" },
    parts: { key: "compPart", label: "component/part", plural: "components/parts" },
    vendor: { key: "vendorName", label: "vendor", plural: "vendors" },
    vendors: { key: "vendorName", label: "vendor", plural: "vendors" },
    subbrand: { key: "subBrandName", label: "sub-brand", plural: "sub-brands" },
    subbrands: { key: "subBrandName", label: "sub-brand", plural: "sub-brands" },
    brand: { key: "brandName", label: "brand", plural: "brands" },
    brands: { key: "brandName", label: "brand", plural: "brands" },
    region: { key: "region", label: "region", plural: "regions" },
    regions: { key: "region", label: "region", plural: "regions" },
    category: { key: "category", label: "category", plural: "categories" },
    categories: { key: "category", label: "category", plural: "categories" },
    criticality: { key: "criticality", label: "criticality level", plural: "criticality levels" },
    criticalities: { key: "criticality", label: "criticality level", plural: "criticality levels" },
  };
  const DIMENSION_WORD_PATTERN = "components?|parts?|vendors?|sub[- ]?brands?|brands?|regions?|categor(?:y|ies)|criticalit(?:y|ies)";
  const countPhrase = q.match(new RegExp(`(?:how many|number of|count of)\\s+(${DIMENSION_WORD_PATTERN})\\b`));
  const listPhrase = q.match(new RegExp(`(?:list|which|show(?: me)?|name)\\s+(?:the\\s+|all\\s+)?(${DIMENSION_WORD_PATTERN})\\b`));
  const dimWord = (countPhrase || listPhrase)?.[1]?.replace(/[- ]/g, "").toLowerCase();
  const dim = dimWord && !/breakdown|split|distribution/.test(q) ? DIMENSION_MAP[dimWord] : null;
  if (dim) {
    const values = Array.from(new Set(filtered.map((m) => (m[dim.key] as string) || "").filter(Boolean)));
    if (values.length === 0) return `I couldn't find any ${dim.plural}${scope}.`;
    if (countPhrase) {
      const suffix = values.length <= 15 ? `:\n${values.map((v) => `• ${v}`).join("\n")}` : ` (too many to list — try narrowing the question).`;
      return `There ${values.length === 1 ? "is" : "are"} ${values.length} distinct ${values.length === 1 ? dim.label : dim.plural}${scope}${suffix}`;
    }
    return `${dim.plural[0].toUpperCase()}${dim.plural.slice(1)}${scope} (${values.length}):\n${values.map((v) => `• ${v}`).join("\n")}`;
  }

  // --- Top-N ranking across brands or vendors ---
  const topMatch = q.match(/top\s*(\d+)?/);
  if (topMatch && (/\bbrand/.test(q) || /\bvendor/.test(q))) {
    const n = topMatch[1] ? parseInt(topMatch[1], 10) : 5;
    const byVendor = /\bvendor/.test(q);
    const key = byVendor ? "vendorName" : "brandName";
    const groups: Record<string, Mold[]> = {};
    molds.forEach((m) => {
      const k = (m[key] as string) || "Unknown";
      (groups[k] = groups[k] || []).push(m);
    });
    let metricLabel = "total assets";
    let scoreFn = (list: Mold[]) => list.length;
    if (/\bnpa\b/.test(q)) { metricLabel = "NPA count"; scoreFn = (list) => list.filter((m) => !isRunning(m)).length; }
    else if (/\brunning\b/.test(q)) { metricLabel = "running count"; scoreFn = (list) => list.filter(isRunning).length; }
    else if (/value|cost|acquisition/.test(q)) { metricLabel = "acquisition value"; scoreFn = (list) => list.reduce((s, m) => s + (m.cost || 0), 0); }
    else if (/at[- ]?risk/.test(q)) { metricLabel = "at-risk count"; scoreFn = (list) => list.filter(isAtRisk).length; }
    const ranked = Object.entries(groups)
      .map(([name, list]) => ({ name, score: scoreFn(list) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, n);
    const lines = ranked.map((r, i) => `${i + 1}. ${r.name} — ${metricLabel.includes("value") ? formatINR(r.score) : r.score}`);
    return `Top ${ranked.length} ${byVendor ? "vendors" : "brands"} by ${metricLabel}:\n${lines.join("\n")}`;
  }

  // --- Breakdown requests ---
  if (/breakdown|split|distribution/.test(q)) {
    let key: keyof Mold | null = null;
    if (/criticality/.test(q)) key = "criticality";
    else if (/categor/.test(q)) key = "category";
    else if (/region/.test(q)) key = "region";
    else if (/component|part/.test(q)) key = "compPart";
    else if (/brand/.test(q)) key = "brandName";
    else if (/vendor/.test(q)) key = "vendorName";
    if (key) {
      const rows = groupCount(filtered, key);
      return `Breakdown of ${filtered.length} mould(s)${scope} by ${String(key)}:\n${rows.map(([k, v]) => `• ${k}: ${v}`).join("\n")}`;
    }
  }

  // --- Value / cost questions ---
  if (/value|cost|acquisition|depreciat/.test(q)) {
    const acquisition = filtered.reduce((s, m) => s + (m.cost || 0), 0);
    const depreciation = filtered.reduce((s, m) => s + Math.abs(m.depreciation || 0), 0);
    return (
      `For ${filtered.length} mould(s)${scope}:\n` +
      `• Acquisition Value: ${formatINR(acquisition)}\n` +
      `• Depreciated Value: ${formatINR(depreciation)}\n` +
      `• Current Asset Value: ${formatINR(acquisition - depreciation)}`
    );
  }

  // --- Inspection-specific questions ---
  // Inspection KPIs only apply to Running Assets — an NPA mould is retired and isn't due for
  // inspection. If the user didn't explicitly ask about "running"/"NPA" status, default the
  // inspection scope to Running Assets only, matching the dashboard's Inspection Overview.
  if (/inspect/.test(q)) {
    const explicitStatus = /\brunning\b|\bactive\b|\bnpa\b|\bnon[- ]?performing\b|\binactive\b/.test(q);
    const inspectionScope = explicitStatus ? filtered : filtered.filter(isRunning);
    const scopeNote = explicitStatus ? scope : `${scope} (Running Assets only)`;
    const inspected = inspectionScope.filter(isInspected).length;
    const overdue = inspectionScope.filter(isStale).length;
    const totalSubmissions = inspectionScope.reduce((s, m) => s + (m.inspectionCount || 0), 0);
    const mostRecent = inspectionScope
      .map((m) => parseSapDate(m.lastInspectionDate))
      .filter((d): d is Date => d !== null)
      .sort((a, b) => b.getTime() - a.getTime())[0];
    return (
      `Inspection status for ${inspectionScope.length} mould(s)${scopeNote}:\n` +
      `• Inspected: ${inspected} | Not Inspected: ${inspectionScope.length - inspected}\n` +
      `• Total Inspection Submissions: ${totalSubmissions}\n` +
      `• Overdue (${STALE_DAYS}+ days or never): ${overdue}\n` +
      `• Most Recent Inspection: ${mostRecent ? mostRecent.toLocaleDateString("en-IN") : "N/A"}`
    );
  }

  // --- At-risk listing ---
  if (/at[- ]?risk|risky/.test(q) && /list|which|show/.test(q)) {
    const risky = filtered.filter(isAtRisk).slice(0, 10);
    if (!risky.length) return `No at-risk moulds found${scope}.`;
    return `At-risk moulds${scope} (showing up to 10):\n${risky.map((m) => `• ${m.moldDescription || m.moldCode} (${m.brandName || "Unknown"} / ${m.vendorName || "Unknown"})`).join("\n")}`;
  }

  // --- Default: plain count / running-npa summary over whatever filters were detected ---
  const { total, running, npa } = summarize(filtered);
  if (total === 0) return `I couldn't find any moulds matching that${scope ? ` (${entityLabel})` : ""}. Try a different brand, vendor, or region name.`;
  if (!entityLabel && !/how many|count|total/.test(q)) {
    return (
      "I'm not sure exactly what you're asking — here's the overall picture:\n" +
      `• Total: ${total} | Running: ${running} | NPA: ${npa}\n` +
      "Try asking about a specific brand, vendor, region, criticality, value, or inspection status."
    );
  }
  return `${entityLabel ? `For ${entityLabel}: ` : "Overall: "}${total} mould(s) — ${running} Running, ${npa} NPA.`;
}

export default function EmaAssistant({ molds }: { molds: Mold[] }) {
  const [visible, setVisible] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "welcome", role: "bot", text: "Hi, I'm EMA 👋 Ask me anything about the assets, brands, vendors, or inspections on this dashboard." },
  ]);
  const scrollRef = useRef<ScrollView>(null);
  const idRef = useRef(0);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    const userMsg: ChatMessage = { id: `m${idRef.current++}`, role: "user", text };
    const botText = answerQuery(text, molds);
    const botMsg: ChatMessage = { id: `m${idRef.current++}`, role: "bot", text: botText };
    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInput("");
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  };

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setVisible(true)}
        style={[styles.fab, shadow.floating]}
      >
        <Icons.ChatCircleDots size={18} color="#fff" weight="fill" />
        <Text style={styles.fabLabel}>EMA</Text>
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" transparent onRequestClose={() => setVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.panel}>
            <View style={styles.header}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={styles.headerIcon}>
                  <Icons.ChatCircleDots size={16} color={colors.brand} weight="fill" />
                </View>
                <View>
                  <Text style={styles.headerTitle}>EMA Assistant</Text>
                  <Text style={styles.headerSubtitle}>Answers from this dashboard's data</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setVisible(false)} hitSlop={10}>
                <Icons.X size={20} color={colors.textMuted} weight="bold" />
              </TouchableOpacity>
            </View>

            <ScrollView
              ref={scrollRef}
              style={styles.messages}
              contentContainerStyle={{ padding: 14, gap: 10 }}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            >
              {messages.map((m) => (
                <View key={m.id} style={[styles.bubble, m.role === "user" ? styles.bubbleUser : styles.bubbleBot]}>
                  <Text style={[styles.bubbleText, m.role === "user" && { color: "#fff" }]}>{m.text}</Text>
                </View>
              ))}
            </ScrollView>

            <View style={styles.inputRow}>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Ask EMA about brands, vendors, values, inspections…"
                placeholderTextColor={colors.textFaint}
                style={styles.input}
                onSubmitEditing={send}
                returnKeyType="send"
              />
              <TouchableOpacity onPress={send} style={styles.sendBtn}>
                <Icons.PaperPlaneTilt size={18} color="#fff" weight="fill" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    top: Platform.OS === "web" ? 14 : 50,
    right: 16,
    zIndex: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.brand,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: radius.pill,
  },
  fabLabel: { color: "#fff", fontWeight: font.black, fontSize: font.sub },
  overlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.4)", justifyContent: "flex-end" },
  panel: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius._24,
    borderTopRightRadius: radius._24,
    height: "78%",
    maxWidth: 520,
    width: "100%",
    alignSelf: "center",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: font.body, fontWeight: font.black, color: colors.ink },
  headerSubtitle: { fontSize: font.micro, color: colors.textMuted, marginTop: 1 },
  messages: { flex: 1 },
  bubble: { maxWidth: "85%", padding: 12, borderRadius: 14 },
  bubbleBot: { backgroundColor: colors.bg, alignSelf: "flex-start", borderBottomLeftRadius: 4 },
  bubbleUser: { backgroundColor: colors.brand, alignSelf: "flex-end", borderBottomRightRadius: 4 },
  bubbleText: { fontSize: font.sub, color: colors.ink, lineHeight: 19 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    height: 42,
    borderRadius: radius.pill,
    backgroundColor: colors.bg,
    paddingHorizontal: 16,
    fontSize: font.sub,
    color: colors.ink,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
});
