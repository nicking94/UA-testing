// lib/api/client.ts


interface AuthError extends Error {
  isAuthError?: boolean;
  status?: number;
}

class ApiClient {
  private baseURL: string;
  private token: string | null = null;
  private ignoreSessionErrors = false;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('token', token);
      } else {
        localStorage.removeItem('token');
      }
    }
  }

  setIgnoreSessionErrors(value: boolean) {
    this.ignoreSessionErrors = value;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Si estamos cerrando sesión, devolvemos una promesa infinita para silenciar todo
    if (this.ignoreSessionErrors) {
        return new Promise(() => {}); 
    }

    const url = `${this.baseURL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    } else if (!endpoint.startsWith('/auth/')) {
        const error = new Error('No token') as AuthError;
        error.isAuthError = true;
        throw error;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        if (response.status === 401) {
            const error = new Error('Unauthorized') as AuthError;
            error.isAuthError = true;
            error.status = 401;
            throw error;
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
        return text as unknown as T;
      }
    } catch (err) {
      const error = err as AuthError;
      
      // Si estamos ignorando errores (doble check) o es un error de sesión
      if (this.ignoreSessionErrors || error.isAuthError || error.message === 'No token' || error.status === 401) {
          throw error;
      }
      
      if (error.message !== 'Failed to fetch') {
          console.error(`API Error [${endpoint}]:`, error);
      }
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
export const apiClient = new ApiClient();
