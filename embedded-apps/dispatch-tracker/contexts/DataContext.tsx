/**
 * Mirrors main_panel.py's cache lifecycle: inv_cache (90s TTL, refreshed via
 * sap.refresh_invoices) plus five per-status caches (pend/disp/comp/ret/canc)
 * that are lazily fetched the first time their tab is visited and cleared
 * (forcing a re-fetch) whenever an action mutates that data — see
 * streamlit_app/main_panel.py §3.3/§4 in the extraction spec.
 */
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import * as api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  CancelledInvoice,
  CompletedInvoice,
  DispatchDetail,
  Invoice,
  PendingInvoice,
  ReturnedInvoice,
} from '@/types/models';

const INV_CACHE_TTL_MS = 90 * 1000;

export type CacheKey = 'inv' | 'pend' | 'disp' | 'comp' | 'ret' | 'canc';

interface DataState {
  invCache: Invoice[] | null;
  pendCache: PendingInvoice[] | null;
  dispCache: DispatchDetail[] | null;
  compCache: CompletedInvoice[] | null;
  retCache: ReturnedInvoice[] | null;
  cancCache: CancelledInvoice[] | null;
  loading: Partial<Record<CacheKey, boolean>>;
  errors: Partial<Record<CacheKey, string>>;
  loadDashboard: () => Promise<void>;
  ensurePending: () => Promise<void>;
  ensureDispatched: () => Promise<void>;
  ensureCompleted: () => Promise<void>;
  ensureReturned: () => Promise<void>;
  ensureCancelled: () => Promise<void>;
  reloadInvoices: () => Promise<void>;
  invalidate: (...keys: CacheKey[]) => void;
}

const DataContext = createContext<DataState | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { session, consumeInitialInvoices } = useAuth();

  const [invCache, setInvCache] = useState<Invoice[] | null>(null);
  const [pendCache, setPendCache] = useState<PendingInvoice[] | null>(null);
  const [dispCache, setDispCache] = useState<DispatchDetail[] | null>(null);
  const [compCache, setCompCache] = useState<CompletedInvoice[] | null>(null);
  const [retCache, setRetCache] = useState<ReturnedInvoice[] | null>(null);
  const [cancCache, setCancCache] = useState<CancelledInvoice[] | null>(null);
  const cacheTs = useRef<number | null>(null);

  const [loading, setLoading] = useState<Partial<Record<CacheKey, boolean>>>({});
  const [errors, setErrors] = useState<Partial<Record<CacheKey, string>>>({});

  useEffect(() => {
    if (!session) {
      setInvCache(null);
      setPendCache(null);
      setDispCache(null);
      setCompCache(null);
      setRetCache(null);
      setCancCache(null);
      cacheTs.current = null;
      setErrors({});
    }
  }, [session]);

  const withLoad = useCallback(
    async <T,>(key: CacheKey, fn: () => Promise<T>, onOk: (v: T) => void) => {
      setLoading((s) => ({ ...s, [key]: true }));
      setErrors((s) => ({ ...s, [key]: undefined }));
      try {
        onOk(await fn());
      } catch (e) {
        setErrors((s) => ({ ...s, [key]: e instanceof Error ? e.message : 'Could not reach SAP.' }));
      } finally {
        setLoading((s) => ({ ...s, [key]: false }));
      }
    },
    []
  );

  const reloadInvoices = useCallback(async () => {
    await withLoad('inv', api.refreshInvoices, (rows) => {
      setInvCache(rows);
      cacheTs.current = Date.now();
    });
  }, [withLoad]);

  /** load_df(): reuse the one-shot LoginSet rows first, else refetch when missing/stale. */
  const ensureInvoices = useCallback(async () => {
    const handoff = consumeInitialInvoices();
    if (handoff && invCache === null) {
      setInvCache(handoff);
      cacheTs.current = Date.now();
      return;
    }
    const age = cacheTs.current ? Date.now() - cacheTs.current : Infinity;
    if (invCache === null || age > INV_CACHE_TTL_MS) {
      await reloadInvoices();
    }
  }, [consumeInitialInvoices, invCache, reloadInvoices]);

  const loadDashboard = useCallback(async () => {
    await ensureInvoices();
    if (pendCache === null) await withLoad('pend', api.getPending, setPendCache);
    if (dispCache === null) await withLoad('disp', api.getDispatched, setDispCache);
    if (compCache === null) await withLoad('comp', api.getCompleted, setCompCache);
    if (retCache === null) await withLoad('ret', api.getReturned, setRetCache);
    if (cancCache === null) await withLoad('canc', api.getCancelled, setCancCache);
  }, [ensureInvoices, pendCache, dispCache, compCache, retCache, cancCache, withLoad]);

  const ensurePending = useCallback(async () => {
    if (pendCache === null) await withLoad('pend', api.getPending, setPendCache);
  }, [pendCache, withLoad]);
  const ensureDispatched = useCallback(async () => {
    if (dispCache === null) await withLoad('disp', api.getDispatched, setDispCache);
  }, [dispCache, withLoad]);
  const ensureCompleted = useCallback(async () => {
    if (compCache === null) await withLoad('comp', api.getCompleted, setCompCache);
  }, [compCache, withLoad]);
  const ensureReturned = useCallback(async () => {
    if (retCache === null) await withLoad('ret', api.getReturned, setRetCache);
  }, [retCache, withLoad]);
  const ensureCancelled = useCallback(async () => {
    if (cancCache === null) await withLoad('canc', api.getCancelled, setCancCache);
  }, [cancCache, withLoad]);

  const invalidate = useCallback((...keys: CacheKey[]) => {
    for (const key of keys) {
      if (key === 'inv') {
        cacheTs.current = null;
        setInvCache(null);
      }
      if (key === 'pend') setPendCache(null);
      if (key === 'disp') setDispCache(null);
      if (key === 'comp') setCompCache(null);
      if (key === 'ret') setRetCache(null);
      if (key === 'canc') setCancCache(null);
    }
  }, []);

  return (
    <DataContext.Provider
      value={{
        invCache,
        pendCache,
        dispCache,
        compCache,
        retCache,
        cancCache,
        loading,
        errors,
        loadDashboard,
        ensurePending,
        ensureDispatched,
        ensureCompleted,
        ensureReturned,
        ensureCancelled,
        reloadInvoices,
        invalidate,
      }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataState {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
