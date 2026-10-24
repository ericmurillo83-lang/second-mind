import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Minimal key-value persistence boundary. The app only talks to this interface, so the
 * backing store can move to SQLite/SQLCipher (see docs/ARCHITECTURE.md) without touching UI code.
 */
export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export const DATA_KEY = 'glycotrack.appdata';
export const BACKUP_KEY_PREFIX = 'glycotrack.appdata.backup.';

export const asyncStorageAdapter: StorageAdapter = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};

export function createMemoryAdapter(initial: Record<string, string> = {}): StorageAdapter & {
  dump(): Record<string, string>;
} {
  const map = new Map(Object.entries(initial));
  return {
    getItem: async (key) => map.get(key) ?? null,
    setItem: async (key, value) => {
      map.set(key, value);
    },
    removeItem: async (key) => {
      map.delete(key);
    },
    dump: () => Object.fromEntries(map),
  };
}
