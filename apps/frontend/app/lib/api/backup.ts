import { apiClient } from './client';

export const backupApi = {
  async export(): Promise<Record<string, unknown>> {
    return apiClient.get('/backup/export');
  },
  async import(data: Record<string, unknown>): Promise<{ message: string }> {
    let finalData = data;
    // Si es un formato de Dexie export-import, extraemos las filas
    if (data.formatName === "dexie" && data.data) {
      const dexieData = data.data as Record<string, unknown>;
      if (Array.isArray(dexieData.tables)) {
        const tables: Record<string, unknown[]> = {};
        dexieData.tables.forEach((table: unknown) => {
          const t = table as { name: string; rows: unknown[] };
          if (t && typeof t.name === 'string') {
            tables[t.name] = t.rows;
          }
        });
        finalData = tables;
      }
    }
    return apiClient.post('/backup/import', finalData);
  },
};
