import JSZip from 'jszip';
import { createHash } from 'crypto';
import { pluginManifestSchema } from '@sage3/shared/types';
import { readPluginPackage } from './package';

const manifest = {
  id: 'reading',
  apiVersion: 1,
  name: 'Reading',
  description: 'Reading notes',
  entry: 'controller.html',
  capabilities: ['apps.write'],
};

it('accepts a complete root or folder package and validates every declared view', async () => {
  for (const prefix of ['', 'reading/']) {
    const zip = new JSZip();
    zip.file(
      `${prefix}manifest.json`,
      JSON.stringify({
        ...manifest,
        views: [
          {
            id: 'notes',
            title: 'Notes',
            kind: 'panel',
            scope: 'board',
            entry: 'views/notes.html',
          },
        ],
      }),
    );
    zip.file(`${prefix}controller.html`, '<!doctype html>');
    zip.file(`${prefix}views/notes.html`, '<!doctype html>');

    const bytes = await zip.generateAsync({ type: 'uint8array' });
    const result = await readPluginPackage(bytes);

    expect(result.digest).toBe(createHash('sha256').update(bytes).digest('hex'));
    expect(result.manifest.id).toBe('reading');
    expect(result.files.find((file) => file.name === 'views/notes.html')?.contents.toString('utf8')).toBe('<!doctype html>');

    zip.remove(`${prefix}views/notes.html`);
    await expect(readPluginPackage(await zip.generateAsync({ type: 'uint8array' }))).rejects.toThrow('Missing packaged entry');
  }
});

it('binds approval identity to all uploaded bytes, including unchanged-manifest code replacements', async () => {
  const zip = new JSZip();
  zip.file('manifest.json', JSON.stringify(manifest));
  zip.file('controller.html', '<!doctype html><p>original</p>');

  const bytes = await zip.generateAsync({ type: 'uint8array' });
  const original = await readPluginPackage(bytes);

  expect((await readPluginPackage(bytes)).digest).toBe(original.digest);

  zip.file('controller.html', '<!doctype html><p>replacement</p>');
  const replacement = await readPluginPackage(await zip.generateAsync({ type: 'uint8array' }));

  expect(replacement.manifest).toEqual(original.manifest);
  expect(replacement.digest).not.toBe(original.digest);
});

it('rejects entry and archive path traversal', async () => {
  for (const entry of ['../../escape.html', '/escape.html', 'https://example.com/main.html', 'nested/../../main.html']) {
    expect(pluginManifestSchema.safeParse({ ...manifest, entry }).success).toBe(false);
  }

  const zip = new JSZip();
  zip.file('manifest.json', JSON.stringify(manifest));
  zip.file('controller.html', '<!doctype html>');
  zip.file('../../escape.js', '/etc/passwd');

  await expect(readPluginPackage(await zip.generateAsync({ type: 'uint8array' }))).rejects.toThrow('Unsafe ZIP path');
});

it('stops compressed extraction when aggregate expanded data exceeds the package limit', async () => {
  const zip = new JSZip();
  zip.file('manifest.json', JSON.stringify(manifest));
  zip.file('controller.html', '<!doctype html>');

  const repeated = Buffer.alloc(8 * 1024 * 1024, 65);
  for (let index = 0; index < 13; index++) {
    zip.file(`data-${index}.txt`, repeated);
  }

  const bytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });

  await expect(readPluginPackage(bytes)).rejects.toThrow('Expanded package exceeds 100 MB.');
}, 30000);
