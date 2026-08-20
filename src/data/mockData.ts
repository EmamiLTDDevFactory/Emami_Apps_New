import { Platform } from 'react-native';
import {
  Landmark, Truck, Activity, Receipt, Home, LayoutGrid, Star, Clock,
  Grid3x3, HelpCircle, Settings, ShieldCheck,
} from 'lucide-react-native';
import type { AppItem, RecentEntry, NotificationItem, NavItem, CategoryFilter } from '../types';

export const CATEGORIES: CategoryFilter[] = ['All', 'Finance', 'Operations'];

/**
 * Live app URLs. Every real app renders inside a WebView on the launch screen
 * via this URL.
 *
 * On web, all four are now genuinely same-origin: their actual frontends
 * (fixed to be base-path aware — see embedded-apps/) are built and served
 * directly by this hub's own server at /apps/expense, /apps/dispatch-tracker,
 * /apps/rc-portal and /apps/mouldhealthcheck — not a proxy, not an iframe to
 * another domain. A relative URL here is the signal AppDetailScreen uses to
 * do a full page navigation instead of rendering a WebView.
 *
 * Their backend/API endpoints are untouched: Non CTC Expense and RC Portal
 * each get their own real backend brought in too (see each app's own
 * backend/ folder under embedded-apps/, real Azure/SAP credentials via its
 * gitignored backend/.env); Dispatch Tracker and MoldHealthCheck need no
 * backend of their own — each frontend already hardcodes an absolute
 * external API domain that works directly (confirmed by testing it), unaffected
 * by where its own frontend is hosted.
 *
 * Native has no such merged build, so it keeps hitting each real external
 * URL via WebView as before.
 */
export const EMBEDDED_APP_URLS: Record<string, string> = {
  hr: Platform.OS === 'web' ? '/apps/dispatch-tracker' : 'https://main.d24jo2310130zc.amplifyapp.com', // Dispatch Tracker
  finance: Platform.OS === 'web' ? '/apps/rc-portal' : 'https://main.due5mcy3my82.amplifyapp.com', // RC Portal
  // MoldHealthCheck's auth-check redirect only lives in its own top-level
  // splash screen (app/index.tsx), which is skipped when navigating straight
  // to /apps/mouldhealthcheck — so point directly at the same screen that
  // splash itself redirects to, instead of the bare app root.
  inventory: Platform.OS === 'web' ? '/apps/mouldhealthcheck/welcome' : 'https://mould.emamiapps.in', // MoldHealthCheck
  expense: Platform.OS === 'web' ? '/apps/expense' : 'https://non-ctc-expense.onrender.com/zexpense/', // Non CTC Expense
};

const RAW_APPS: AppItem[] = [
  { id: 'expense', name: 'Non CTC Expense', desc: 'Submit and track non-CTC (non-salary) expense claims and reimbursements.', cat: 'Finance', icon: Receipt, uses: 128 },
  { id: 'finance', name: 'RC Portal', desc: 'Manage rate contracts and vendor pricing agreements.', cat: 'Finance', icon: Landmark, uses: 96 },
  { id: 'hr', name: 'Dispatch Tracker', desc: 'Track shipment dispatches and delivery status in real time.', cat: 'Operations', icon: Truck, uses: 210 },
  { id: 'inventory', name: 'MoldHealthCheck', desc: 'Monitor mould condition and preventive maintenance health checks.', cat: 'Operations', icon: Activity, uses: 29 },
];

export const APPS: AppItem[] = RAW_APPS.map((app) => ({
  ...app,
  url: EMBEDDED_APP_URLS[app.id],
}));

export const RECENT: RecentEntry[] = [
  { id: 'expense', when: 'Today, 9:42 AM' },
  { id: 'hr', when: 'Today, 8:15 AM' },
  { id: 'finance', when: 'Yesterday, 5:03 PM' },
  { id: 'inventory', when: 'Yesterday, 11:20 AM' },
];

export const NOTIFICATIONS: NotificationItem[] = [
  { id: 'n1', title: 'Non CTC Expense: August reimbursement processed', when: '10 min ago', unread: true },
  { id: 'n2', title: 'RC Portal: new rate contract awaiting review', when: '1 hr ago', unread: true },
  { id: 'n3', title: 'Dispatch Tracker: shipment DT-2291 delivered', when: 'Yesterday', unread: false },
];

export const unreadNotificationsCount = NOTIFICATIONS.filter((n) => n.unread).length;

export const NAV: NavItem[] = [
  { id: 'Home', label: 'Home', icon: Home },
  { id: 'MyApplications', label: 'My Applications', icon: LayoutGrid },
  { id: 'Favorites', label: 'Favorites', icon: Star },
  { id: 'Recent', label: 'Recently Used', icon: Clock },
  { id: 'AllApplications', label: 'All Applications', icon: Grid3x3 },
  { id: 'Help', label: 'Help & Support', icon: HelpCircle },
  { id: 'Settings', label: 'Settings', icon: Settings },
  { id: 'UserAccess', label: 'Manage Access', icon: ShieldCheck },
];

export const CURRENT_USER = {
  name: 'Sudipto Roy',
  email: 'sudiptoroy@emamigroup.com',
  mobile: '98300 11234',
  role: 'Employee',
  status: 'Active',
  lastLogin: 'Today, 9:42 AM',
};

// Seed data for the "Manage Access" screen. This is a placeholder allow-list
// only — there is no backend or auth enforcement behind it yet. It exists so
// the admin-facing entry point (per-user, per-app access) is in place before
// the real access-control system (roles, invites, SSO sync) is designed.
export interface UserAccessEntry {
  email: string;
  /** App ids (see APPS) this user is granted access to. */
  appIds: string[];
}

export const AUTHORIZED_USERS: UserAccessEntry[] = [
  { email: 'sudiptoroy@emamigroup.com', appIds: APPS.map((a) => a.id) },
  { email: 'admin@emamigroup.com', appIds: APPS.map((a) => a.id) },
];

export const ACTIVITY_STATS = {
  sessionsTotal: 1,
  logins: 1,
  timeSpent: '—',
  appsOpened: 2,
  downloads: 0,
  favoritesAdded: 2,
  notificationsRead: 1,
  mostUsedApp: 'Dispatch Tracker',
};

export function appById(id: string) {
  return APPS.find((a) => a.id === id);
}

export const topUsedAppId = APPS.reduce((a, b) => (b.uses > a.uses ? b : a)).id;
