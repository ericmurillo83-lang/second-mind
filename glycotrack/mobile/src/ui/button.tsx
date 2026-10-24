import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { Icon, type IconName } from './icon';
import { Text } from './text';
import { MIN_TOUCH, radius, spacing } from './theme';
import { useTheme } from './theme-context';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'soft';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  size?: 'md' | 'sm';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  accessibilityHint?: string;
  testID?: string;
  style?: ViewStyle;
}

export function tapFeedback() {
  if (Platform.OS !== 'web') void Haptics.selectionAsync().catch(() => undefined);
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  size = 'md',
  disabled,
  loading,
  fullWidth,
  accessibilityHint,
  testID,
  style,
}: ButtonProps) {
  const { colors } = useTheme();
  const palette = {
    primary: { bg: colors.primary, pressed: colors.primaryPressed, fg: colors.textOnPrimary, border: 'transparent' },
    secondary: { bg: colors.surface, pressed: colors.surfaceMuted, fg: colors.text, border: colors.borderStrong },
    soft: { bg: colors.primarySoft, pressed: colors.border, fg: colors.primaryText, border: 'transparent' },
    ghost: { bg: 'transparent', pressed: colors.surfaceMuted, fg: colors.primaryText, border: 'transparent' },
    destructive: { bg: colors.dangerSoft, pressed: colors.border, fg: colors.danger, border: 'transparent' },
  }[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        {
          backgroundColor: pressed ? palette.pressed : palette.bg,
          borderColor: palette.border,
          opacity: inactive ? 0.5 : 1,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={styles.content}>
          {icon && <Icon name={icon} size={size === 'sm' ? 16 : 19} color={palette.fg} />}
          <Text variant={size === 'sm' ? 'subhead' : 'bodyStrong'} style={{ color: palette.fg, fontWeight: '600' }}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export interface IconButtonProps {
  icon: IconName;
  label: string;
  onPress: () => void;
  variant?: 'plain' | 'filled' | 'tinted';
  size?: number;
  testID?: string;
}

/** Icon-only button with a full-size touch target and a required screen-reader label. */
export function IconButton({ icon, label, onPress, variant = 'tinted', size = 20, testID }: IconButtonProps) {
  const { colors } = useTheme();
  const bg = { plain: 'transparent', filled: colors.primary, tinted: colors.surface }[variant];
  const fg = { plain: colors.text, filled: colors.textOnPrimary, tinted: colors.text }[variant];
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      style={({ pressed }) => [
        styles.iconButton,
        {
          backgroundColor: pressed ? colors.surfaceMuted : bg,
          borderColor: variant === 'tinted' ? colors.border : 'transparent',
        },
      ]}>
      <Icon name={icon} size={size} color={fg} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  md: { minHeight: MIN_TOUCH + 4, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  sm: { minHeight: 40, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  fullWidth: { alignSelf: 'stretch' },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap', justifyContent: 'center' },
  iconButton: {
    width: MIN_TOUCH - 4,
    height: MIN_TOUCH - 4,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
