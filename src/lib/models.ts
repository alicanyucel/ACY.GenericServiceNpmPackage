/**
 * Base entity interface - tüm entity'lerin bir ID'si olmalı
 */
export interface BaseEntity {
  id: string | number;
}

/**
 * Sayfalı yanıt modeli
 */
export interface PagedResponse<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Sorgu parametreleri
 */
export interface QueryParams {
  page?: number;
  pageSize?: number;
  sort?: string;
  sortDirection?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, string | number | boolean>;
}

/**
 * API yanıt sarmalayıcı
 */
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  errors?: string[];
}

/**
 * Hata detay modeli
 */
export interface ApiError {
  status: number;
  message: string;
  errors?: string[];
  timestamp: string;
}
