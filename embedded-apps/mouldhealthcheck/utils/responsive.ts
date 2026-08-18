import { useMemo } from "react";
import { PixelRatio, useWindowDimensions } from "react-native";

/**
 * Breakpoints match the ad-hoc `width >= 768` checks already scattered across
 * statistics.tsx / admindashboard.tsx / GeoMap3D.tsx, so migrating those call
 * sites to useBreakpoint() doesn't shift any existing layout's flip-point.
 */
export const BREAKPOINTS = {
  tablet: 768,
  laptop: 1024,
} as const;

export type Breakpoint = "phone" | "tablet" | "laptop";

export type ResponsiveInfo = {
  width: number;
  height: number;
  isPhone: boolean;
  isTablet: boolean;
  isLaptop: boolean;
  /** True for tablet width and up (>= 768) — convenience for the common binary check. */
  isTabletUp: boolean;
  breakpoint: Breakpoint;
};

function breakpointFor(width: number): Breakpoint {
  if (width >= BREAKPOINTS.laptop) return "laptop";
  if (width >= BREAKPOINTS.tablet) return "tablet";
  return "phone";
}

/** Reactive replacement for the repeated `useWindowDimensions()` + manual `width >= 768` pattern. */
export function useBreakpoint(): ResponsiveInfo {
  const { width, height } = useWindowDimensions();
  return useMemo(() => {
    const breakpoint = breakpointFor(width);
    return {
      width,
      height,
      isPhone: breakpoint === "phone",
      isTablet: breakpoint === "tablet",
      isLaptop: breakpoint === "laptop",
      isTabletUp: width >= BREAKPOINTS.tablet,
      breakpoint,
    };
  }, [width, height]);
}

/** Pick a value per breakpoint, e.g. useResponsiveValue({ phone: 1, tablet: 2, laptop: 3 }). */
export function useResponsiveValue<T>(map: { phone: T; tablet: T; laptop: T }): T {
  const { breakpoint } = useBreakpoint();
  return map[breakpoint];
}

const GUIDELINE_BASE_WIDTH = 375;
const GUIDELINE_BASE_HEIGHT = 812;

/**
 * Reactive counterparts to utils/styling.ts's scale()/verticalScale(), which
 * are frozen at whatever window size existed when the app first loaded (a
 * module-level `Dimensions.get`). Opt in per call site where live resize/
 * rotation reactivity is actually wanted — existing scale()/verticalScale()
 * call sites are untouched and keep working exactly as before.
 */
export function useScale(size: number): number {
  const { width, height } = useWindowDimensions();
  const shorter = Math.min(width, height);
  return Math.round(PixelRatio.roundToNearestPixel((shorter / GUIDELINE_BASE_WIDTH) * size));
}

export function useVerticalScale(size: number): number {
  const { width, height } = useWindowDimensions();
  const longer = Math.max(width, height);
  return Math.round(PixelRatio.roundToNearestPixel((longer / GUIDELINE_BASE_HEIGHT) * size));
}
