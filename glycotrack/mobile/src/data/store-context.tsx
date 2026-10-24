import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from 'react';

import type { AppData, Recipe } from '@/domain/types';

import { containsDemoData } from './schema';
import { AppStore, type StoreState } from './store';

const StoreContext = createContext<AppStore | null>(null);

export function StoreProvider({ store, children }: { store: AppStore; children: ReactNode }) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): AppStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside <StoreProvider>');
  return store;
}

export function useStoreState(): StoreState {
  const store = useStore();
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}

/**
 * Subscribe to a slice of app data. The selector must return an existing reference
 * (e.g. `d => d.glucose`), not a newly built object; derive with useMemo instead.
 */
export function useAppData<T>(selector: (data: AppData) => T): T {
  const store = useStore();
  const get = () => selector(store.getState().data);
  return useSyncExternalStore(store.subscribe, get, get);
}

export function useSettings() {
  return useAppData((d) => d.settings);
}

export function useRecipesById(): Map<string, Recipe> {
  const recipes = useAppData((d) => d.recipes);
  return useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);
}

export function useHasDemoData(): boolean {
  const data = useAppData((d) => d);
  return useMemo(() => containsDemoData(data), [data]);
}
