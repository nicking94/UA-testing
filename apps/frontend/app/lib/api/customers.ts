// lib/api/customers.ts
import { apiClient } from './client';
import { Customer } from '../types/types';
export interface CustomerFilters {
  search?: string;
  status?: string;
  rubro?: string;
}
export const customersApi = {
  async getAll(filters?: CustomerFilters): Promise<Customer[]> {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.rubro) params.append('rubro', filters.rubro);
    const query = params.toString();
    return apiClient.get<Customer[]>(`/customers${query ? `?${query}` : ''}`);
  },
  async getById(id: string): Promise<Customer> {
    return apiClient.get<Customer>(`/customers/${id}`);
  },
  async create(customer: Omit<Customer, 'id' | 'purchaseHistory'>): Promise<Customer> {
    return apiClient.post<Customer>('/customers', customer);
  },
  async update(id: string, customer: Partial<Customer>): Promise<Customer> {
    return apiClient.put<Customer>(`/customers/${id}`, customer);
  },
  async delete(id: string): Promise<void> {
    return apiClient.delete<void>(`/customers/${id}`);
  },
  async updateBalance(id: string, amount: number): Promise<Customer> {
    return apiClient.put<Customer>(`/customers/${id}/balance`, { amount });
  },
};
