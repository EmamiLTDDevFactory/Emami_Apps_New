import { useWindowDimensions } from 'react-native';

// Breakpoints for the app-launcher grid specifically. Kept separate from
// useIsWideScreen (which drives the drawer mode) since that hook's single
// 768px breakpoint is a different concern with its own consumers.
const MEDIUM_BREAKPOINT = 480;
const WIDE_BREAKPOINT = 1024;

export function useColumnCount() {
  const { width } = useWindowDimensions();
  if (width >= WIDE_BREAKPOINT) return 4;
  if (width >= MEDIUM_BREAKPOINT) return 3;
  return 2;
}
