import { useState, useCallback } from 'react';

export function useStore<T extends { id: string }>(store: {
  getAll: () => T[];
  add: (item: Omit<T, 'id'>) => T;
  update: (id: string, data: Partial<T>) => T;
  remove: (id: string) => void;
}) {
  const [items, setItems] = useState<T[]>(store.getAll());

  const refresh = useCallback(() => setItems(store.getAll()), [store]);

  const add = useCallback((item: Omit<T, 'id'>) => {
    const newItem = store.add(item);
    refresh();
    return newItem;
  }, [store, refresh]);

  const update = useCallback((id: string, data: Partial<T>) => {
    store.update(id, data);
    refresh();
  }, [store, refresh]);

  const remove = useCallback((id: string) => {
    store.remove(id);
    refresh();
  }, [store, refresh]);

  return { items, add, update, remove, refresh };
}
