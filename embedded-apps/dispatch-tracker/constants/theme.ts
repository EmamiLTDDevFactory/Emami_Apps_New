/**
 * Design tokens ported 1:1 from streamlit_app/main_panel.py's :root CSS
 * custom properties and the additional literal hex values documented in
 * the extraction spec. Keep these exact — every screen in the original
 * Streamlit app is built from this same palette.
 */

export const colors = {
  navy: '#1E3A7B',
  navyDk: '#16306A',
  navyLt: '#EEF3FF',
  navyBd: '#C7D7FD',

  green: '#16A34A',
  greenLt: '#F0FDF4',
  greenBd: '#BBF7D0',
  greenDk: '#15803D',

  red: '#DC2626',
  redLt: '#FEF2F2',
  redBd: '#FECACA',
  redDk: '#B91C1C',

  amber: '#D97706',
  amberLt: '#FFFBEB',
  amberBd: '#FDE68A',
  amberDk: '#92400E',

  teal: '#1a7a7a',
  tealLt: '#E0F2F1',

  purple: '#7C3AED',
  purpleLt: '#F5F3FF',
  purpleBd: '#DDD6FE',
  purpleDk: '#6D28D9',

  blue: '#2563EB',
  blueLt: '#EFF6FF',
  blueBd: '#BFDBFE',
  blueDk: '#1D4ED8',
  blueDeep: '#1E40AF',

  gray: '#6B7280',

  g50: '#F8FAFC',
  g100: '#F1F5F9',
  g200: '#E2E8F0',
  g300: '#CBD5E1',
  g400: '#94A3B8',
  g500: '#64748B',
  g700: '#374151',
  g900: '#0F172A',

  nearBlack: '#111827',
  bg: '#EEF1F6',
  surface: '#FFFFFF',

  gsvOrange: '#F57F17',
  casesSlate: '#546E7A',
  valueAmber: '#B45309',
  valueGold: '#d29922',
  cancelledPink: '#FEF9F9',
  dispatchedRowHighlight: '#DBEAFE',
  pendingFuture: '#1E3A7B', // Pending tab: navy for future EDD (unlike other tabs)
} as const;

/** Icon accent -> background tint, from _kpi()'s icon->tint map. */
export const kpiTint: Record<string, string> = {
  [colors.navy]: colors.navyLt,
  [colors.green]: colors.greenLt,
  [colors.red]: colors.redLt,
  [colors.amber]: colors.amberLt,
  [colors.purple]: colors.purpleLt,
  [colors.teal]: colors.tealLt,
  [colors.gray]: colors.g100,
};

export const statusBadge = {
  pending: { bg: colors.amberLt, border: colors.amberBd, text: colors.amberDk },
  dispatched: { bg: colors.blueLt, border: colors.blueBd, text: colors.blueDk },
  delivered: { bg: colors.greenLt, border: colors.greenBd, text: colors.greenDk },
  returned: { bg: colors.purpleLt, border: colors.purpleBd, text: colors.purpleDk },
  cancelled: { bg: colors.redLt, border: colors.redBd, text: colors.redDk },
  inTransit: { bg: colors.blueLt, border: colors.blueBd, text: colors.blueDeep },
} as const;

export const podBadge = {
  verified: { bg: colors.greenLt, border: colors.greenBd, text: colors.greenDk },
  manual: { bg: colors.amberLt, border: colors.amberBd, text: colors.amberDk },
  rejected: { bg: colors.redLt, border: colors.redBd, text: colors.redDk },
  pending: { bg: colors.g100, border: colors.g300, text: colors.g500 },
  uploaded: { bg: colors.navyLt, border: colors.navyBd, text: colors.navy },
} as const;

export const radius = { sm: 6, md: 8, lg: 12 } as const;

export const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 8,
  },
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;

export const typography = {
  fontFamily: undefined, // Inter isn't bundled; falls back to system font (see AGENTS.md note on fonts)
  microLabel: { fontSize: 9, fontWeight: '700' as const, letterSpacing: 0.7, textTransform: 'uppercase' as const },
  body: { fontSize: 12 },
  kpiValue: { fontSize: 20, fontWeight: '900' as const, letterSpacing: -0.5 },
  sectionTitle: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 1, textTransform: 'uppercase' as const },
};

/** SLA delay bucket labels, canonical 6-tier scale from the HQ dashboard. */
export const slaBuckets = [
  { label: 'On Time / Early', test: (d: number) => d <= 0 },
  { label: '1 Day Beyond SLA', test: (d: number) => d === 1 },
  { label: '2 Days Beyond SLA', test: (d: number) => d === 2 },
  { label: '3 Days Beyond SLA', test: (d: number) => d === 3 },
  { label: '4 Days Beyond SLA', test: (d: number) => d === 4 },
  { label: 'Above 4 Days Beyond SLA', test: (d: number) => d >= 5 },
] as const;

/** Rank-based green->amber->red gradient used for the Best/Worst Depot delay bar. */
export function rankColor(i: number, n: number): string {
  if (n <= 1) return colors.green;
  const t = i / (n - 1);
  let r: number, g: number, b: number;
  if (t < 0.33) {
    r = 22 + Math.round((234 - 22) * (t / 0.33));
    g = 163 - Math.round((163 - 130) * (t / 0.33));
    b = 74 - Math.round((74 - 12) * (t / 0.33));
  } else if (t < 0.66) {
    const s = (t - 0.33) / 0.33;
    r = 234 + Math.round((234 - 220) * s);
    g = 130 - Math.round((130 - 88) * s);
    b = 12 + Math.round((12 - 36) * s);
  } else {
    const s = (t - 0.66) / 0.34;
    r = 220 + Math.round((220 - 185) * s);
    g = 88 - Math.round((88 - 28) * s);
    b = 36 - Math.round((36 - 25) * s);
  }
  return `rgb(${r},${g},${b})`;
}
