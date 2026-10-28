import { SAGE3Plugin } from '@sage3/sageplugin';
import { showError, sourceFromContext } from './source';

const plugin = new SAGE3Plugin();
const form = document.querySelector<HTMLFormElement>('form');
const note = document.querySelector<HTMLTextAreaElement>('#note');
const sourceLabel = document.querySelector<HTMLElement>('#source');
const quote = document.querySelector<HTMLElement>('#quote');
const status = document.querySelector<HTMLElement>('#status');
const submit = document.querySelector<HTMLButtonElement>('#create');
const close = document.querySelector<HTMLButtonElement>('#close');

if (!form || !note || !sourceLabel || !quote || !status || !submit || !close) {
  throw new Error('Reading panel markup is incomplete.');
}

plugin.on('error', (error) => showError(status, error));

close.addEventListener('click', () => {
  void plugin.request('ui.panel.close').catch((error: unknown) => showError(status, error));
});

void plugin.ready
  .then((init) => {
    // Capture the bound PDF once; later context updates cannot retarget this draft.
    const source = sourceFromContext(init.context);
    const title = init.context.app?.data.title || 'PDF';

    sourceLabel.textContent = `${title}, page ${source.page + 1}`;
    quote.textContent = source.selection?.text || 'No text selected. The note will reference this page.';
    submit.disabled = false;

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      if (submit.disabled) {
        return;
      }

      submit.disabled = true;
      note.readOnly = true;
      status.setAttribute('role', 'status');
      status.textContent = 'Creating native note…';

      let createdId: string | undefined;
      let sourceSaved = false;

      const create = async (): Promise<void> => {
        const text =
          `Source: ${title}, page ${source.page + 1}\n` +
          (source.selection?.text ? `\nQuote:\n${source.selection.text}\n` : '') +
          `\nNotes:\n${note.value}\n`;

        const app = await plugin.request('apps.create', {
          type: 'Notepad',
          title: `Reading: ${title} · p. ${source.page + 1}`,
          position: {
            x: (init.context.app?.data.position.x ?? 0) + (init.context.app?.data.size.width ?? 0) + 30,
            y: init.context.app?.data.position.y ?? 0,
          },
          size: { width: 500, height: 360 },
          state: {
            content: {
              ops: [{ insert: text }],
            },
          },
        });

        createdId = app._id;

        await plugin.request('state.patch', {
          changes: [{ op: 'set', path: [`note_${app._id}`], value: source }],
        });

        sourceSaved = true;

        await plugin.request('links.create', {
          key: `reading-note:${app._id}`,
          sourceAppId: source.appId,
          targetAppId: app._id,
          metadata: { ...source, relation: 'reading-note' },
        });

        status.textContent =
          'Note created and linked. Edit it together in the native Notepad. Use its “Return to reading source” action to navigate back.';
      };

      void create().catch((error: unknown) => {
        const detail = error instanceof Error ? error.message : String(error);
        const partialFailure = sourceSaved ? ' and its source saved, but the visual link failed' : ', but saving its source failed';

        showError(
          status,
          new Error(
            createdId
              ? `Note ${createdId} was created${partialFailure}. The note was kept. ${detail}`
              : `Note creation did not acknowledge success. Check the board before creating another note. Your draft is kept here. ${detail}`,
          ),
        );

        note.readOnly = false;
      });
    });
  })
  .catch((error: unknown) => showError(status, error));
