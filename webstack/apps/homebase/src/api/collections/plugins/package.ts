import JSZip from 'jszip';
import { createHash } from 'crypto';
import { Readable } from 'stream';
import { pluginManifestSchema } from '@sage3/shared/types';

const MAX_EXPANDED_BYTES = 100 * 1024 * 1024;
const safePath = (name: string) =>
  /^[a-zA-Z0-9_./ -]+$/.test(name) && name.split('/').every((part) => part !== '' && part !== '.' && part !== '..');

/** Validate every byte and entry before the caller touches an installed package. */
export async function readPluginPackage(bytes: Uint8Array) {
  const zip = await JSZip.loadAsync(bytes);
  const entries = Object.values(zip.files);
  if (entries.length > 10000) {
    throw new Error('ZIP must contain at most 10,000 entries.');
  }

  // JSZip stores each file under its resolved name, which equals the original when the original is safe.
  // Directories are never written. Files are written as regular files, so link entries stay inert.
  for (const entry of entries) {
    if (!entry.dir && !safePath(entry.unsafeOriginalName ?? entry.name)) {
      throw new Error('Unsafe ZIP path.');
    }
  }

  const isManifest = (entry: JSZip.JSZipObject) => !entry.dir && /(^|\/)manifest\.json$/.test(entry.name);
  const manifestEntry = entries.find(isManifest);
  if (!manifestEntry || entries.findLast(isManifest) !== manifestEntry) {
    throw new Error('Package must contain exactly one manifest.json.');
  }

  const prefix = manifestEntry.name.slice(0, -'manifest.json'.length);
  const files: { readonly name: string; readonly contents: Buffer }[] = [];
  let expandedBytes = 0;

  for (const entry of entries) {
    if (entry.dir) {
      continue;
    }
    if (entry.name.startsWith('__MACOSX/') || entry.name.endsWith('/.DS_Store') || entry.name === '.DS_Store') {
      continue;
    }
    if (!entry.name.startsWith(prefix)) {
      throw new Error('All package files must be inside the manifest directory.');
    }

    // Whole safe segments after the manifest directory remain a safe relative path.
    const name = entry.name.slice(prefix.length);

    const chunks: Buffer[] = [];
    let size = 0;

    // The Node iterator destroys the stream on early exit, stopping inflation at the limit.
    // JSZip's node stream emits Buffer chunks.
    for await (const chunk of new Readable().wrap(entry.nodeStream()) as AsyncIterable<Buffer>) {
      size += chunk.length;
      expandedBytes += chunk.length;
      if (expandedBytes > MAX_EXPANDED_BYTES) {
        throw new Error('Expanded package exceeds 100 MB.');
      }
      chunks.push(chunk);
    }

    files.push({ name, contents: Buffer.concat(chunks, size) });
  }

  const manifestBytes = files.find((file) => file.name === 'manifest.json')?.contents;
  if (!manifestBytes || manifestBytes.length > 64 * 1024) {
    throw new Error('manifest.json is missing or exceeds 64 KB.');
  }

  const manifest = pluginManifestSchema.parse(JSON.parse(manifestBytes.toString('utf8')) as unknown);
  const requireEntry = (entry: string) => {
    if (!files.some((file) => file.name === entry)) {
      throw new Error(`Missing packaged entry: ${entry}`);
    }
  };

  requireEntry(manifest.entry);
  manifest.views?.forEach((view) => requireEntry(view.entry));

  return {
    digest: createHash('sha256').update(bytes).digest('hex'),
    manifest,
    files,
  };
}
