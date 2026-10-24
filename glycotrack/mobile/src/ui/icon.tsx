import type { AndroidSymbol } from 'expo-symbols';
import { SymbolView } from 'expo-symbols';
import type { ColorValue } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

import { useTheme } from './theme-context';

/** Semantic icon names → SF Symbols (iOS) and Material Symbols (Android + web). */
export const ICONS = {
  home: { ios: 'house.fill', android: 'home' },
  glucose: { ios: 'drop.fill', android: 'water_drop' },
  meals: { ios: 'fork.knife', android: 'restaurant' },
  meds: { ios: 'pills.fill', android: 'medication' },
  care: { ios: 'stethoscope', android: 'stethoscope' },
  settings: { ios: 'gearshape.fill', android: 'settings' },
  plus: { ios: 'plus', android: 'add' },
  minus: { ios: 'minus', android: 'remove' },
  chevronRight: { ios: 'chevron.right', android: 'chevron_right' },
  chevronLeft: { ios: 'chevron.left', android: 'chevron_left' },
  close: { ios: 'xmark', android: 'close' },
  check: { ios: 'checkmark', android: 'check' },
  checkCircle: { ios: 'checkmark.circle.fill', android: 'check_circle' },
  circle: { ios: 'circle', android: 'radio_button_unchecked' },
  arrowUp: { ios: 'arrow.up', android: 'arrow_upward' },
  arrowDown: { ios: 'arrow.down', android: 'arrow_downward' },
  inRange: { ios: 'checkmark.circle.fill', android: 'check_circle' },
  calendar: { ios: 'calendar', android: 'calendar_month' },
  clock: { ios: 'clock', android: 'schedule' },
  bell: { ios: 'bell.fill', android: 'notifications' },
  bellOff: { ios: 'bell.slash', android: 'notifications_off' },
  lock: { ios: 'lock.fill', android: 'lock' },
  shield: { ios: 'checkmark.shield.fill', android: 'verified_user' },
  note: { ios: 'note.text', android: 'description' },
  lab: { ios: 'testtube.2', android: 'science' },
  location: { ios: 'mappin.and.ellipse', android: 'location_on' },
  person: { ios: 'person.crop.circle', android: 'account_circle' },
  search: { ios: 'magnifyingglass', android: 'search' },
  star: { ios: 'star.fill', android: 'star' },
  starOutline: { ios: 'star', android: 'star_outline' },
  trash: { ios: 'trash', android: 'delete' },
  share: { ios: 'square.and.arrow.up', android: 'ios_share' },
  info: { ios: 'info.circle', android: 'info' },
  warning: { ios: 'exclamationmark.triangle.fill', android: 'warning' },
  sparkles: { ios: 'sparkles', android: 'auto_awesome' },
  chart: { ios: 'chart.xyaxis.line', android: 'show_chart' },
  edit: { ios: 'pencil', android: 'edit' },
  skip: { ios: 'forward.end', android: 'skip_next' },
  undo: { ios: 'arrow.uturn.backward', android: 'undo' },
  moon: { ios: 'moon.fill', android: 'dark_mode' },
  sun: { ios: 'sun.max.fill', android: 'light_mode' },
  timer: { ios: 'timer', android: 'timer' },
  faceid: { ios: 'faceid', android: 'fingerprint' },
  refill: { ios: 'arrow.clockwise', android: 'refresh' },
  book: { ios: 'book.closed.fill', android: 'menu_book' },
  video: { ios: 'video.fill', android: 'videocam' },
  carbs: { ios: 'leaf.fill', android: 'eco' },
  heart: { ios: 'heart.text.square.fill', android: 'monitor_heart' },
  device: { ios: 'iphone', android: 'smartphone' },
  eyeOff: { ios: 'eye.slash', android: 'visibility_off' },
  logout: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout' },
  link: { ios: 'link', android: 'link' },
} as const satisfies Record<string, { ios: SFSymbol; android: AndroidSymbol }>;

export type IconName = keyof typeof ICONS;

export interface IconProps {
  name: IconName;
  size?: number;
  color?: ColorValue;
}

/** Decorative by default: always pair with visible text or an accessibilityLabel on the parent. */
export function Icon({ name, size = 22, color }: IconProps) {
  const { colors } = useTheme();
  const def = ICONS[name];
  return (
    <SymbolView
      name={{ ios: def.ios, android: def.android, web: def.android }}
      size={size}
      tintColor={color ?? colors.text}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      aria-hidden
    />
  );
}
