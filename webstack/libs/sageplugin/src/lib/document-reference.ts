import type { PluginDocumentReference } from './protocol';

const isIdentifier = (value: unknown): value is string => typeof value === 'string' && /^[a-zA-Z0-9_-]+$/.test(value);

export function formatDocumentReference(reference: PluginDocumentReference): string {
  if (
    !isIdentifier(reference.appId) ||
    !Number.isSafeInteger(reference.page) ||
    reference.page < 0 ||
    (reference.assetId !== undefined && !isIdentifier(reference.assetId))
  ) {
    throw new Error('A document reference requires an app ID and a nonnegative integer page.');
  }

  const url = new URL(`sage3://document/${reference.appId}`);
  url.searchParams.set('page', String(reference.page));

  if (reference.assetId !== undefined) {
    url.searchParams.set('assetId', reference.assetId);
  }

  return url.href;
}

export function parseDocumentReference(value: string): PluginDocumentReference | undefined {
  try {
    const url = new URL(value);

    if (url.protocol !== 'sage3:' || url.host !== 'document') {
      return undefined;
    }

    const appId = decodeURIComponent(url.pathname.slice(1));
    const pageValue = url.searchParams.get('page');
    const assetId = url.searchParams.get('assetId');

    if (
      !isIdentifier(appId) ||
      pageValue === null ||
      !/^(0|[1-9][0-9]*)$/.test(pageValue) ||
      (assetId !== null && !isIdentifier(assetId))
    ) {
      return undefined;
    }

    const reference = { appId, page: Number(pageValue) };
    return assetId === null ? reference : { ...reference, assetId };
  } catch {
    return undefined;
  }
}
