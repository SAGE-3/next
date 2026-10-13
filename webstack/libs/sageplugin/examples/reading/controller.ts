import { SAGE3Plugin } from '@sage3/sageplugin';
import { returnToSource, sourceFromContext } from './source';

const plugin = new SAGE3Plugin();

plugin.onCommand('return', async (context) => {
  if (context.app?.data.type !== 'Notepad') {
    throw new Error('Select a reading note first.');
  }

  const state = await plugin.request('state.get');
  await returnToSource(plugin, state.value[`note_${context.app._id}`]);
});

plugin.onCommand('bookmark', async (context) => {
  const source = sourceFromContext(context);
  const init = await plugin.ready;

  await plugin.request('apps.create', {
    type: 'PluginApp',
    title: `Bookmark: page ${source.page + 1}`,
    size: { width: 360, height: 260 },
    position: {
      x: (context.app?.data.position.x ?? 0) + (context.app?.data.size.width ?? 0) + 30,
      y: context.app?.data.position.y ?? 0,
    },
    state: {
      pluginId: init.pluginId,
      viewId: 'bookmark',
      content: source,
    },
  });
});
