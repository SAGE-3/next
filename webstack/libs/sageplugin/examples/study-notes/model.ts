import type { PluginState } from '@sage3/sageplugin';

export type Card = {
  title?: string;
  subtitle?: string;
  kicker?: string;
  footer?: string;
  link?: string;
  style?: string;
  accent?: string;
  deco?: string;
  tilt?: number;
  cols?: number;
  pen?: number;
  fs?: number;
  minfs?: number;
  maxfs?: number;
  nofit?: boolean;
  assetId?: string;
  page?: number;
  sourceAppId?: string;
  source?: { appId: string; assetId?: string; page: number };
  pages?: { page: number; caption?: string }[];
};

export function object(value: unknown): PluginState {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as PluginState) : {};
}

export function cardOf(content: unknown): Card {
  return object(object(content).card) as Card;
}

export function showError(error: unknown): void {
  let status = document.getElementById('error');

  if (!status) {
    status = document.createElement('p');
    status.id = 'error';
    status.setAttribute('role', 'alert');
    document.body.append(status);
  }

  status.textContent = error instanceof Error ? error.message : String(error);
}

export const escapeHtml = (value: unknown): string =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
