// Module 4 has no backend yet, so its mock API is on in every build (including the Podman/Nginx one).
// Set VITE_USE_SEARCH_MOCKS=false once the real /api/search endpoints exist.
export const SEARCH_MOCKS_ENABLED: boolean =
  import.meta.env.VITE_USE_SEARCH_MOCKS !== 'false';
