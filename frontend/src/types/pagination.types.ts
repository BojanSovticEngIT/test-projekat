/**
 * Standard paginated response — matches the Spring Data VIA_DTO serialisation mode.
 *
 * Example JSON:
 * {
 *   "content": [...],
 *   "page": {
 *     "size": 20,
 *     "number": 0,
 *     "totalElements": 42,
 *     "totalPages": 3
 *   }
 * }
 */
export interface PageMeta {
  size: number;
  number: number;
  totalElements: number;
  totalPages: number;
}

export interface PagedResponse<T> {
  content: T[];
  page: PageMeta;
}

