// "Amber Twilight" design tokens — shared across the whole app.
export const colors = {
  amber: '#E39A48',
  rust: '#B8543F',
  plum: '#3D2545',
  plumDeep: '#2C1A32',
  cream: '#F8EBD9',
  cream2: '#FBF5EA',
  ink: '#2A1E22',
  inkSoft: '#6B5A5E',
  border: '#E7D9C4',
  white: '#FFFFFF',
  green: '#1F7A4D',
  greenTint: '#1F7A4D17',
  greenBorder: '#1F7A4D33',
} as const;

export const categoryColors: Record<string, string> = {
  Finance: '#7A2E20',
  People: '#20111F',
  Operations: '#7A4713',
  Sales: '#5C3D0A',
  Insights: '#451D33',
};

export function catColor(cat: string) {
  return categoryColors[cat] ?? colors.rust;
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
