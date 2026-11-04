import { SAGE3Plugin } from '@sage3/sageplugin';
import type { PluginAppRecord, PluginText } from '@sage3/sageplugin';
import { cardOf, object } from './model';

const plugin = new SAGE3Plugin();

const title = document.getElementById('title') as HTMLInputElement;
const body = document.getElementById('body') as HTMLTextAreaElement;
const style = document.getElementById('style') as HTMLSelectElement;
const decorationInput = document.getElementById('deco') as HTMLSelectElement;
const tilt = document.getElementById('tilt') as HTMLInputElement;
const columnsInput = document.getElementById('cols') as HTMLInputElement;
const collect = document.getElementById('collect') as HTMLInputElement;
const accents = document.getElementById('accent')!;
const status = document.getElementById('status')!;

let cardId: string | undefined;
let bodyDocument: PluginText | undefined;
let unbindBody: (() => void) | undefined;

body.disabled = true;

const report = (error: unknown): void => {
  status.textContent = `Could not save: ${error instanceof Error ? error.message : String(error)}`;
};

async function patch(field: string, value: unknown): Promise<void> {
  if (!cardId) {
    return;
  }

  status.textContent = 'Saving…';
  await plugin.request('app.content.patch', {
    appId: cardId,
    changes: [{ op: 'set', path: ['card', field], value }],
  });

  status.textContent = 'Saved';
}

for (const [name, color] of Object.entries({
  yellow: '#fff08c',
  pink: '#ffb7c9',
  green: '#b9dc8c',
  blue: '#b3dbff',
  purple: '#dccbf6',
  orange: '#ffd2a1',
})) {
  const button = document.createElement('button');
  button.type = 'button';
  button.title = name;
  button.dataset.accent = name;
  button.style.background = color;
  button.addEventListener('click', () => void patch('accent', name).catch(report));
  accents.append(button);
}

function fill(app: PluginAppRecord): void {
  const card = cardOf(app.data.state.content);

  // Never replace the bound textarea, or an actively edited metadata input.
  if (document.activeElement !== title) {
    title.value = card.title ?? '';
  }
  if (document.activeElement !== style) {
    style.value = card.style ?? 'paper';
  }
  if (document.activeElement !== decorationInput) {
    decorationInput.value = card.deco ?? '';
  }
  if (document.activeElement !== tilt) {
    tilt.value = String(card.tilt ?? 0);
  }

  columnsInput.checked = card.cols === 2;
  accents.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
    button.classList.toggle('on', button.dataset.accent === (card.accent ?? 'yellow'));
  });
}

async function load(app?: PluginAppRecord): Promise<void> {
  const init = await plugin.ready;
  if (!app || app.data.state.pluginId !== init.pluginId || app.data.state.viewId !== 'card') {
    status.textContent = 'Open the editor on a note card.';
    return;
  }

  fill(app);
  if (app._id === cardId) {
    return;
  }

  if (bodyDocument) {
    await bodyDocument.flush();
  }
  unbindBody?.();
  bodyDocument?.dispose();

  cardId = app._id;
  body.disabled = true;
  bodyDocument = await plugin.openText('body', cardId);
  unbindBody = bodyDocument.bindTextarea(body);
  body.disabled = false;

  collect.checked = object(plugin.state.value.target).appId === cardId;
  status.textContent = 'Editing note';
}

title.addEventListener('input', () => void patch('title', title.value).catch(report));
style.addEventListener('change', () => void patch('style', style.value).catch(report));
decorationInput.addEventListener('change', () => void patch('deco', decorationInput.value).catch(report));
tilt.addEventListener('input', () => void patch('tilt', Number(tilt.value)).catch(report));
columnsInput.addEventListener('change', () => void patch('cols', columnsInput.checked ? 2 : 1).catch(report));

body.addEventListener('input', () => {
  status.textContent = 'Saving…';

  // The binding's input listener runs later in this same DOM event.
  queueMicrotask(() => {
    void bodyDocument
      ?.flush()
      .then(() => {
        status.textContent = 'Saved';
      })
      .catch(report);
  });
});

collect.addEventListener('change', () => {
  if (!cardId) {
    return;
  }

  void plugin
    .request('state.patch', {
      changes: [{ op: 'set', path: ['target'], value: collect.checked ? { appId: cardId } : null }],
    })
    .catch(report);
});

document.querySelectorAll<HTMLButtonElement>('.tools button').forEach((button) => {
  button.addEventListener('click', () => {
    if (!bodyDocument) {
      return;
    }

    let start = body.selectionStart;
    const end = body.selectionEnd;
    const selection = body.value.slice(start, end);
    let replacement = selection;
    let remove = end - start;

    if (button.dataset.wrap) {
      const [left, right] = button.dataset.wrap.split('|');
      replacement = `${left}${selection || 'text'}${right}`;
    } else if (button.dataset.line) {
      start = body.value.lastIndexOf('\n', start - 1) + 1;
      remove = 0;
      replacement = button.dataset.line;
    } else if (button.dataset.link !== undefined) {
      const isUrl = /^https?:\/\//.test(selection);
      const label = isUrl ? 'link' : selection || 'link';
      const url = isUrl ? selection : 'https://';
      replacement = `[${label}](${url})`;
    }

    const documentText = bodyDocument.text;
    documentText.doc!.transact(() => {
      if (remove) {
        documentText.delete(start, remove);
      }
      documentText.insert(start, replacement);
    });

    body.focus();
    const cursorPosition = start + replacement.length;
    body.setSelectionRange(cursorPosition, cursorPosition);

    void bodyDocument
      .flush()
      .then(() => {
        status.textContent = 'Saved';
      })
      .catch(report);
  });
});

plugin.on('state', (snapshot) => {
  collect.checked = object(snapshot.value.target).appId === cardId;
});

plugin.on('app', (app) => {
  if (app._id === cardId) {
    fill(app);
  }
});

plugin.on('context', (context) => {
  if (context.app?._id !== cardId) {
    void load(context.app).catch(report);
  }
});

plugin.on('error', report);

void plugin.ready.then((init) => load(init.app ?? init.context.app)).catch(report);

window.addEventListener('pagehide', () => {
  unbindBody?.();
  bodyDocument?.dispose();
  plugin.dispose();
});
