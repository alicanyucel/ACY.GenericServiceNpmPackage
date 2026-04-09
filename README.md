# @anthropic/ngx-generic-service

Angular 21 için Generic CRUD Service paketi. Tüm entity servisleriniz için temel sınıf sağlar.

## Özellikler

- **CRUD Operasyonları** — `getAll`, `getById`, `create`, `update`, `patch`, `delete`
- **Pagination** — Sayfalı veri çekme, sayfa navigasyonu
- **Arama & Filtreleme** — Esnek query parametreleri
- **Toplu İşlemler** — `deleteMany`
- **Angular Signals** — Reactive state yönetimi (`items`, `loading`, `error` vb.)
- **Hata Yönetimi** — Standart API hata modeli
- **Konfigürasyon** — `InjectionToken` ile merkezi ayarlar

## Kurulum

```bash
npm install @anthropic/ngx-generic-service
```

## Konfigürasyon

`app.config.ts` içinde:

```typescript
import { ApplicationConfig, provideHttpClient } from '@angular/core';
import { provideGenericServiceConfig } from '@anthropic/ngx-generic-service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideGenericServiceConfig({
      baseUrl: 'https://api.example.com',
      defaultPageSize: 20,
      enableLogging: true,
    }),
  ],
};
```

## Kullanım

### 1. Entity Model Tanımla

```typescript
import { BaseEntity } from '@anthropic/ngx-generic-service';

export interface User extends BaseEntity {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
}
```

### 2. Service Oluştur

```typescript
import { Injectable } from '@angular/core';
import { GenericService } from '@anthropic/ngx-generic-service';
import { User } from './user.model';

@Injectable({ providedIn: 'root' })
export class UserService extends GenericService<User> {
  constructor() {
    super('users'); // API endpoint: https://api.example.com/users
  }
}
```

### 3. Component İçinde Kullan

```typescript
import { Component, inject, OnInit } from '@angular/core';
import { UserService } from './user.service';

@Component({
  selector: 'app-user-list',
  template: `
    @if (userService.loading()) {
      <p>Yükleniyor...</p>
    }

    @if (userService.error(); as error) {
      <p class="error">{{ error.message }}</p>
    }

    @for (user of userService.items(); track user.id) {
      <div (click)="userService.select(user)">
        {{ user.name }} - {{ user.email }}
      </div>
    }

    <div class="pagination">
      <button (click)="userService.previousPage()">Önceki</button>
      <span>{{ userService.currentPage() }} / {{ userService.totalPages() }}</span>
      <button (click)="userService.nextPage()">Sonraki</button>
    </div>
  `,
})
export class UserListComponent implements OnInit {
  protected readonly userService = inject(UserService);

  ngOnInit() {
    this.userService.getPaged().subscribe();
  }
}
```

### 4. CRUD İşlemleri

```typescript
// Tümünü getir
this.userService.getAll().subscribe();

// Sayfalı getir
this.userService.getPaged({ page: 1, pageSize: 10, sort: 'name' }).subscribe();

// ID ile getir
this.userService.getById(1).subscribe();

// Yeni oluştur
this.userService.create({ name: 'Ali', email: 'ali@test.com', role: 'user' }).subscribe();

// Güncelle
this.userService.update(1, { name: 'Ali Can' }).subscribe();

// PATCH
this.userService.patch(1, { role: 'admin' }).subscribe();

// Sil
this.userService.delete(1).subscribe();

// Toplu sil
this.userService.deleteMany([1, 2, 3]).subscribe();

// Ara
this.userService.search('ali').subscribe();
```

### 5. Override Örnekleri

```typescript
@Injectable({ providedIn: 'root' })
export class ProductService extends GenericService<Product> {
  constructor() {
    super('products');
  }

  // Özel endpoint
  getByCategory(categoryId: number) {
    return this.http.get<Product[]>(`${this.apiUrl}/category/${categoryId}`);
  }

  // buildHttpParams override
  protected override buildHttpParams(params?: QueryParams): HttpParams {
    let httpParams = super.buildHttpParams(params);
    httpParams = httpParams.set('include', 'category,tags');
    return httpParams;
  }
}
```

## API Referansı

### GenericService<T>

| Method | Dönüş Tipi | Açıklama |
|---|---|---|
| `getAll(params?)` | `Observable<T[]>` | Tüm kayıtları getirir |
| `getPaged(params?)` | `Observable<PagedResponse<T>>` | Sayfalı getirir |
| `getById(id)` | `Observable<T>` | Tek kayıt |
| `create(item)` | `Observable<T>` | Yeni kayıt |
| `update(id, item)` | `Observable<T>` | Tam güncelleme |
| `patch(id, item)` | `Observable<T>` | Kısmi güncelleme |
| `delete(id)` | `Observable<void>` | Silme |
| `deleteMany(ids)` | `Observable<void>` | Toplu silme |
| `search(term, params?)` | `Observable<T[]>` | Arama |

### Signals (Readonly)

| Signal | Tip | Açıklama |
|---|---|---|
| `items` | `Signal<T[]>` | Mevcut liste |
| `selectedItem` | `Signal<T \| null>` | Seçili kayıt |
| `loading` | `Signal<boolean>` | Yükleniyor mu |
| `error` | `Signal<ApiError \| null>` | Son hata |
| `totalCount` | `Signal<number>` | Toplam kayıt |
| `currentPage` | `Signal<number>` | Mevcut sayfa |
| `pageSize` | `Signal<number>` | Sayfa boyutu |
| `totalPages` | `Signal<number>` | Toplam sayfa (computed) |
| `hasData` | `Signal<boolean>` | Veri var mı (computed) |

## Build

```bash
npm run build
```

## Lisans

MIT
