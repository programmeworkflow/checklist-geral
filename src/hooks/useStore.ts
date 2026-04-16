import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { CrudStore } from '@/lib/storage';

export function useStore<T extends { id: string }>(
  store: CrudStore<T>,
  queryKey?: string
) {
  const key = queryKey || store.table;
  const qc = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: [key],
    queryFn: () => store.getAll(),
    staleTime: 30_000, // 30s cache
  });

  const addMut = useMutation({
    mutationFn: (item: Omit<T, 'id'>) => store.add(item),
    onSuccess: () => qc.invalidateQueries({ queryKey: [key] }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<T> }) => store.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [key] }),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => store.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [key] }),
  });

  return {
    items,
    isLoading,
    add: (item: Omit<T, 'id'>) => addMut.mutateAsync(item),
    update: (id: string, data: Partial<T>) => updateMut.mutateAsync({ id, data }),
    remove: (id: string) => removeMut.mutateAsync(id),
    refresh: () => qc.invalidateQueries({ queryKey: [key] }),
  };
}
