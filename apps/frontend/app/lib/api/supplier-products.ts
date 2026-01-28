// lib/api/supplier-products.ts
import { apiClient } from './client';
import { SupplierProduct } from '../types/types';
export const supplierProductsApi = {
  async getAll() {
    return apiClient.get<SupplierProduct[]>('/supplier-products');
  },
  async getBySupplier(supplierId: number) {
    return apiClient.get<SupplierProduct[]>(`/supplier-products/supplier/${supplierId}`);
  },
  async getByProduct(productId: number) {
    return apiClient.get<SupplierProduct[]>(`/supplier-products/product/${productId}`);
  },
  async create(data: { supplierId: number; productId: number }) {
    return apiClient.post<SupplierProduct>('/supplier-products', data);
  },
  async delete(supplierId: number, productId: number) {
    return apiClient.delete<void>(`/supplier-products/${supplierId}/${productId}`);
  },
};
