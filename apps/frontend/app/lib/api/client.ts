// lib/api/client.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface AuthError extends Error {
  isAuthError?: boolean;
  status?: number;
}

class ApiClient {
  private baseURL: string;
  private token: string | null = null;
  constructor(baseURL: string) {
    this.baseURL = baseURL;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('accessToken');
    }
  }
  setToken(token: string | null) {
    this.token = token;
    if (token && typeof window !== 'undefined') {
      localStorage.setItem('accessToken', token);
    } else if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
    }
  }
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    } else if (!endpoint.startsWith('/auth/')) {
        // En vez de null, lanzamos un error que capturaremos abajo
        const authError = new Error('No token') as AuthError;
        authError.isAuthError = true;
        throw authError;
    }
    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });
      if (!response.ok) {
        if (response.status === 401) {
            const authError = new Error('Unauthorized') as AuthError;
            authError.isAuthError = true;
            authError.status = 401;
            throw authError;
        }
        const error = await response.json().catch(() => ({
          message: response.statusText,
        }));
        throw new Error(error.message || `HTTP error! status: ${response.status}`);
      }
      if (response.status === 204) {
        return null as T;
      }
      const text = await response.text();
      if (!text || text === 'null') {
        return null as T;
      }
      try {
        return JSON.parse(text);
      } catch {
        console.error('Error parsing JSON response:', text);
        return text as unknown as T;
      }
    } catch (err) {
      const error = err as AuthError;
      // Si es un error de autenticación (llave faltante o expirada), no lo mostramos en consola
      // Esto evita el ruido rojo al cerrar sesión.
      if (error.isAuthError) {
          throw error;
      }
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }
  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
}
export const apiClient = new ApiClient(API_URL);
