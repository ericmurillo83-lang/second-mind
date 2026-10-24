/* global beforeEach, afterEach, jest */
// Keep tests order-independent: reset route params and restore spies between tests.
beforeEach(() => {
  require('expo-router').useLocalSearchParams.mockReturnValue({});
});
afterEach(() => {
  jest.restoreAllMocks();
});
