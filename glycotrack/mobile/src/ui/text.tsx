import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import type { Palette, TypographyVariant } from './theme';
import { fontFamily, typography } from './theme';
import { useTheme } from './theme-context';

export type TextColor = keyof Pick<
  Palette,
  | 'text'
  | 'textSecondary'
  | 'textTertiary'
  | 'textOnPrimary'
  | 'primaryText'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'inRange'
  | 'below'
  | 'above'
  | 'demo'
>;

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  color?: TextColor;
  align?: 'left' | 'center' | 'right';
  /** Use tabular figures so numbers don't jitter as they change. */
  numeric?: boolean;
}

/**
 * Themed text. Respects the system font size (Dynamic Type / font scale); very large
 * display numerals are capped so layouts stay usable at the largest accessibility sizes.
 */
export function Text({
  variant = 'body',
  color = 'text',
  align,
  numeric,
  style,
  maxFontSizeMultiplier,
  ...rest
}: TextProps) {
  const { colors } = useTheme();
  const isDisplay = variant === 'display' || variant === 'largeTitle';
  return (
    <RNText
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? (isDisplay ? 1.6 : 2.4)}
      style={[
        typography[variant],
        { color: colors[color], fontFamily: isDisplay ? fontFamily.rounded : fontFamily.regular },
        align && { textAlign: align },
        numeric && { fontVariant: ['tabular-nums'] },
        style,
      ]}
      {...rest}
    />
  );
}
