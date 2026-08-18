import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import * as api from '@/lib/api';
import * as storage from '@/lib/storage';
import { Invoice, LoginResponse, Role, SapKpi } from '@/types/models';

const SESSION_KEY = 'dis_session_data';

export interface Session {
  email: string;
  role: Role;
  name: string;
  depots: string[];
  depot_number: string;
  depot_name: string;
  sap_kpi: SapKpi;
}

interface AuthState {
  session: Session | null;
  /** One-shot invoice list handed off by LoginSet, consumed once by the Dashboard cache — mirrors st.session_state._sap_inv_rows. */
  initialInvoices: Invoice[] | null;
  bootstrapping: boolean;
  readOnly: boolean;
  requestOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
  signOut: () => Promise<void>;
  consumeInitialInvoices: () => Invoice[] | null;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initialInvoices, setInitialInvoices] = useState<Invoice[] | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await api.getToken();
      const raw = await storage.getItem(SESSION_KEY);
      if (token && raw) {
        try {
          setSession(JSON.parse(raw) as Session);
        } catch {
          await api.setToken(null);
          await storage.deleteItem(SESSION_KEY);
        }
      }
      setBootstrapping(false);
    })();
  }, []);

  async function requestOtp(email: string) {
    await api.sendOtp(email);
  }

  async function verifyOtp(email: string, otp: string) {
    const result: LoginResponse = await api.login(email, otp);
    await api.setToken(result.token);
    const nextSession: Session = {
      email: result.email,
      role: result.role,
      name: result.name,
      depots: result.depots,
      depot_number: result.depot_number,
      depot_name: result.depot_name,
      sap_kpi: result.sap_kpi,
    };
    await storage.setItem(SESSION_KEY, JSON.stringify(nextSession));
    setSession(nextSession);
    setInitialInvoices(result.invoices ?? null);
  }

  async function signOut() {
    await api.setToken(null);
    await storage.deleteItem(SESSION_KEY);
    setSession(null);
    setInitialInvoices(null);
  }

  function consumeInitialInvoices() {
    const rows = initialInvoices;
    setInitialInvoices(null);
    return rows;
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        initialInvoices,
        bootstrapping,
        readOnly: session?.role === 'hq',
        requestOtp,
        verifyOtp,
        signOut,
        consumeInitialInvoices,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
