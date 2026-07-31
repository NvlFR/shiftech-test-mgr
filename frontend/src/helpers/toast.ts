import type { Toast } from 'primereact/toast';

let toastRef: Toast | null = null;

export function setToastRef(instance: Toast | null) {
  toastRef = instance;
}

function show(severity: 'success' | 'error' | 'info' | 'warn', summary: string, detail?: string, life?: number) {
  toastRef?.show({ severity, summary, detail, life });
}

export const toastHelper = {
  success: (summary: string, detail?: string, life?: number) => show('success', summary, detail, life),
  error: (summary: string, detail?: string, life?: number) => show('error', summary, detail, life),
  info: (summary: string, detail?: string, life?: number) => show('info', summary, detail, life),
  warn: (summary: string, detail?: string, life?: number) => show('warn', summary, detail, life),
  errorFromCatch: (summary: string, error: unknown) => show('error', summary, error instanceof Error ? error.message : undefined),
};
