// "Emami HUB" design tokens — shared across the whole app.
import { Easing, Platform } from 'react-native';

export const colors = {
  amber: '#F5A623', // reserved for the favorite star / "most used" accent only
  rust: '#4F3FD6', // primary indigo accent — buttons, active states, links
  rustDeep: '#3B2FB0', // deeper indigo — gradient stop, pressed states
  plum: '#241E3D', // deep indigo — dark surfaces (stack header, solid buttons)
  plumDeep: '#151129', // darkest indigo — gradient stops, text on light accents
  cream: '#F6F4FD', // near-white lavender tint
  cream2: '#F3F1FB', // page background
  ink: '#1F1B33', // primary text
  inkSoft: '#6B7280', // secondary/gray text
  border: '#E6E3F5', // hairline borders
  white: '#FFFFFF',
  green: '#1F7A4D',
  greenTint: '#1F7A4D17',
  greenBorder: '#1F7A4D33',
  // Hub-shell-only tokens (post-login screens). Deliberately separate from
  // cream2/plum above, which stay reserved for the Login screen's look —
  // changing these never touches Login.
  appBg: '#EEF0F4', // cool neutral page background, not lavender-tinted
  sidebar: '#14121F', // flat solid sidebar surface — no gradient
  sidebarBorder: '#2A2740',
  sidebarText: '#F2F0FA',
  sidebarTextSoft: '#9C97B8',
  sidebarActive: 'rgba(255,255,255,0.12)', // flat active-item highlight
} as const;

// The one signature accent gradient — used sparingly on primary actions and
// the active nav state only. Not the login page's rainbow; a single hue
// family (indigo -> violet) so it reads as a brand accent, not decoration.
export const gradients = {
  primary: ['#6D5BF5', colors.rust, colors.rustDeep] as const,
};

export const categoryColors: Record<string, string> = {
  Finance: '#5B4FE0',
  People: '#DB2777',
  Operations: '#0D9488',
  Sales: '#EA580C',
  Insights: '#7C3AED',
} as const;

// Distinct pastel accent per real app, so the 4 cards read like the
// reference dashboard's category grid instead of only 2 repeated hues.
export const appAccents: Record<string, string> = {
  expense: '#0D9488', // Non CTC Expense — teal
  finance: '#5B4FE0', // RC Portal — indigo
  hr: '#EA580C', // Dispatch Tracker — orange
  inventory: '#DB2777', // MoldHealthCheck — pink
};

export function catColor(cat: string) {
  return categoryColors[cat] ?? colors.rust;
}

export function appColor(id: string) {
  return appAccents[id] ?? colors.rust;
}

export const fonts = {
  sansRegular: 'IBMPlexSans_400Regular',
  sansMedium: 'IBMPlexSans_500Medium',
  sansSemiBold: 'IBMPlexSans_600SemiBold',
  sansBold: 'IBMPlexSans_700Bold',
  serifMedium: 'IBMPlexSerif_500Medium',
  serifSemiBold: 'IBMPlexSerif_600SemiBold',
} as const;

export const radii = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 14,
  xxl: 16,
  xxxl: 18,
  pill: 999,
};

export const spacing = (n: number) => n * 4;

// Consistent shadow presets, tinted with the brand's deep indigo (plumDeep)
// rather than neutral black — matches the precedent already set by
// DashboardHero/LoginScreen. Use these instead of ad hoc shadow objects.
export const shadows = {
  none: { shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
  sm: {
    shadowColor: colors.plumDeep,
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  md: {
    shadowColor: colors.plumDeep,
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  lg: {
    shadowColor: colors.plumDeep,
    shadowOpacity: 0.14,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  xl: {
    shadowColor: colors.plumDeep,
    shadowOpacity: 0.18,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 16 },
    elevation: 10,
  },
} as const;

// Motion tokens for the few components that animate (press/hover feedback).
// Keep durations short — this is feedback, not decoration.
export const motion = {
  duration: { fast: 120, base: 180, slow: 240 },
  easing: {
    standard: Easing.out(Easing.cubic),
    decelerate: Easing.out(Easing.quad),
  },
  pressScale: 0.97,
  hoverScale: 1.02,
  hoverLift: -2, // translateY on web hover, subtle lift
} as const;

// Named type scale — collapses the many near-duplicate inline font sizes
// (9, 10.5, 11, 11.5, 12, 12.5...) used across the app into a shared scale.
// Only newly-touched styles adopt this; existing hand-tuned literals
// elsewhere are left alone to avoid unrelated visual drift.
export const type = {
  xs: 10.5,
  sm: 12,
  base: 13.5,
  md: 14.5,
  lg: 16,
  xl: 18,
  xxl: 22,
  display: 46,
} as const;

// Web-only keyboard focus ring (indigo, matches the brand accent). No-op on
// native. Spread into a Pressable's style only when `focused` is true.
export const focusRingWeb =
  Platform.OS === 'web'
    ? ({
        outlineStyle: 'solid',
        outlineWidth: 2,
        outlineColor: colors.rust,
        outlineOffset: 2,
      } as const)
    : ({} as const);
