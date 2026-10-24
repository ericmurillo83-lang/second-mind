/* global jest */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Screens are tested in isolation; real navigation is covered by the browser E2E suite (e2e/).
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    dismissTo: jest.fn(),
    canGoBack: jest.fn(() => true),
  },
  useLocalSearchParams: jest.fn(() => ({})),
  Stack: { Screen: () => null },
}));

// Screens derive "today", due doses and relative labels from the clock. Pin Date (only Date)
// to a fixed Saturday afternoon so tests are deterministic regardless of when they run.
jest.useFakeTimers({
  now: new Date(2026, 9, 24, 15, 0, 0),
  doNotFake: [
    'hrtime',
    'nextTick',
    'performance',
    'queueMicrotask',
    'requestAnimationFrame',
    'cancelAnimationFrame',
    'requestIdleCallback',
    'cancelIdleCallback',
    'setImmediate',
    'clearImmediate',
    'setInterval',
    'clearInterval',
    'setTimeout',
    'clearTimeout',
  ],
});
