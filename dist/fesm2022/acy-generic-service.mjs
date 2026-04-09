import { HttpClient, HttpParams } from '@angular/common/http';
import { InjectionToken, inject, signal, computed } from '@angular/core';
import { tap, catchError, finalize, throwError } from 'rxjs';

/**
 * Konfigürasyon için InjectionToken
 */
const GENERIC_SERVICE_CONFIG = new InjectionToken('GENERIC_SERVICE_CONFIG');
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
function provideGenericServiceConfig(config) {
    return {
        provide: GENERIC_SERVICE_CONFIG,
        useValue: {
            defaultPageSize: 10,
            enableLogging: false,
            ...config,
        },
    };
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
class GenericService {
    endpoint;
    // Angular 21 inject() ile DI
    http = inject(HttpClient);
    config = inject(GENERIC_SERVICE_CONFIG);
    // Reactive state — Angular Signals
    _items = signal([], ...(ngDevMode ? [{ debugName: "_items" }] : /* istanbul ignore next */ []));
    _selectedItem = signal(null, ...(ngDevMode ? [{ debugName: "_selectedItem" }] : /* istanbul ignore next */ []));
    _loading = signal(false, ...(ngDevMode ? [{ debugName: "_loading" }] : /* istanbul ignore next */ []));
    _error = signal(null, ...(ngDevMode ? [{ debugName: "_error" }] : /* istanbul ignore next */ []));
    _totalCount = signal(0, ...(ngDevMode ? [{ debugName: "_totalCount" }] : /* istanbul ignore next */ []));
    _currentPage = signal(1, ...(ngDevMode ? [{ debugName: "_currentPage" }] : /* istanbul ignore next */ []));
    _pageSize;
    /** Mevcut entity listesi (readonly signal) */
    items = this._items.asReadonly();
    /** Seçili entity (readonly signal) */
    selectedItem = this._selectedItem.asReadonly();
    /** Yüklenme durumu */
    loading = this._loading.asReadonly();
    /** Son hata */
    error = this._error.asReadonly();
    /** Toplam kayıt sayısı */
    totalCount = this._totalCount.asReadonly();
    /** Mevcut sayfa */
    currentPage = this._currentPage.asReadonly();
    /** Sayfa boyutu */
    pageSize;
    /** Toplam sayfa sayısı (computed) */
    totalPages = computed(() => Math.ceil(this._totalCount() / this._pageSize()), ...(ngDevMode ? [{ debugName: "totalPages" }] : /* istanbul ignore next */ []));
    /** Veri var mı? (computed) */
    hasData = computed(() => this._items().length > 0, ...(ngDevMode ? [{ debugName: "hasData" }] : /* istanbul ignore next */ []));
    /** Tam API URL */
    apiUrl;
    /**
     * @param endpoint - API endpoint yolu (örn: 'users', 'products')
     */
    constructor(endpoint) {
        this.endpoint = endpoint;
        this._pageSize = signal(this.config.defaultPageSize ?? 10, ...(ngDevMode ? [{ debugName: "_pageSize" }] : /* istanbul ignore next */ []));
        this.pageSize = computed(() => this._pageSize(), ...(ngDevMode ? [{ debugName: "pageSize" }] : /* istanbul ignore next */ []));
        this.apiUrl = `${this.config.baseUrl}/${endpoint}`;
    }
    // ─── CRUD Operations ──────────────────────────────────────
    /**
     * Tüm kayıtları getirir
     */
    getAll(params) {
        this._loading.set(true);
        this._error.set(null);
        const httpParams = this.buildHttpParams(params);
        return this.http.get(this.apiUrl, { params: httpParams }).pipe(tap((data) => {
            this._items.set(data);
        }), catchError((err) => this.handleError(err)), finalize(() => this._loading.set(false)));
    }
    /**
     * Sayfalı kayıtları getirir
     */
    getPaged(params) {
        this._loading.set(true);
        this._error.set(null);
        const queryParams = {
            page: this._currentPage(),
            pageSize: this._pageSize(),
            ...params,
        };
        const httpParams = this.buildHttpParams(queryParams);
        return this.http
            .get(this.apiUrl, { params: httpParams })
            .pipe(tap((response) => {
            this._items.set(response.data);
            this._totalCount.set(response.totalCount);
            this._currentPage.set(response.page);
        }), catchError((err) => this.handleError(err)), finalize(() => this._loading.set(false)));
    }
    /**
     * ID ile tek kayıt getirir
     */
    getById(id) {
        this._loading.set(true);
        this._error.set(null);
        return this.http.get(`${this.apiUrl}/${id}`).pipe(tap((item) => {
            this._selectedItem.set(item);
        }), catchError((err) => this.handleError(err)), finalize(() => this._loading.set(false)));
    }
    /**
     * Yeni kayıt oluşturur
     */
    create(item) {
        this._loading.set(true);
        this._error.set(null);
        return this.http.post(this.apiUrl, item).pipe(tap((created) => {
            this._items.update((items) => [...items, created]);
        }), catchError((err) => this.handleError(err)), finalize(() => this._loading.set(false)));
    }
    /**
     * Mevcut kaydı günceller
     */
    update(id, item) {
        this._loading.set(true);
        this._error.set(null);
        return this.http.put(`${this.apiUrl}/${id}`, item).pipe(tap((updated) => {
            this._items.update((items) => items.map((i) => (i.id === id ? updated : i)));
            if (this._selectedItem()?.id === id) {
                this._selectedItem.set(updated);
            }
        }), catchError((err) => this.handleError(err)), finalize(() => this._loading.set(false)));
    }
    /**
     * Kaydı kısmen günceller (PATCH)
     */
    patch(id, item) {
        this._loading.set(true);
        this._error.set(null);
        return this.http.patch(`${this.apiUrl}/${id}`, item).pipe(tap((updated) => {
            this._items.update((items) => items.map((i) => (i.id === id ? updated : i)));
            if (this._selectedItem()?.id === id) {
                this._selectedItem.set(updated);
            }
        }), catchError((err) => this.handleError(err)), finalize(() => this._loading.set(false)));
    }
    /**
     * Kaydı siler
     */
    delete(id) {
        this._loading.set(true);
        this._error.set(null);
        return this.http.delete(`${this.apiUrl}/${id}`).pipe(tap(() => {
            this._items.update((items) => items.filter((i) => i.id !== id));
            if (this._selectedItem()?.id === id) {
                this._selectedItem.set(null);
            }
        }), catchError((err) => this.handleError(err)), finalize(() => this._loading.set(false)));
    }
    // ─── Bulk Operations ──────────────────────────────────────
    /**
     * Toplu silme
     */
    deleteMany(ids) {
        this._loading.set(true);
        this._error.set(null);
        return this.http
            .request('DELETE', this.apiUrl, { body: { ids } })
            .pipe(tap(() => {
            this._items.update((items) => items.filter((i) => !ids.includes(i.id)));
            if (this._selectedItem() && ids.includes(this._selectedItem().id)) {
                this._selectedItem.set(null);
            }
        }), catchError((err) => this.handleError(err)), finalize(() => this._loading.set(false)));
    }
    // ─── Search & Filter ──────────────────────────────────────
    /**
     * Arama yapar
     */
    search(term, params) {
        return this.getAll({ ...params, search: term });
    }
    // ─── Pagination Controls ──────────────────────────────────
    /**
     * Belirtilen sayfaya gider
     */
    goToPage(page) {
        this._currentPage.set(page);
        return this.getPaged();
    }
    /**
     * Sonraki sayfa
     */
    nextPage() {
        if (this._currentPage() < this.totalPages()) {
            this._currentPage.update((p) => p + 1);
        }
        return this.getPaged();
    }
    /**
     * Önceki sayfa
     */
    previousPage() {
        if (this._currentPage() > 1) {
            this._currentPage.update((p) => p - 1);
        }
        return this.getPaged();
    }
    /**
     * Sayfa boyutunu değiştirir
     */
    setPageSize(size) {
        this._pageSize.set(size);
        this._currentPage.set(1);
    }
    // ─── State Management ─────────────────────────────────────
    /**
     * Seçili entity'yi ayarlar
     */
    select(item) {
        this._selectedItem.set(item);
    }
    /**
     * State'i sıfırlar
     */
    clearState() {
        this._items.set([]);
        this._selectedItem.set(null);
        this._error.set(null);
        this._totalCount.set(0);
        this._currentPage.set(1);
    }
    /**
     * Hatayı temizler
     */
    clearError() {
        this._error.set(null);
    }
    // ─── Protected Helpers ────────────────────────────────────
    /**
     * QueryParams'ı HttpParams'a dönüştürür.
     * Alt sınıflarda override edilebilir.
     */
    buildHttpParams(params) {
        let httpParams = new HttpParams();
        if (!params)
            return httpParams;
        if (params.page != null) {
            httpParams = httpParams.set('page', params.page.toString());
        }
        if (params.pageSize != null) {
            httpParams = httpParams.set('pageSize', params.pageSize.toString());
        }
        if (params.sort) {
            httpParams = httpParams.set('sort', params.sort);
        }
        if (params.sortDirection) {
            httpParams = httpParams.set('sortDirection', params.sortDirection);
        }
        if (params.search) {
            httpParams = httpParams.set('search', params.search);
        }
        if (params.filters) {
            for (const [key, value] of Object.entries(params.filters)) {
                httpParams = httpParams.set(key, String(value));
            }
        }
        return httpParams;
    }
    /**
     * HTTP hatalarını yönetir.
     * Alt sınıflarda override edilebilir.
     */
    handleError(error) {
        const apiError = {
            status: error.status,
            message: error.error?.message ?? error.message ?? 'Bilinmeyen hata',
            errors: error.error?.errors,
            timestamp: new Date().toISOString(),
        };
        this._error.set(apiError);
        if (this.config.enableLogging) {
            console.error(`[GenericService] ${this.endpoint}:`, apiError);
        }
        return throwError(() => apiError);
    }
}

/*
 * Public API Surface
 */

/**
 * Generated bundle index. Do not edit.
 */

export { GENERIC_SERVICE_CONFIG, GenericService, provideGenericServiceConfig };
//# sourceMappingURL=acy-generic-service.mjs.map
