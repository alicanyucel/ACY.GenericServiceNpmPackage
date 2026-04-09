import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, signal, computed } from '@angular/core';
import { Observable, throwError, catchError, tap, map, finalize } from 'rxjs';

import { GENERIC_SERVICE_CONFIG, GenericServiceConfig } from './generic-service.config';
import {
  BaseEntity,
  PagedResponse,
  QueryParams,
  ApiResponse,
  ApiError,
} from './models';

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
export abstract class GenericService<T extends BaseEntity> {
  // Angular 21 inject() ile DI
  protected readonly http = inject(HttpClient);
  protected readonly config = inject<GenericServiceConfig>(GENERIC_SERVICE_CONFIG);

  // Reactive state — Angular Signals
  private readonly _items = signal<T[]>([]);
  private readonly _selectedItem = signal<T | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<ApiError | null>(null);
  private readonly _totalCount = signal(0);
  private readonly _currentPage = signal(1);
  private readonly _pageSize: ReturnType<typeof signal<number>>;

  /** Mevcut entity listesi (readonly signal) */
  readonly items = this._items.asReadonly();

  /** Seçili entity (readonly signal) */
  readonly selectedItem = this._selectedItem.asReadonly();

  /** Yüklenme durumu */
  readonly loading = this._loading.asReadonly();

  /** Son hata */
  readonly error = this._error.asReadonly();

  /** Toplam kayıt sayısı */
  readonly totalCount = this._totalCount.asReadonly();

  /** Mevcut sayfa */
  readonly currentPage = this._currentPage.asReadonly();

  /** Sayfa boyutu */
  readonly pageSize: ReturnType<typeof computed<number>>;

  /** Toplam sayfa sayısı (computed) */
  readonly totalPages = computed(() =>
    Math.ceil(this._totalCount() / this._pageSize())
  );

  /** Veri var mı? (computed) */
  readonly hasData = computed(() => this._items().length > 0);

  /** Tam API URL */
  protected readonly apiUrl: string;

  /**
   * @param endpoint - API endpoint yolu (örn: 'users', 'products')
   */
  constructor(protected readonly endpoint: string) {
    this._pageSize = signal(this.config.defaultPageSize ?? 10);
    this.pageSize = computed(() => this._pageSize());
    this.apiUrl = `${this.config.baseUrl}/${endpoint}`;
  }

  // ─── CRUD Operations ──────────────────────────────────────

  /**
   * Tüm kayıtları getirir
   */
  getAll(params?: QueryParams): Observable<T[]> {
    this._loading.set(true);
    this._error.set(null);

    const httpParams = this.buildHttpParams(params);

    return this.http.get<T[]>(this.apiUrl, { params: httpParams }).pipe(
      tap((data) => {
        this._items.set(data);
      }),
      catchError((err) => this.handleError(err)),
      finalize(() => this._loading.set(false))
    );
  }

  /**
   * Sayfalı kayıtları getirir
   */
  getPaged(params?: QueryParams): Observable<PagedResponse<T>> {
    this._loading.set(true);
    this._error.set(null);

    const queryParams: QueryParams = {
      page: this._currentPage(),
      pageSize: this._pageSize(),
      ...params,
    };

    const httpParams = this.buildHttpParams(queryParams);

    return this.http
      .get<PagedResponse<T>>(this.apiUrl, { params: httpParams })
      .pipe(
        tap((response) => {
          this._items.set(response.data);
          this._totalCount.set(response.totalCount);
          this._currentPage.set(response.page);
        }),
        catchError((err) => this.handleError(err)),
        finalize(() => this._loading.set(false))
      );
  }

  /**
   * ID ile tek kayıt getirir
   */
  getById(id: string | number): Observable<T> {
    this._loading.set(true);
    this._error.set(null);

    return this.http.get<T>(`${this.apiUrl}/${id}`).pipe(
      tap((item) => {
        this._selectedItem.set(item);
      }),
      catchError((err) => this.handleError(err)),
      finalize(() => this._loading.set(false))
    );
  }

  /**
   * Yeni kayıt oluşturur
   */
  create(item: Omit<T, 'id'>): Observable<T> {
    this._loading.set(true);
    this._error.set(null);

    return this.http.post<T>(this.apiUrl, item).pipe(
      tap((created) => {
        this._items.update((items) => [...items, created]);
      }),
      catchError((err) => this.handleError(err)),
      finalize(() => this._loading.set(false))
    );
  }

  /**
   * Mevcut kaydı günceller
   */
  update(id: string | number, item: Partial<T>): Observable<T> {
    this._loading.set(true);
    this._error.set(null);

    return this.http.put<T>(`${this.apiUrl}/${id}`, item).pipe(
      tap((updated) => {
        this._items.update((items) =>
          items.map((i) => (i.id === id ? updated : i))
        );
        if (this._selectedItem()?.id === id) {
          this._selectedItem.set(updated);
        }
      }),
      catchError((err) => this.handleError(err)),
      finalize(() => this._loading.set(false))
    );
  }

  /**
   * Kaydı kısmen günceller (PATCH)
   */
  patch(id: string | number, item: Partial<T>): Observable<T> {
    this._loading.set(true);
    this._error.set(null);

    return this.http.patch<T>(`${this.apiUrl}/${id}`, item).pipe(
      tap((updated) => {
        this._items.update((items) =>
          items.map((i) => (i.id === id ? updated : i))
        );
        if (this._selectedItem()?.id === id) {
          this._selectedItem.set(updated);
        }
      }),
      catchError((err) => this.handleError(err)),
      finalize(() => this._loading.set(false))
    );
  }

  /**
   * Kaydı siler
   */
  delete(id: string | number): Observable<void> {
    this._loading.set(true);
    this._error.set(null);

    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        this._items.update((items) => items.filter((i) => i.id !== id));
        if (this._selectedItem()?.id === id) {
          this._selectedItem.set(null);
        }
      }),
      catchError((err) => this.handleError(err)),
      finalize(() => this._loading.set(false))
    );
  }

  // ─── Bulk Operations ──────────────────────────────────────

  /**
   * Toplu silme
   */
  deleteMany(ids: (string | number)[]): Observable<void> {
    this._loading.set(true);
    this._error.set(null);

    return this.http
      .request<void>('DELETE', this.apiUrl, { body: { ids } })
      .pipe(
        tap(() => {
          this._items.update((items) =>
            items.filter((i) => !ids.includes(i.id))
          );
          if (this._selectedItem() && ids.includes(this._selectedItem()!.id)) {
            this._selectedItem.set(null);
          }
        }),
        catchError((err) => this.handleError(err)),
        finalize(() => this._loading.set(false))
      );
  }

  // ─── Search & Filter ──────────────────────────────────────

  /**
   * Arama yapar
   */
  search(term: string, params?: QueryParams): Observable<T[]> {
    return this.getAll({ ...params, search: term });
  }

  // ─── Pagination Controls ──────────────────────────────────

  /**
   * Belirtilen sayfaya gider
   */
  goToPage(page: number): Observable<PagedResponse<T>> {
    this._currentPage.set(page);
    return this.getPaged();
  }

  /**
   * Sonraki sayfa
   */
  nextPage(): Observable<PagedResponse<T>> {
    if (this._currentPage() < this.totalPages()) {
      this._currentPage.update((p) => p + 1);
    }
    return this.getPaged();
  }

  /**
   * Önceki sayfa
   */
  previousPage(): Observable<PagedResponse<T>> {
    if (this._currentPage() > 1) {
      this._currentPage.update((p) => p - 1);
    }
    return this.getPaged();
  }

  /**
   * Sayfa boyutunu değiştirir
   */
  setPageSize(size: number): void {
    this._pageSize.set(size);
    this._currentPage.set(1);
  }

  // ─── State Management ─────────────────────────────────────

  /**
   * Seçili entity'yi ayarlar
   */
  select(item: T | null): void {
    this._selectedItem.set(item);
  }

  /**
   * State'i sıfırlar
   */
  clearState(): void {
    this._items.set([]);
    this._selectedItem.set(null);
    this._error.set(null);
    this._totalCount.set(0);
    this._currentPage.set(1);
  }

  /**
   * Hatayı temizler
   */
  clearError(): void {
    this._error.set(null);
  }

  // ─── Protected Helpers ────────────────────────────────────

  /**
   * QueryParams'ı HttpParams'a dönüştürür.
   * Alt sınıflarda override edilebilir.
   */
  protected buildHttpParams(params?: QueryParams): HttpParams {
    let httpParams = new HttpParams();

    if (!params) return httpParams;

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
  protected handleError(error: HttpErrorResponse): Observable<never> {
    const apiError: ApiError = {
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
