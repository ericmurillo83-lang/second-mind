import { Platform, type AccessibilityActionEvent, type ViewProps } from 'react-native';

/**
 * Props that make a container an "adjustable" control for VoiceOver/TalkBack (swipe up/down
 * to change the value). On web this role maps to a slider, which may not contain buttons, so
 * there the inner +/- buttons are exposed on their own instead.
 */
export function adjustableProps(options: {
  label: string;
  valueText: string;
  onIncrement: () => void;
  onDecrement: () => void;
}): ViewProps {
  if (Platform.OS === 'web') return {};
  return {
    accessible: true,
    accessibilityRole: 'adjustable',
    accessibilityLabel: options.label,
    accessibilityValue: { text: options.valueText },
    accessibilityActions: [{ name: 'increment' }, { name: 'decrement' }],
    onAccessibilityAction: (e: AccessibilityActionEvent) =>
      e.nativeEvent.actionName === 'increment' ? options.onIncrement() : options.onDecrement(),
  };
}
