import { SAGE3Plugin, parseDocumentReference } from '@sage3/sageplugin';
import type { PluginAsset, PluginState } from '@sage3/sageplugin';
import JSZip from 'jszip';
import { object } from './model';
import { parseBoard, remapReferences } from './portable';
import type { PortableApp, PortableBoard } from './portable';

const plugin = new SAGE3Plugin();
const fileInput = document.querySelector<HTMLInputElement>('#file')!;
const run = document.querySelector<HTMLButtonElement>('#run')!;
const exportButton = document.querySelector<HTMLButtonElement>('#export')!;
const log = document.querySelector<HTMLElement>('#log')!;
const summary = document.querySelector<HTMLElement>('#summary')!;
let loaded: { board: PortableBoard; zip: JSZip } | undefined;

const views = ['card', 'flashcards', 'compare'];

function say(text: string, kind = ''): void {
  const item = document.createElement('li');
  item.textContent = text;
  item.className = kind;
  log.append(item);
  item.scrollIntoView({ block: 'end' });
}

fileInput.addEventListener('change', () => {
  log.textContent = '';
  loaded = undefined;
  run.disabled = true;

  const file = fileInput.files?.[0];
  if (!file) {
    return;
  }

  void (async () => {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const manifest = zip.file('board.json');

    if (!manifest) {
      throw new Error('ZIP has no board.json.');
    }

    const board = parseBoard(JSON.parse(await manifest.async('string')));
    for (const asset of board.assets) {
      if (!zip.file(asset.path)) {
        throw new Error(`Missing binary for asset ${asset.id}.`);
      }

      for (const preview of asset.previews) {
        if (!zip.file(preview.path)) {
          throw new Error(`Missing page preview for ${asset.id}.`);
        }
      }
    }

    loaded = { board, zip };
    summary.textContent = `${board.apps.length} apps, ${board.assets.length} assets, ${board.links.length} links from board ${board.boardId}.`;

    for (const app of board.apps) {
      if (app.type === 'SageCell') {
        say(`Unsupported SageCell: ${app.title}. Code is never executed or imported.`, 'warn');
      }
    }

    run.disabled = false;
  })().catch((error: unknown) => {
    summary.textContent = error instanceof Error ? error.message : String(error);
  });
});

run.addEventListener('click', () => {
  if (!loaded) {
    return;
  }

  run.disabled = true;
  exportButton.disabled = true;

  void importBoard(loaded.board, loaded.zip)
    .catch((error: unknown) => say(`Import stopped: ${String(error)}. Successfully created records are retained.`, 'err'))
    .finally(() => {
      run.disabled = false;
      exportButton.disabled = false;
    });
});

exportButton.addEventListener('click', () => {
  exportButton.disabled = true;
  run.disabled = true;
  log.textContent = '';

  void exportBoard()
    .catch((error: unknown) => say(`Export stopped: ${String(error)}`, 'err'))
    .finally(() => {
      exportButton.disabled = false;
      run.disabled = !loaded;
    });
});

async function exportBoard(): Promise<void> {
  const init = await plugin.ready;
  const apps = await plugin.request('apps.list');
  const links = await plugin.request('links.list');
  const assets = await plugin.request('assets.list');
  const shared = await plugin.request('state.get');

  const zip = new JSZip();
  const board: PortableBoard = {
    format: 'sage3-study-notes',
    version: 2,
    boardId: init.boardId,
    installationId: init.pluginId,
    manifestId: 'study-notes',
    state: shared.value,
    apps: [],
    assets: [],
    links: links.map((link) => ({
      id: link._id,
      source: link.data.sourceAppId,
      target: link.data.targetAppId,
      metadata: link.data.metadata,
    })),
  };

  const assetIds: string[] = [];
  const previews: { readonly id: string; pages: number[] }[] = [];

  const addAsset = (id: string) => {
    if (!assetIds.includes(id)) {
      assetIds.push(id);
    }
  };

  const addPreview = (id: string, page: number) => {
    addAsset(id);
    const preview = previews.find((entry) => entry.id === id);

    if (!preview) {
      previews.push({ id, pages: [page] });
    } else if (!preview.pages.includes(page)) {
      preview.pages.push(page);
    }
  };

  const collect = (value: unknown): void => {
    if (typeof value === 'string') {
      if (assets.some((asset) => asset.id === value)) {
        addAsset(value);
      }

      for (const match of value.matchAll(/(?:^|\n)\s*img:\s*([\w-]+)(?:\s*\|[^\n|]*\|\s*(\d+))?/g)) {
        if (match[2] === undefined) {
          addAsset(match[1]);
        } else {
          addPreview(match[1], Number(match[2]));
        }
      }

      for (const match of value.matchAll(/sage3:\/\/[^\s)\]<>"']+/g)) {
        const reference = parseDocumentReference(match[0]);
        if (reference?.assetId) {
          addPreview(reference.assetId, reference.page);
        }
      }
    } else if (Array.isArray(value)) {
      value.forEach(collect);
    } else if (value && typeof value === 'object') {
      const record = object(value);
      if (typeof record.assetId === 'string' && Number.isInteger(record.page)) {
        addPreview(record.assetId, Number(record.page));
      }

      Object.values(value).forEach(collect);
    }
  };

  for (const app of apps) {
    const state = app.data.state;
    const entry: PortableApp = {
      id: app._id,
      type: app.data.type,
      title: app.data.title,
      position: { x: app.data.position.x, y: app.data.position.y },
      size: { width: app.data.size.width, height: app.data.size.height },
    };

    if (app.data.type === 'PluginApp' && state.pluginId === init.pluginId && views.includes(String(state.viewId))) {
      entry.installationId = init.pluginId;
      entry.manifestId = 'study-notes';
      entry.viewId = String(state.viewId);
      entry.content = object(state.content);
      entry.texts = {};

      if (entry.viewId === 'card') {
        const text = await plugin.openText('body', app._id);

        try {
          entry.texts.body = text.value;
        } finally {
          text.dispose();
        }
      }
    } else if (app.data.type === 'PDFViewer') {
      entry.state = {
        assetid: state.assetid,
        currentPage: state.currentPage,
        numPages: state.numPages,
        displayPages: state.displayPages,
      };

      if (typeof state.assetid === 'string') {
        const assetId = state.assetid;
        const pages = [Number(state.currentPage ?? 0)];
        const preview = previews.find((entry) => entry.id === assetId);

        // The viewer's current page replaces pages referenced earlier for this asset.
        if (preview) {
          preview.pages = pages;
        } else {
          previews.push({ id: assetId, pages });
        }
      }
    } else if (app.data.type === 'ImageViewer') {
      entry.state = { assetid: state.assetid, annotations: state.annotations, boxes: state.boxes };
    } else if (app.data.type === 'Stickie') {
      entry.state = { text: state.text, fontSize: state.fontSize, color: state.color, lock: state.lock, sources: state.sources };
    } else if (app.data.type === 'Notepad') {
      const ops = object(state.content).ops;

      if (!Array.isArray(ops) || ops.some((op) => typeof object(op).insert !== 'string')) {
        say(`Unsupported Notepad embeds: ${app.data.title}; not imported.`, 'warn');
      } else {
        entry.state = { content: { ops: ops.map((op) => ({ insert: object(op).insert })) } };
        if (ops.some((op) => object(op).attributes)) {
          say(`Notepad ${app.data.title}: exported saved plain text; rich formatting is not portable.`, 'warn');
        }
      }
    } else {
      say(`Retaining unsupported ${app.data.type} in diagnostics: ${app.data.title}`, 'warn');
    }

    board.apps.push(entry);
    collect(entry);
  }

  collect(board.state);
  collect(board.links);

  for (const id of assetIds) {
    const asset = assets.find((candidate) => candidate.id === id);

    if (!asset) {
      throw new Error(`Referenced asset ${id} is unavailable in this room.`);
    }

    const path = `assets/${id}`;
    const binary = await plugin.request('assets.read', { id });
    zip.file(path, await binary.arrayBuffer());
    const entry = { ...asset, path, previews: [] as { page: number; path: string; mimeType: string }[] };

    for (const page of previews.find((entry) => entry.id === id)?.pages ?? []) {
      const preview = await plugin.request('assets.read', { id, page });
      const path = `previews/${id}/${page}`;
      zip.file(path, await preview.arrayBuffer());
      entry.previews.push({ page, path, mimeType: preview.type });
    }

    board.assets.push(entry);
    say(`Packed ${asset.name} (${id})`);
  }

  zip.file('board.json', JSON.stringify(board, null, 2));
  const binary = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  await plugin.request('ui.download', { name: 'study-notes-board.zip', data: binary });
  say('Export accepted by the host. Use its save confirmation if shown; check your browser downloads for completion.', 'ok');
}

async function importBoard(board: PortableBoard, zip: JSZip): Promise<void> {
  const init = await plugin.ready;
  const context = await plugin.request('context.get');
  const origin = context.position ?? {
    x: context.viewport.position.x + context.viewport.size.width / 2,
    y: context.viewport.position.y + context.viewport.size.height / 2,
  };
  const minX = Math.min(0, ...board.apps.map((app) => app.position.x));
  const minY = Math.min(0, ...board.apps.map((app) => app.position.y));

  const ids = new Map<string, string>([
    [board.installationId, init.pluginId],
    [board.boardId, init.boardId],
  ]);
  const uploaded = new Map<string, PluginAsset>();
  const createdApps = new Map<string, string>();

  for (const asset of board.assets) {
    const bytes = await zip.file(asset.path)!.async('arraybuffer');
    const data = new Blob([bytes], { type: asset.mimeType });
    const result = await plugin.request('assets.upload', { name: asset.name, data });
    ids.set(asset.id, result.id);
    uploaded.set(asset.id, result);
    say(`Uploaded ${asset.name}: ${asset.id} → ${result.id}`);
  }

  for (const app of board.apps) {
    const common = {
      title: app.title,
      position: { x: origin.x + app.position.x - minX, y: origin.y + app.position.y - minY },
      size: app.size,
    };

    let state: PluginState;
    if (
      app.type === 'PluginApp' &&
      app.manifestId === 'study-notes' &&
      app.installationId === board.installationId &&
      views.includes(app.viewId ?? '')
    ) {
      state = { pluginId: init.pluginId, viewId: app.viewId, content: {} };
    } else if (app.type === 'PDFViewer' || app.type === 'ImageViewer') {
      const source = object(app.state);
      const asset = uploaded.get(String(source.assetid));

      if (!asset) {
        throw new Error(`No binary for ${app.title} (${String(source.assetid)}).`);
      }

      state =
        app.type === 'PDFViewer'
          ? {
              assetid: asset.id,
              currentPage: Number(source.currentPage ?? 0),
              numPages: asset.pageCount ?? Number(source.numPages ?? 1),
              displayPages: Number(source.displayPages ?? 1),
            }
          : { assetid: asset.id };
    } else if (app.type === 'Stickie') {
      state = {};
    } else if (app.type === 'Notepad' && app.state) {
      state = app.state;
    } else {
      say(`Unsupported ${app.type}: ${app.title}; not imported${app.type === 'SageCell' ? ' and never executed' : ''}.`, 'warn');
      continue;
    }

    const created = await plugin.request('apps.create', {
      ...common,
      type: app.type as 'PluginApp' | 'PDFViewer' | 'ImageViewer' | 'Stickie' | 'Notepad',
      state,
    });
    ids.set(app.id, created._id);
    createdApps.set(app.id, created._id);
    say(`Created ${app.type}: ${app.title}`);
  }

  const createdLinks = new Map<string, string>();

  for (const link of board.links) {
    const sourceAppId = createdApps.get(link.source);
    const targetAppId = createdApps.get(link.target);

    if (!sourceAppId || !targetAppId) {
      say(`Skipped link ${link.id}: an endpoint was unsupported.`, 'warn');
      continue;
    }
    const result = await plugin.request('links.create', {
      key: `import:${link.id}:${sourceAppId}:${targetAppId}`,
      sourceAppId,
      targetAppId,
    });
    ids.set(link.id, result._id);
    createdLinks.set(link.id, result._id);
  }

  // Resolve metadata only after every link has its destination identity.
  for (const link of board.links) {
    const id = createdLinks.get(link.id);

    if (!id || !link.metadata || !Object.keys(link.metadata).length) {
      continue;
    }

    const sourceAppId = createdApps.get(link.source)!;
    const targetAppId = createdApps.get(link.target)!;
    await plugin.request('links.remove', { id });
    await plugin.request('links.create', {
      key: `import:${link.id}:${sourceAppId}:${targetAppId}`,
      sourceAppId,
      targetAppId,
      metadata: object(remapReferences(link.metadata, ids)),
    });
  }

  for (const app of board.apps) {
    const appId = createdApps.get(app.id);

    if (!appId) {
      continue;
    }

    if (app.type === 'PluginApp') {
      const content = object(remapReferences(app.content ?? {}, ids));
      const changes = Object.entries(content).map(([key, value]) => ({ op: 'set' as const, path: [key], value }));

      if (changes.length) {
        await plugin.request('app.content.patch', { appId, changes });
      }

      for (const [field, value] of Object.entries(app.texts ?? {})) {
        const text = await plugin.openText(field, appId);

        try {
          text.text.insert(0, String(remapReferences(value, ids)));
          await text.flush();
        } finally {
          text.dispose();
        }
      }
    } else if (app.type === 'Stickie' || app.type === 'ImageViewer') {
      await plugin.request('apps.update', { id: appId, updates: { state: object(remapReferences(app.state, ids)) } });
    }
  }

  const state = object(remapReferences(board.state, ids));
  const changes = Object.entries(state).map(([key, value]) => ({ op: 'set' as const, path: [key], value }));

  if (changes.length) {
    await plugin.request('state.patch', { changes });
  }

  say(`Imported ${createdApps.size} apps, ${uploaded.size} assets, ${createdLinks.size} links.`, 'ok');
}

plugin.on('error', (error) => say(error.message, 'err'));
window.addEventListener('pagehide', () => plugin.dispose());
