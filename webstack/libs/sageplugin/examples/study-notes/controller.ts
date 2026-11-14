import { SAGE3Plugin, formatDocumentReference } from '@sage3/sageplugin';
import type { PluginAppRecord, PluginContext, PluginPoint } from '@sage3/sageplugin';
import { cardOf, object } from './model';
import type { Card } from './model';

const plugin = new SAGE3Plugin();

const placeNear = (context: PluginContext, width: number): PluginPoint => {
  const app = context.app?.data;
  if (app) {
    return { x: app.position.x + app.size.width + 40, y: app.position.y };
  }

  const center = context.position ?? {
    x: context.viewport.position.x + context.viewport.size.width / 2,
    y: context.viewport.position.y + context.viewport.size.height / 2,
  };

  return { x: center.x - width / 2, y: center.y };
};

const requireCard = async (app?: PluginAppRecord): Promise<PluginAppRecord> => {
  const init = await plugin.ready;

  if (!app || app.data.type !== 'PluginApp' || app.data.state.pluginId !== init.pluginId || app.data.state.viewId !== 'card') {
    throw new Error('That is not a note card.');
  }

  return app;
};

const createCard = async (title: string, position: PluginPoint, card: Card, body: string) => {
  const init = await plugin.ready;
  const created = await plugin.request('apps.create', {
    type: 'PluginApp',
    title,
    size: { width: 700, height: 600 },
    position,
    state: { pluginId: init.pluginId, viewId: 'card', content: { card } },
  });

  const text = await plugin.openText('body', created._id);

  try {
    text.text.insert(0, body);
    await text.flush();
  } finally {
    text.dispose();
  }

  return created;
};

const pdfSource = (context: PluginContext) => {
  if (context.app?.data.type !== 'PDFViewer' || !context.document) {
    throw new Error('Select a PDF first.');
  }

  return { app: context.app, doc: context.document };
};

const shortName = (title: string): string => {
  const words = title
    .replace(/\s+-\s+\d+ of \d+$/, '')
    .replace(/\.pdf$/i, '')
    .split(/[_\s]+/)
    .map((word) => word.toLowerCase());

  const year = words.find((word) => /^(19|20)\d\d$/.test(word));

  return year ? `${words[0]} ${year}` : words.slice(0, 3).join(' ');
};

plugin.onCommand('collect-here', async (context) => {
  const card = await requireCard(context.app);
  const state = await plugin.request('state.get');

  await plugin.request('state.patch', {
    changes: [
      {
        op: 'set',
        path: ['target'],
        value: object(state.value.target).appId === card._id ? null : { appId: card._id },
      },
    ],
  });
});

plugin.onCommand('duplicate-card', async (context) => {
  const card = await requireCard(context.app);
  const copy = cardOf(card.data.state.content);
  const text = await plugin.openText('body', card._id);

  try {
    await createCard(card.data.title, placeNear(context, 700), { ...copy, title: copy.title ? `${copy.title} (copy)` : '' }, text.value);
  } finally {
    text.dispose();
  }
});

plugin.onCommand('quote-to-card', async (context) => {
  const { app: pdf, doc: documentContext } = pdfSource(context);
  const quote = documentContext.selection?.text.replace(/\s+/g, ' ').trim();
  const reference = formatDocumentReference({
    appId: pdf._id,
    assetId: documentContext.assetId,
    page: documentContext.page,
  });
  const sourceLink = `[p${documentContext.page + 1}](${reference})`;
  const line = quote ? `> "${quote}" ${sourceLink}` : `* ${sourceLink}`;

  const state = await plugin.request('state.get');
  const targetId = object(state.value.target).appId;
  const apps = await plugin.request('apps.list');
  let target = apps.find((app) => app._id === targetId);

  if (target) {
    await requireCard(target);

    const text = await plugin.openText('body', target._id);

    try {
      text.text.insert(text.text.length, `${text.text.length ? '\n' : ''}${line}`);
      await text.flush();
    } finally {
      text.dispose();
    }
  } else {
    const name = shortName(pdf.data.title);
    target = await createCard(name, placeNear(context, 700), { title: name, accent: 'yellow', deco: 'tape' }, line);

    await plugin.request('state.patch', { changes: [{ op: 'set', path: ['target'], value: { appId: target._id } }] });
  }

  await plugin.request('links.create', {
    key: `quote:${pdf._id}:${target._id}`,
    sourceAppId: pdf._id,
    targetAppId: target._id,
  });
});

plugin.onCommand('sticky-from-pdf', async (context) => {
  const { app, doc: documentContext } = pdfSource(context);
  const quote = documentContext.selection?.text.replace(/\s+/g, ' ').trim();

  if (!quote) {
    throw new Error('Select some text in the PDF first.');
  }

  const sticky = await plugin.request('apps.create', {
    type: 'Stickie',
    title: 'sticky',
    size: { width: 400, height: 400 },
    position: placeNear(context, 400),
    state: { text: `p${documentContext.page + 1}: "${quote}"`, fontSize: 28, color: 'yellow' },
  });

  await plugin.request('links.create', {
    key: `quote:${app._id}:${sticky._id}`,
    sourceAppId: app._id,
    targetAppId: sticky._id,
  });
});
