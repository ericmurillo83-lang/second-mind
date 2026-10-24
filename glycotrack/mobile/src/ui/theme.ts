import { Platform } from 'react-native';

/**
 * GlycoTrack design tokens.
 *
 * Text/background pairs are chosen to meet WCAG 2.2 AA (4.5:1 for body text). Glucose range
 * colors are always paired with a text label and icon so meaning never relies on color alone.
 */

export interface Palette {
  background: string;
  surface: string;
  surfaceRaised: string;
  surfaceMuted: string;
  border: string;
  borderStrong: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  textOnPrimary: string;
  primary: string;
  primaryPressed: string;
  primarySoft: string;
  primaryText: string;
  accent: string;
  accentSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  inRange: string;
  inRangeSoft: string;
  below: string;
  belowSoft: string;
  above: string;
  aboveSoft: string;
  targetBand: string;
  chartLine: string;
  chartGrid: string;
  demo: string;
  demoSoft: string;
  overlay: string;
  shadow: string;
}

export const lightPalette: Palette = {
  background: '#F4F6FA',
  surface: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  surfaceMuted: '#EDF0F6',
  border: '#E2E6EE',
  borderStrong: '#C9D0DC',
  text: '#0D1424',
  textSecondary: '#4D576A',
  textTertiary: '#667085',
  textOnPrimary: '#FFFFFF',
  primary: '#3451D1',
  primaryPressed: '#2A43B0',
  primarySoft: '#E8ECFC',
  primaryText: '#2D47C2',
  accent: '#0B8579',
  accentSoft: '#E0F4F1',
  success: '#147A46',
  successSoft: '#E2F4EA',
  warning: '#A15C07',
  warningSoft: '#FDF1DE',
  danger: '#B42318',
  dangerSoft: '#FDECEA',
  inRange: '#147A46',
  inRangeSoft: '#E2F4EA',
  below: '#B42318',
  belowSoft: '#FDECEA',
  above: '#A15C07',
  aboveSoft: '#FDF1DE',
  targetBand: 'rgba(20, 122, 70, 0.10)',
  chartLine: '#3451D1',
  chartGrid: '#E2E6EE',
  demo: '#6941C6',
  demoSoft: '#F1ECFD',
  overlay: 'rgba(13, 20, 36, 0.45)',
  shadow: '#0D1424',
};

export const darkPalette: Palette = {
  background: '#0A0E17',
  surface: '#131926',
  surfaceRaised: '#1A2132',
  surfaceMuted: '#1C2333',
  border: '#262F42',
  borderStrong: '#36415A',
  text: '#F3F5F9',
  textSecondary: '#B1B9C9',
  textTertiary: '#8D97AA',
  textOnPrimary: '#0A0E17',
  primary: '#8EA2FF',
  primaryPressed: '#7186F0',
  primarySoft: '#1E2747',
  primaryText: '#A5B5FF',
  accent: '#3FD0BD',
  accentSoft: '#11302E',
  success: '#4ADE94',
  successSoft: '#10301F',
  warning: '#F7B955',
  warningSoft: '#33240E',
  danger: '#FF8A80',
  dangerSoft: '#3A1513',
  inRange: '#4ADE94',
  inRangeSoft: '#10301F',
  below: '#FF8A80',
  belowSoft: '#3A1513',
  above: '#F7B955',
  aboveSoft: '#33240E',
  targetBand: 'rgba(74, 222, 148, 0.10)',
  chartLine: '#8EA2FF',
  chartGrid: '#262F42',
  demo: '#C3B1FF',
  demoSoft: '#271E43',
  overlay: 'rgba(0, 0, 0, 0.6)',
  shadow: '#000000',
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

/** Minimum touch target (Apple HIG 44pt, Material 48dp). */
export const MIN_TOUCH = 48;
export const MAX_CONTENT_WIDTH = 720;

export const fontFamily = Platform.select({
  ios: { regular: 'System', rounded: 'ui-rounded' },
  web: { regular: 'var(--font-display)', rounded: 'var(--font-rounded)' },
  default: { regular: 'sans-serif', rounded: 'sans-serif' },
});

export const typography = {
  display: { fontSize: 56, lineHeight: 60, fontWeight: '700' as const, letterSpacing: -1.5 },
  largeTitle: { fontSize: 32, lineHeight: 38, fontWeight: '700' as const, letterSpacing: -0.6 },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700' as const, letterSpacing: -0.3 },
  title2: { fontSize: 20, lineHeight: 26, fontWeight: '600' as const, letterSpacing: -0.2 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' as const },
  body: { fontSize: 16, lineHeight: 23, fontWeight: '400' as const },
  bodyStrong: { fontSize: 16, lineHeight: 23, fontWeight: '600' as const },
  callout: { fontSize: 15, lineHeight: 21, fontWeight: '400' as const },
  subhead: { fontSize: 14, lineHeight: 19, fontWeight: '500' as const },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const, letterSpacing: 0.2 },
  overline: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700' as const,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
} as const;

export type TypographyVariant = keyof typeof typography;

export function elevation(palette: Palette, level: 1 | 2 = 1) {
  return Platform.select({
    web: {
      boxShadow:
        level === 1
          ? `0 1px 2px ${hexA(palette.shadow, 0.06)}, 0 4px 14px ${hexA(palette.shadow, 0.05)}`
          : `0 2px 6px ${hexA(palette.shadow, 0.08)}, 0 12px 32px ${hexA(palette.shadow, 0.10)}`,
    },
    default: {
      shadowColor: palette.shadow,
      shadowOpacity: level === 1 ? 0.06 : 0.12,
      shadowRadius: level === 1 ? 10 : 24,
      shadowOffset: { width: 0, height: level === 1 ? 3 : 10 },
      elevation: level === 1 ? 2 : 6,
    },
  });
}

/** "#RRGGBB" + alpha → rgba() string. */
export function hexA(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
