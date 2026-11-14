import { SAGE3Plugin, type PluginContext } from '@sage3/sageplugin';

const plugin = new SAGE3Plugin();
const textarea = document.querySelector<HTMLTextAreaElement>('#body')!;
const save = document.querySelector<HTMLButtonElement>('#save')!;
const status = document.querySelector<HTMLSpanElement>('#status')!;

function showError(error: unknown): void {
  status.textContent = error instanceof Error ? error.message : String(error);
}

function applyTheme(context: PluginContext): void {
  const { theme } = context;
  const style = document.documentElement.style;

  style.colorScheme = theme.mode;
  style.setProperty('--background', theme.background);
  style.setProperty('--foreground', theme.foreground);
  style.setProperty('--border', theme.border);
  style.setProperty('--accent', theme.accent);
  style.fontFamily = theme.fontFamily;
}

plugin.on('error', showError);
plugin.on('context', applyTheme);
window.addEventListener('pagehide', () => plugin.dispose(), { once: true });

async function start(): Promise<void> {
  const init = await plugin.ready;
  applyTheme(init.context);

  const body = await plugin.openText('body');
  const unbind = body.bindTextarea(textarea);
  window.addEventListener('pagehide', unbind, { once: true });

  textarea.disabled = false;
  save.disabled = false;
  status.textContent = 'Changes sync automatically.';

  save.addEventListener('click', async () => {
    save.disabled = true;
    status.textContent = 'Saving…';

    try {
      await body.flush();
      status.textContent = 'Saved.';
    } catch (error) {
      showError(error);
    } finally {
      save.disabled = false;
    }
  });
}

void start().catch(showError);
