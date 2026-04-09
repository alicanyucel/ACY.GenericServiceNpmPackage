import { InjectionToken } from '@angular/core';

/**
 * Generic service konfigürasyonu
 */
export interface GenericServiceConfig {
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
export const GENERIC_SERVICE_CONFIG = new InjectionToken<GenericServiceConfig>(
  'GENERIC_SERVICE_CONFIG'
);

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
export function provideGenericServiceConfig(config: GenericServiceConfig) {
  return {
    provide: GENERIC_SERVICE_CONFIG,
    useValue: {
      defaultPageSize: 10,
      enableLogging: false,
      ...config,
    } satisfies GenericServiceConfig,
  };
}
