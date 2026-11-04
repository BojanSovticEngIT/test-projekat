// True while the Module 3 MSW mock API is active (see main.tsx). Set VITE_USE_MOCKS=false to use the real backend.
export const DEMAND_MOCKS_ENABLED: boolean = import.meta.env.DEV && import.meta.env.VITE_USE_MOCKS !== 'false';
