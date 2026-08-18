import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Local, persisted inspection-tracking store.
 *
 * The SAP backend doesn't expose per-mould inspection status, so we track it on
 * the device: which moulds are in-progress / done, how much of each checklist is
 * filled, and how many defect photos were attached. Survives app restarts via
 * AsyncStorage.
 */

export type InspectionStatus = "not_started" | "in_progress" | "done";
type ModuleProgress = { answered: number; total: number };

export type MouldRecord = {
  materialCode: string;
  materialDescription?: string;
  status: InspectionStatus;
  modules: Record<string, ModuleProgress>;
  photos: number;
  startedAt?: number;
  updatedAt?: number;
};

type Records = Record<string, MouldRecord>;

type Ctx = {
  ready: boolean;
  records: Records;
  activeCode: string | null;
  startInspection: (m: { materialCode: string; materialDescription?: string }) => void;
  recordModule: (moduleCode: string, answered: number, total: number) => void;
  addPhotos: (count: number) => void;
  completeActive: () => void;
  getRecord: (materialCode: string) => MouldRecord | undefined;
  getProgress: (materialCode: string) => number; // 0..100
};

const STORAGE_KEY = "mh.inspection.v1";

const InspectionContext = createContext<Ctx>({
  ready: false,
  records: {},
  activeCode: null,
  startInspection: () => {},
  recordModule: () => {},
  addPhotos: () => {},
  completeActive: () => {},
  getRecord: () => undefined,
  getProgress: () => 0,
});

export function progressOf(rec?: MouldRecord): number {
  if (!rec) return 0;
  if (rec.status === "done") return 100;
  const mods = Object.values(rec.modules);
  const total = mods.reduce((s, m) => s + m.total, 0);
  const answered = mods.reduce((s, m) => s + m.answered, 0);
  if (!total) return rec.status === "in_progress" ? 2 : 0; // tiny sliver once started
  return Math.min(100, Math.round((answered / total) * 100));
}

export function InspectionProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<Records>({});
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // load once
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setRecords(JSON.parse(raw));
      } catch {
        // ignore corrupt store
      } finally {
        setReady(true);
      }
    })();
  }, []);

  // persist (debounced) whenever records change after load
  useEffect(() => {
    if (!ready) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(records)).catch(() => {});
    }, 300);
  }, [records, ready]);

  const now = () => Date.now();

  const startInspection: Ctx["startInspection"] = (m) => {
    setActiveCode(m.materialCode);
    setRecords((prev) => {
      const existing = prev[m.materialCode];
      if (existing && existing.status === "done") return prev; // keep done state
      return {
        ...prev,
        [m.materialCode]: {
          materialCode: m.materialCode,
          materialDescription: m.materialDescription ?? existing?.materialDescription,
          status: "in_progress",
          modules: existing?.modules ?? {},
          photos: existing?.photos ?? 0,
          startedAt: existing?.startedAt ?? now(),
          updatedAt: now(),
        },
      };
    });
  };

  const recordModule: Ctx["recordModule"] = (moduleCode, answered, total) => {
    if (!activeCode) return;
    setRecords((prev) => {
      const rec = prev[activeCode];
      if (!rec) return prev;
      return {
        ...prev,
        [activeCode]: {
          ...rec,
          status: rec.status === "done" ? "done" : "in_progress",
          modules: { ...rec.modules, [moduleCode]: { answered, total } },
          updatedAt: now(),
        },
      };
    });
  };

  const addPhotos: Ctx["addPhotos"] = (count) => {
    if (!activeCode || count <= 0) return;
    setRecords((prev) => {
      const rec = prev[activeCode];
      if (!rec) return prev;
      return { ...prev, [activeCode]: { ...rec, photos: rec.photos + count, updatedAt: now() } };
    });
  };

  const completeActive: Ctx["completeActive"] = () => {
    if (!activeCode) return;
    setRecords((prev) => {
      const rec = prev[activeCode];
      if (!rec) return prev;
      return { ...prev, [activeCode]: { ...rec, status: "done", updatedAt: now() } };
    });
  };

  const getRecord: Ctx["getRecord"] = (code) => records[code];
  const getProgress: Ctx["getProgress"] = (code) => progressOf(records[code]);

  return (
    <InspectionContext.Provider
      value={{ ready, records, activeCode, startInspection, recordModule, addPhotos, completeActive, getRecord, getProgress }}
    >
      {children}
    </InspectionContext.Provider>
  );
}

export const useInspection = () => useContext(InspectionContext);
