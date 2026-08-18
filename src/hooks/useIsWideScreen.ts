import { useWindowDimensions } from 'react-native';

const WIDE_BREAKPOINT = 768;

export function useIsWideScreen() {
  const { width } = useWindowDimensions();
  return width >= WIDE_BREAKPOINT;
}
