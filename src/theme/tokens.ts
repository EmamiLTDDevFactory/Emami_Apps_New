// "Emami HUB" design tokens — shared across the whole app.
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
