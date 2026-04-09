/*
 * Public API Surface
 */
export { GenericService } from './lib/generic.service';
export {
  BaseEntity,
  PagedResponse,
  QueryParams,
  ApiResponse,
  ApiError,
} from './lib/models';
export {
  GenericServiceConfig,
  GENERIC_SERVICE_CONFIG,
  provideGenericServiceConfig,
} from './lib/generic-service.config';
