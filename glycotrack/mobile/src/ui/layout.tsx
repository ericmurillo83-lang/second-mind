import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tapFeedback } from './button';
import { Icon, type IconName } from './icon';
import { Text } from './text';
import { elevation, MAX_CONTENT_WIDTH, MIN_TOUCH, radius, spacing } from './theme';
import { useTheme } from './theme-context';

/** Bottom padding so content clears the tab bar on every platform. */
export const TAB_BAR_CLEARANCE = Platform.select({ ios: 96, android: 104, default: 112 });

export interface ScreenProps {
  title: string;
  subtitle?: string;
  /** Small label above the title (e.g. today's date). */
  eyebrow?: string;
  headerRight?: ReactNode;
  children: ReactNode;
  /** True for top-level tab screens (adds safe-area top inset + tab bar clearance). */
  tab?: boolean;
  testID?: string;
}

/** Scrollable page with a large, accessible title header. */
export function Screen({ title, subtitle, eyebrow, headerRight, children, tab = true, testID }: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      testID={testID}
      style={{ flex: 1, backgroundColor: colors.background }}
      contentInsetAdjustmentBehavior="never"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingTop: (tab ? insets.top : 0) + spacing.lg,
          paddingBottom: (tab ? TAB_BAR_CLEARANCE : spacing.huge) + insets.bottom,
        },
      ]}>
      <View style={styles.column}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            {eyebrow ? (
              <Text variant="overline" color="textSecondary">
                {eyebrow}
              </Text>
            ) : null}
            <Text variant="largeTitle" accessibilityRole="header">
              {title}
            </Text>
            {subtitle ? (
              <Text variant="callout" color="textSecondary">
                {subtitle}
              </Text>
            ) : null}
          </View>
          {headerRight ? <View style={styles.headerRight}>{headerRight}</View> : null}
        </View>
        {children}
      </View>
    </ScrollView>
  );
}

/** Form page used by modal editors: keyboard-aware scroll body with a pinned action footer. */
export function FormScreen({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scrollContent, { paddingTop: spacing.lg, paddingBottom: spacing.xxxl }]}>
        <View style={[styles.column, { gap: spacing.xl }]}>{children}</View>
      </ScrollView>
      {footer ? (
        <View
          style={[
            styles.footer,
            { borderTopColor: colors.border, backgroundColor: colors.surface, paddingBottom: insets.bottom + spacing.md },
          ]}>
          <View style={[styles.column, styles.footerRow]}>{footer}</View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

export function Card({
  children,
  style,
  padded = true,
  tone = 'default',
  testID,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  tone?: 'default' | 'muted' | 'primary';
  testID?: string;
}) {
  const { colors } = useTheme();
  const bg = { default: colors.surface, muted: colors.surfaceMuted, primary: colors.primary }[tone];
  return (
    <View
      testID={testID}
      style={[
        styles.card,
        { backgroundColor: bg, borderColor: tone === 'default' ? colors.border : 'transparent' },
        tone === 'default' && elevation(colors, 1),
        padded && styles.cardPadded,
        style,
      ]}>
      {children}
    </View>
  );
}

export function Section({
  title,
  action,
  children,
  testID,
}: {
  title: string;
  action?: { label: string; onPress: () => void };
  children: ReactNode;
  testID?: string;
}) {
  return (
    <View style={styles.section} testID={testID}>
      <View style={styles.sectionHeader}>
        <Text variant="title2" accessibilityRole="header" style={{ flexShrink: 1 }}>
          {title}
        </Text>
        {action ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={action.label}
            onPress={action.onPress}
            hitSlop={12}
            style={styles.sectionAction}>
            <Text variant="subhead" color="primaryText" style={{ fontWeight: '600' }}>
              {action.label}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export interface ListRowProps {
  title: string;
  subtitle?: string;
  detail?: string;
  icon?: IconName;
  iconColor?: string;
  iconBackground?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  showChevron?: boolean;
  testID?: string;
}

/** A tappable (or static) row with an optional leading icon tile. */
export function ListRow({
  title,
  subtitle,
  detail,
  icon,
  iconColor,
  iconBackground,
  leading,
  trailing,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  showChevron = !!onPress,
  testID,
}: ListRowProps) {
  const { colors } = useTheme();
  const content = (
    <>
      {leading ??
        (icon ? (
          <View style={[styles.iconTile, { backgroundColor: iconBackground ?? colors.primarySoft }]}>
            <Icon name={icon} size={19} color={iconColor ?? colors.primaryText} />
          </View>
        ) : null)}
      <View style={styles.rowText}>
        <Text variant="bodyStrong" numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="footnote" color="textSecondary" numberOfLines={3}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {detail ? (
        <Text variant="subhead" color="textSecondary" numeric style={styles.rowDetail}>
          {detail}
        </Text>
      ) : null}
      {trailing}
      {showChevron ? <Icon name="chevronRight" size={14} color={colors.textTertiary} /> : null}
    </>
  );
  if (!onPress) {
    return (
      <View
        style={styles.row}
        testID={testID}
        accessible
        accessibilityLabel={accessibilityLabel ?? [title, subtitle, detail].filter(Boolean).join(', ')}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? [title, subtitle, detail].filter(Boolean).join(', ')}
      accessibilityHint={accessibilityHint}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceMuted }]}>
      {content}
    </Pressable>
  );
}

export function Divider({ inset = 0 }: { inset?: number }) {
  const { colors } = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: inset }} />;
}

/** Groups ListRows into a rounded card with hairline separators. */
export function ListGroup({ children, testID }: { children: ReactNode[] | ReactNode; testID?: string }) {
  const items = (Array.isArray(children) ? children : [children]).filter(Boolean);
  return (
    <Card padded={false} testID={testID} style={{ overflow: 'hidden' }}>
      {items.map((child, i) => (
        <View key={i}>
          {i > 0 && <Divider inset={spacing.lg} />}
          {child}
        </View>
      ))}
    </Card>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon: IconName;
  title: string;
  message: string;
  action?: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <Card style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.primarySoft }]}>
        <Icon name={icon} size={26} color={colors.primaryText} />
      </View>
      <Text variant="headline" align="center">
        {title}
      </Text>
      <Text variant="callout" color="textSecondary" align="center">
        {message}
      </Text>
      {action}
    </Card>
  );
}

export function Row({
  children,
  gap = spacing.md,
  wrap,
  style,
}: {
  children: ReactNode;
  gap?: number;
  wrap?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap, flexWrap: wrap ? 'wrap' : 'nowrap' }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: spacing.lg, alignItems: 'center' },
  column: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, gap: spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  headerText: { flex: 1, gap: spacing.xxs },
  headerRight: { flexDirection: 'row', gap: spacing.sm, paddingTop: spacing.xs },
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
  cardPadded: { padding: spacing.lg },
  section: { gap: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  sectionAction: { minHeight: MIN_TOUCH - 8, justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: MIN_TOUCH + 12,
  },
  rowText: { flex: 1, gap: 2 },
  rowDetail: { marginLeft: spacing.sm, textAlign: 'right' },
  iconTile: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.md, paddingHorizontal: spacing.lg, alignItems: 'center' },
  footerRow: { flexDirection: 'row', gap: spacing.md },
});
