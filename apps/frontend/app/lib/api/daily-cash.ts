// lib/api/daily-cash.ts
import { apiClient } from './client';
import { DailyCash } from '../types/types';
export const dailyCashApi = {
  async getAll(): Promise<DailyCash[]> {
    return apiClient.get<DailyCash[]>('/daily-cash');
  },
  async getByDate(date: string): Promise<DailyCash | null> {
    try {
      return await apiClient.get<DailyCash>(`/daily-cash/date/${date}`);
    } catch {
      return null;
    }
  },
  async create(dailyCash: Omit<DailyCash, 'id'>): Promise<DailyCash> {
    return apiClient.post<DailyCash>('/daily-cash', dailyCash);
  },
  async update(id: number, dailyCash: Partial<DailyCash>): Promise<DailyCash> {
    return apiClient.put<DailyCash>(`/daily-cash/${id}`, dailyCash);
  },
  async close(id: number, data: {
    closingAmount?: number;
    closingDifference?: number;
    closedBy?: string;
    comments?: string;
    otherIncome?: number;
  }): Promise<DailyCash> {
    return apiClient.put<DailyCash>(`/daily-cash/${id}/close`, data);
  },
};
