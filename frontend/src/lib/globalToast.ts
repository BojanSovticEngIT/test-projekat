type Severity = 'success' | 'error' | 'warning' | 'info';
type ShowToastFn = (message: string, severity?: Severity) => void;

let _showToast: ShowToastFn | null = null;

export const setGlobalToast = (fn: ShowToastFn): void => {
  _showToast = fn;
};

export const showGlobalToast = (message: string, severity: Severity = 'error'): void => {
  _showToast?.(message, severity);
};
