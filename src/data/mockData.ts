import {
  Landmark, Truck, Activity, Receipt, Home, LayoutGrid, Star, Clock,
  Grid3x3, HelpCircle, Settings,
} from 'lucide-react-native';
import type { AppItem, RecentEntry, NotificationItem, NavItem, CategoryFilter } from '../types';

export const CATEGORIES: CategoryFilter[] = ['All', 'Finance', 'Operations'];

/**
 * Live app URLs. Every real app renders inside a WebView on the launch screen
 * via this URL.
 *
 * All four send no framing-restriction headers (confirmed directly against
 * each domain), so all four embed fine as a direct cross-origin iframe/WebView
 * on both web and native — no proxy needed. (An earlier same-origin proxy
 * attempt for Non CTC Expense was reverted: it broke the app's own
 * client-side router, which reads the browser's real URL and doesn't
 * recognize being served under /apps/expense — a proxy can rewrite what the
 * server fetches, but not what the browser believes its own address is.)
 *
 * The hub's own address bar reflects which app you're viewing via React
 * Navigation's linking config (see App.tsx) — that's the routing to show,
 * independent of each iframe's own real URL.
 */
export const EMBEDDED_APP_URLS: Record<string, string> = {
  hr: 'https://main.d24jo2310130zc.amplifyapp.com', // Dispatch Tracker
  finance: 'https://main.due5mcy3my82.amplifyapp.com', // RC Portal
  inventory: 'https://mould.emamiapps.in', // MoldHealthCheck
  expense: 'https://non-ctc-expense.onrender.com/zexpense/', // Non CTC Expense
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
];

export const CURRENT_USER = {
  name: 'Riya Sen',
  email: 'r.sen@emamigroup.com',
};

export function appById(id: string) {
  return APPS.find((a) => a.id === id);
}

export const topUsedAppId = APPS.reduce((a, b) => (b.uses > a.uses ? b : a)).id;
