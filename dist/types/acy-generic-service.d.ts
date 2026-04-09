import * as _angular_core from '@angular/core';
import { InjectionToken, computed } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Generic service konfigürasyonu
 */
interface GenericServiceConfig {
    /** API base URL (örn: 'https://api.example.com') */
    baseUrl: string;
    /** Varsayılan sayfa boyutu */
    defaultPageSize?: number;
    /** İsteklere eklenecek varsayılan header'lar */
    defaultHeaders?: Record<string, string>;
    /** Hata mesajlarını loglama */
    enableLogging?: boolean;
}
/**
 * Konfigürasyon için InjectionToken
 */
declare const GENERIC_SERVICE_CONFIG: InjectionToken<GenericServiceConfig>;
/**
 * Konfigürasyonu provide etmek için yardımcı fonksiyon
 *
 * @example
 * ```ts
 * // app.config.ts
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideGenericServiceConfig({
 *       baseUrl: 'https://api.example.com',
 *       defaultPageSize: 20,
 *       enableLogging: true,
 *     }),
 *   ],
 * };
 * ```
 */
declare function provideGenericServiceConfig(config: GenericServiceConfig): {
    provide: InjectionToken<GenericServiceConfig>;
    useValue: {
        /** API base URL (örn: 'https://api.example.com') */
        baseUrl: string;
        defaultPageSize: number;
        /** İsteklere eklenecek varsayılan header'lar */
        defaultHeaders?: Record<string, string>;
        enableLogging: boolean;
    };
};

/**
 * Base entity interface - tüm entity'lerin bir ID'si olmalı
 */
interface BaseEntity {
    id: string | number;
}
/**
 * Sayfalı yanıt modeli
 */
interface PagedResponse<T> {
    data: T[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
}
/**
 * Sorgu parametreleri
 */
interface QueryParams {
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
interface ApiResponse<T> {
    data: T;
    success: boolean;
    message?: string;
    errors?: string[];
}
/**
 * Hata detay modeli
 */
interface ApiError {
    status: number;
    message: string;
    errors?: string[];
    timestamp: string;
}

/**
 * Angular 21 Generic CRUD Service
 *
 * Tüm entity servisleri için temel sınıf.
 * HTTP CRUD operasyonları, pagination, filtreleme, hata yönetimi ve
 * reactive state (signals) desteği sağlar.
 *
 * @example
 * ```ts
 * // user.service.ts
 * @Injectable({ providedIn: 'root' })
 * export class UserService extends GenericService<User> {
 *   constructor() {
 *     super('users'); // endpoint: /api/users
 *   }
 * }
 *
 * // component içinde kullanım
 * export class UserListComponent {
 *   private userService = inject(UserService);
 *
 *   users = this.userService.items;
 *   loading = this.userService.loading;
 *   error = this.userService.error;
 *   totalCount = this.userService.totalCount;
 * }
 * ```
 */
declare abstract class GenericService<T extends BaseEntity> {
    protected readonly endpoint: string;
    protected readonly http: HttpClient;
    protected readonly config: GenericServiceConfig;
    private readonly _items;
    private readonly _selectedItem;
    private readonly _loading;
    private readonly _error;
    private readonly _totalCount;
    private readonly _currentPage;
    private readonly _pageSize;
    /** Mevcut entity listesi (readonly signal) */
    readonly items: _angular_core.Signal<T[]>;
    /** Seçili entity (readonly signal) */
    readonly selectedItem: _angular_core.Signal<T>;
    /** Yüklenme durumu */
    readonly loading: _angular_core.Signal<boolean>;
    /** Son hata */
    readonly error: _angular_core.Signal<ApiError>;
    /** Toplam kayıt sayısı */
    readonly totalCount: _angular_core.Signal<number>;
    /** Mevcut sayfa */
    readonly currentPage: _angular_core.Signal<number>;
    /** Sayfa boyutu */
    readonly pageSize: ReturnType<typeof computed<number>>;
    /** Toplam sayfa sayısı (computed) */
    readonly totalPages: _angular_core.Signal<number>;
    /** Veri var mı? (computed) */
    readonly hasData: _angular_core.Signal<boolean>;
    /** Tam API URL */
    protected readonly apiUrl: string;
    /**
     * @param endpoint - API endpoint yolu (örn: 'users', 'products')
     */
    constructor(endpoint: string);
    /**
     * Tüm kayıtları getirir
     */
    getAll(params?: QueryParams): Observable<T[]>;
    /**
     * Sayfalı kayıtları getirir
     */
    getPaged(params?: QueryParams): Observable<PagedResponse<T>>;
    /**
     * ID ile tek kayıt getirir
     */
    getById(id: string | number): Observable<T>;
    /**
     * Yeni kayıt oluşturur
     */
    create(item: Omit<T, 'id'>): Observable<T>;
    /**
     * Mevcut kaydı günceller
     */
    update(id: string | number, item: Partial<T>): Observable<T>;
    /**
     * Kaydı kısmen günceller (PATCH)
     */
    patch(id: string | number, item: Partial<T>): Observable<T>;
    /**
     * Kaydı siler
     */
    delete(id: string | number): Observable<void>;
    /**
     * Toplu silme
     */
    deleteMany(ids: (string | number)[]): Observable<void>;
    /**
     * Arama yapar
     */
    search(term: string, params?: QueryParams): Observable<T[]>;
    /**
     * Belirtilen sayfaya gider
     */
    goToPage(page: number): Observable<PagedResponse<T>>;
    /**
     * Sonraki sayfa
     */
    nextPage(): Observable<PagedResponse<T>>;
    /**
     * Önceki sayfa
     */
    previousPage(): Observable<PagedResponse<T>>;
    /**
     * Sayfa boyutunu değiştirir
     */
    setPageSize(size: number): void;
    /**
     * Seçili entity'yi ayarlar
     */
    select(item: T | null): void;
    /**
     * State'i sıfırlar
     */
    clearState(): void;
    /**
     * Hatayı temizler
     */
    clearError(): void;
    /**
     * QueryParams'ı HttpParams'a dönüştürür.
     * Alt sınıflarda override edilebilir.
     */
    protected buildHttpParams(params?: QueryParams): HttpParams;
    /**
     * HTTP hatalarını yönetir.
     * Alt sınıflarda override edilebilir.
     */
    protected handleError(error: HttpErrorResponse): Observable<never>;
}

export { GENERIC_SERVICE_CONFIG, GenericService, provideGenericServiceConfig };
export type { ApiError, ApiResponse, BaseEntity, GenericServiceConfig, PagedResponse, QueryParams };
