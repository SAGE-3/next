import { isPluginRecord, SAGE3Plugin } from '@sage3/sageplugin';
import type { PluginState } from '@sage3/sageplugin';
import { returnToSource, showError } from './source';

const plugin = new SAGE3Plugin();
const label = document.querySelector<HTMLElement>('#source');
const status = document.querySelector<HTMLElement>('#status');
const page = document.querySelector<HTMLInputElement>('#page');
const save = document.querySelector<HTMLButtonElement>('#save');
const open = document.querySelector<HTMLButtonElement>('#open');
const select = document.querySelector<HTMLSelectElement>('#pdf');
const attach = document.querySelector<HTMLButtonElement>('#attach');

if (!label || !status || !page || !save || !open || !select || !attach) {
  throw new Error('Bookmark markup is incomplete.');
}

const render = (content: PluginState): void => {
  const savedPage =
    isPluginRecord(content) && typeof content.assetId === 'string' && typeof content.page === 'number' ? content.page : undefined;

  label.textContent = savedPage !== undefined ? `PDF page ${savedPage + 1}` : 'Choose a PDF to save its current page.';

  if (savedPage !== undefined && document.activeElement !== page) {
    page.value = String(savedPage + 1);
  }

  open.disabled = savedPage === undefined;
  save.disabled = savedPage === undefined;
};

plugin.on('app', (app) => {
  const content = app.data.state.content;
  render(isPluginRecord(content) ? content : {});
});

plugin.on('error', (error) => showError(status, error));

void plugin.ready
  .then(async (init) => {
    if (!init.app) {
      throw new Error('This view must run in a board bookmark app.');
    }

    const content = await plugin.request('app.content.get', {});
    render(content.value);

    const apps = await plugin.request('apps.list');

    for (const app of apps) {
      if (app.data.type !== 'PDFViewer') {
        continue;
      }

      const option = document.createElement('option');

      option.value = app._id;
      option.textContent = app.data.title || 'PDF';
      select.append(option);
    }

    attach.disabled = select.options.length === 0;
  })
  .catch((error: unknown) => showError(status, error));

attach.addEventListener('click', () => {
  attach.disabled = true;

  const capture = async (): Promise<void> => {
    const apps = await plugin.request('apps.list');
    const source = apps.find((app) => app._id === select.value && app.data.type === 'PDFViewer');

    if (
      !source ||
      typeof source.data.state.assetid !== 'string' ||
      typeof source.data.state.currentPage !== 'number' ||
      !Number.isInteger(source.data.state.currentPage) ||
      source.data.state.currentPage < 0 ||
      typeof source.data.state.numPages !== 'number' ||
      source.data.state.numPages <= source.data.state.currentPage
    ) {
      throw new Error('Choose a loaded PDF.');
    }

    const content = await plugin.request('app.content.patch', {
      changes: [
        { op: 'set', path: ['appId'], value: source._id },
        { op: 'set', path: ['assetId'], value: source.data.state.assetid },
        { op: 'set', path: ['page'], value: source.data.state.currentPage },
        { op: 'delete', path: ['selection'] },
      ],
    });

    render(content.value);
    status.textContent = 'Source page saved for everyone on this board.';
  };

  void capture()
    .catch((error: unknown) => showError(status, error))
    .finally(() => {
      attach.disabled = false;
    });
});

save.addEventListener('click', () => {
  const value = Number(page.value);

  if (!Number.isInteger(value) || value < 1) {
    showError(status, new Error('Enter a positive whole page number.'));
    return;
  }

  save.disabled = true;

  const savePage = async (): Promise<void> => {
    const snapshot = await plugin.request('app.content.get', {});
    const content = snapshot.value;

    if (typeof content.appId !== 'string' || typeof content.assetId !== 'string') {
      throw new Error('Save a source PDF first.');
    }

    const apps = await plugin.request('apps.list');
    const source = apps.find(
      (app) => app._id === content.appId && app.data.type === 'PDFViewer' && app.data.state.assetid === content.assetId,
    );

    if (!source || typeof source.data.state.numPages !== 'number' || value > source.data.state.numPages) {
      throw new Error('The page is outside the source PDF, or the source is no longer on this board.');
    }

    // Reject a stale edit if another reader replaced the source during validation.
    const saved = await plugin.request('app.content.patch', {
      changes: [{ op: 'set', path: ['page'], value: value - 1 }],
      expectedRevision: snapshot.revision,
    });

    render(saved.value);
    status.textContent = 'Bookmark page saved.';
  };

  void savePage()
    .catch((error: unknown) => showError(status, error))
    .finally(() => {
      save.disabled = false;
    });
});

open.addEventListener('click', () => {
  open.disabled = true;

  void plugin
    .request('app.content.get', {})
    .then((snapshot) => returnToSource(plugin, snapshot.value))
    .then(() => {
      status.textContent = 'The PDF now shows the saved page for everyone.';
    })
    .catch((error: unknown) => showError(status, error))
    .finally(() => {
      open.disabled = false;
    });
});
