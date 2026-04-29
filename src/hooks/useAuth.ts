import { useEffect, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { professionalsStore } from '@/lib/storage';
import type { Professional } from '@/lib/storage';

const STORAGE_KEY = 'vistec_logged_professional_id';

/**
 * "Login" sem senha: o usuário é um Professional cadastrado.
 * - Persiste o ID em localStorage
 * - Recupera o registro completo via React Query
 * - login(id), logout()
 */
export function useAuth() {
  const [loggedId, setLoggedId] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
  );

  // Sincroniza entre abas
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setLoggedId(e.newValue);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const { data: professionals = [] } = useQuery({
    queryKey: ['professionals'],
    queryFn: () => professionalsStore.getAll(),
    staleTime: 60_000,
  });

  const user: Professional | null =
    (loggedId && professionals.find(p => p.id === loggedId)) || null;

  const login = useCallback((id: string) => {
    localStorage.setItem(STORAGE_KEY, id);
    setLoggedId(id);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setLoggedId(null);
  }, []);

  return {
    user,
    loggedId,
    isAuthenticated: !!user,
    isLoading: !!loggedId && professionals.length === 0,
    professionals,
    login,
    logout,
  };
}
