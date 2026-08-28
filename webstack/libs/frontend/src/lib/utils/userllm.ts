/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// A user's own OpenAI-compatible credentials, kept in this browser only.
//
// These are deliberately NOT part of the `s3_user_settings` bundle: that blob
// is designed to be reset wholesale by "Restore Default Settings", and a key
// should never disappear as a side effect of resetting an unrelated preference.
// They are never sent to the SAGE3 server for storage — only attached to the
// AI requests that need them.

import { LLMCapability, LLMConfiguration } from '@sage3/shared/types';
import { USER_LLM_PROVIDER, UserLLMPayload } from '@sage3/shared';

/**
 * Storage backend for the key.
 *
 * `localStorage` keeps the key across sessions, which is what a user pasting
 * their own key expects. Switch this one line to `sessionStorage` to have the
 * key live only until the tab closes — never written to disk — at the cost of
 * re-pasting it each session.
 */
const backend = (): Storage | undefined => (typeof window === 'undefined' ? undefined : window.localStorage);

const STORAGE_KEY = 's3_user_llm';

/**
 * The provider name a user's own credentials appear under. This is the value
 * stored in the `aiModel` setting and sent as the `model` field of an AI
 * request when the user has chosen their own key, so it must not collide with
 * a provider name from the server configuration.
 *
 * Defined in the shared wire contract so the frontend and the backend cannot
 * drift apart on the name.
 */
export const USER_PROVIDER_NAME = USER_LLM_PROVIDER;

/**
 * What a user-supplied model is assumed to be able to do. Unlike server
 * providers — which declare capabilities per model in the server config —
 * there is no way to ask an arbitrary OpenAI-compatible endpoint what its
 * model supports, so we assume the common text-model set. Image generation
 * and embeddings are deliberately excluded: claiming them would light up UI
 * that then fails at request time.
 */
export const USER_MODEL_CAPABILITIES: LLMCapability[] = ['chat', 'code', 'vision'];

export type UserLLMCredentials = {
  /** The API key. Sent with each AI request; never stored server-side. */
  apiKey: string;
  /** Optional OpenAI-compatible base URL. Empty means api.openai.com. */
  baseUrl?: string;
  /** The model id to request, e.g. `gpt-4o`. */
  modelId: string;
};

/** Read the stored credentials, or undefined when none are set. */
export function getUserLLM(): UserLLMCredentials | undefined {
  try {
    const raw = backend()?.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Partial<UserLLMCredentials>;
    // Both fields are required for the credentials to be usable at all
    if (!parsed.apiKey || !parsed.modelId) return undefined;
    return {
      apiKey: parsed.apiKey,
      baseUrl: parsed.baseUrl || undefined,
      modelId: parsed.modelId,
    };
  } catch (e) {
    // Corrupt or unreadable storage (private mode, cleared data): behave as unset
    return undefined;
  }
}

/** True when usable credentials are stored. */
export function hasUserLLM(): boolean {
  return getUserLLM() !== undefined;
}

/**
 * Store the credentials. Values are trimmed; a trailing slash is removed from
 * the base URL so it composes predictably on the backend.
 */
export function setUserLLM(creds: UserLLMCredentials): void {
  const clean: UserLLMCredentials = {
    apiKey: creds.apiKey.trim(),
    baseUrl: creds.baseUrl?.trim().replace(/\/+$/, '') || undefined,
    modelId: creds.modelId.trim(),
  };
  try {
    backend()?.setItem(STORAGE_KEY, JSON.stringify(clean));
  } catch (e) {
    // Storage unavailable or full — the caller reports failure to the user
    throw new Error('Could not save the key in this browser');
  }
}

/** Remove the stored credentials. */
export function clearUserLLM(): void {
  try {
    backend()?.removeItem(STORAGE_KEY);
  } catch (e) {
    // Nothing to do: unreadable storage is already effectively cleared
  }
}

/**
 * A display form of the key: last 4 characters only, for confirming which key
 * is stored without putting the secret back on screen.
 */
export function maskApiKey(apiKey: string): string {
  const tail = apiKey.slice(-4);
  return tail ? `••••••••${tail}` : '';
}

/**
 * Add the user's own credentials to an LLM configuration as an ordinary
 * provider, so everything that reasons about providers — capability gating,
 * the settings list, task availability — treats it like any other.
 *
 * Without this the user's provider is absent from the configuration, and
 * `canProviderPerformTask` returns false for *every* task, blocking even plain
 * chat. The key is deliberately left out: the manager never needs it, and
 * omitting it keeps the secret out of anything that serializes the config.
 *
 * Returns the configuration unchanged when no credentials are stored.
 */
export function withUserProvider(config: LLMConfiguration): LLMConfiguration {
  const creds = getUserLLM();
  if (!config || !creds) return config;
  return {
    ...config,
    providers: {
      ...config.providers,
      [USER_PROVIDER_NAME]: {
        models: {
          [creds.modelId]: {
            model_id: creds.modelId,
            capabilities: USER_MODEL_CAPABILITIES,
          },
        },
      },
    },
  };
}

/**
 * The credentials in the shape the backend expects on the wire, or undefined
 * when none are stored. The base URL is normalized here so the backend receives
 * a value it can use directly.
 */
export function userLLMPayload(): UserLLMPayload | undefined {
  const creds = getUserLLM();
  if (!creds) return undefined;
  return {
    apiKey: creds.apiKey,
    baseUrl: creds.baseUrl ? normalizeBaseUrl(creds.baseUrl) : undefined,
    modelId: creds.modelId,
  };
}

/** The endpoint used when no base URL is given. */
export const DEFAULT_BASE_URL = 'https://api.openai.com/v1';

/**
 * Normalize a base URL the way the backend does: strip trailing slashes and
 * append `/v1` when it is not already there, so a user can paste either
 * `https://host` or `https://host/v1` and get the same result.
 */
export function normalizeBaseUrl(url?: string): string {
  const trimmed = (url || '').trim().replace(/\/+$/, '');
  if (!trimmed) return DEFAULT_BASE_URL;
  return trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`;
}

/**
 * Ask an OpenAI-compatible endpoint which models it offers (`GET /models`).
 *
 * Returns the model ids, sorted. Throws with a readable message on failure —
 * callers should let an `AbortError` pass through untouched, since that means
 * the caller cancelled the request rather than the endpoint refusing it.
 *
 * @param apiKey the key to authenticate with
 * @param baseUrl optional base URL; defaults to OpenAI
 * @param signal abort signal, so an in-flight lookup can be cancelled
 */
export async function fetchAvailableModels(apiKey: string, baseUrl: string | undefined, signal: AbortSignal): Promise<string[]> {
  const url = `${normalizeBaseUrl(baseUrl)}/models`;
  let res: Response;
  try {
    res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` }, signal });
  } catch (e) {
    // Let cancellation propagate so the caller can ignore it
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    // A network-level failure here is usually CORS, a bad host, or (for an
    // http:// endpoint) the page's own content-security policy
    throw new Error('Could not reach that endpoint');
  }
  if (res.status === 401 || res.status === 403) {
    throw new Error('That key was rejected');
  }
  if (!res.ok) {
    throw new Error(`Endpoint returned ${res.status}`);
  }
  const body = (await res.json()) as { data?: { id?: string }[] };
  const ids = (body?.data || []).map((m) => m?.id).filter((id): id is string => typeof id === 'string' && id.length > 0);
  if (ids.length === 0) throw new Error('No models returned');
  // Returned unfiltered: capable chat models are not reliably identifiable by
  // name (o-series, chatgpt-*, and every non-OpenAI endpoint's own naming), so
  // filtering would hide working models rather than only unusable ones
  return ids.sort((a, b) => a.localeCompare(b));
}
