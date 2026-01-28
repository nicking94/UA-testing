// hooks/useDailyCashApi.ts
import { useState, useCallback } from 'react';
import { dailyCashApi } from '@/app/lib/api/daily-cash';
import { DailyCash } from '@/app/lib/types/types';
export const useDailyCashApi = () => {
  const [dailyCashes, setDailyCashes] = useState<DailyCash[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchDailyCashes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await dailyCashApi.getAll();
      setDailyCashes(data);
      return data;
    } catch (err: unknown) {
      const errorMessage = (err as Error).message || 'Error al cargar cajas diarias';
      setError(errorMessage);
      console.error('Error fetching daily cashes:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  const getByDate = useCallback(async (date: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await dailyCashApi.getByDate(date);
      return data;
    } catch (err: unknown) {
      const errorMessage = (err as Error).message || 'Error al cargar caja diaria';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);
  const addDailyCash = useCallback(
    async (dailyCash: Omit<DailyCash, 'id'>) => {
      setLoading(true);
      setError(null);
      try {
        const newDailyCash = await dailyCashApi.create(dailyCash);
        setDailyCashes((prev) => [...prev, newDailyCash]);
        return newDailyCash;
      } catch (err: unknown) {
        const errorMessage = (err as Error).message || 'Error al crear caja diaria';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );
  const updateDailyCash = useCallback(
    async (id: number, updates: Partial<DailyCash>) => {
      setLoading(true);
      setError(null);
      try {
        const updated = await dailyCashApi.update(id, updates);
        setDailyCashes((prev) =>
          prev.map((dc) => (dc.id === id ? updated : dc))
        );
        return updated;
      } catch (err: unknown) {
        const errorMessage = (err as Error).message || 'Error al actualizar caja diaria';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );
  const closeDailyCash = useCallback(
    async (
      id: number,
      data: {
        closingAmount?: number;
        closingDifference?: number;
        closedBy?: string;
        comments?: string;
        otherIncome?: number;
      }
    ) => {
      setLoading(true);
      setError(null);
      try {
        const updated = await dailyCashApi.close(id, data);
        setDailyCashes((prev) =>
          prev.map((dc) => (dc.id === id ? updated : dc))
        );
        return updated;
      } catch (err: unknown) {
        const errorMessage = (err as Error).message || 'Error al cerrar caja diaria';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );
  return {
    dailyCashes,
    loading,
    error,
    fetchDailyCashes,
    getByDate,
    addDailyCash,
    updateDailyCash,
    closeDailyCash,
    setDailyCashes,
  };
};
