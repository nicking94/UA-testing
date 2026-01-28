// hooks/useCustomersApi.ts
import { useState, useCallback } from 'react';
import { customersApi, CustomerFilters } from '@/app/lib/api/customers';
import { Customer, Sale } from '@/app/lib/types/types';
interface BackendCustomer extends Omit<Customer, 'purchaseHistory'> {
  sales?: Sale[];
}
export const useCustomersApi = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchCustomers = useCallback(async (filters?: CustomerFilters) => {
    setLoading(true);
    setError(null);
    try {
      const data = await customersApi.getAll(filters) as unknown as BackendCustomer[];
      const formattedCustomers = data.map((c: BackendCustomer) => ({
        ...c,
        purchaseHistory: c.sales || [],
        pendingBalance: c.pendingBalance || 0,
      })) as Customer[];
      setCustomers(formattedCustomers);
      return formattedCustomers;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar clientes';
      setError(errorMessage);
      console.error('Error fetching customers:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  const addCustomer = useCallback(
    async (customer: Omit<Customer, 'id' | 'purchaseHistory'>) => {
      setLoading(true);
      setError(null);
      try {
        const newCustomer = await customersApi.create(customer);
        const formattedCustomer = {
          ...newCustomer,
          purchaseHistory: [],
        };
        setCustomers((prev) => [...prev, formattedCustomer]);
        return formattedCustomer;
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Error al crear cliente';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );
  const updateCustomer = useCallback(
    async (id: string, updates: Partial<Customer>) => {
      setLoading(true);
      setError(null);
      try {
        const updated = await customersApi.update(id, updates) as unknown as BackendCustomer;
        const formattedCustomer = {
          ...updated,
          purchaseHistory: updated.sales || [],
        } as Customer;
        setCustomers((prev) =>
          prev.map((c) => (c.id === id ? formattedCustomer : c))
        );
        return formattedCustomer;
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Error al actualizar cliente';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );
  const deleteCustomer = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await customersApi.delete(id);
      setCustomers((prev) => prev.filter((c) => c.id !== id));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error al eliminar cliente';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  return {
    customers,
    loading,
    error,
    fetchCustomers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    setCustomers,
  };
};
