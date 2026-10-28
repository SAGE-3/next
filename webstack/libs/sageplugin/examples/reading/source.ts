import { isPluginRecord, SAGE3Plugin } from '@sage3/sageplugin';
import type { PluginContext, PluginSelection } from '@sage3/sageplugin';

export interface ReadingSource {
  readonly appId: string;
  readonly assetId: string;
  readonly page: number;
  readonly selection?: PluginSelection;
}

export function sourceFromContext(context: PluginContext): ReadingSource {
  if (
    context.app?.data.type !== 'PDFViewer' ||
    !context.document ||
    !context.document.assetId ||
    context.document.numPages < 1 ||
    context.document.page >= context.document.numPages
  ) {
    throw new Error('Select a loaded PDF page first.');
  }

  return {
    appId: context.app._id,
    assetId: context.document.assetId,
    page: context.document.page,
    selection: context.document.selection,
  };
}

export async function returnToSource(plugin: SAGE3Plugin, value: unknown): Promise<void> {
  if (
    !isPluginRecord(value) ||
    typeof value.appId !== 'string' ||
    typeof value.assetId !== 'string' ||
    typeof value.page !== 'number' ||
    !Number.isInteger(value.page) ||
    value.page < 0
  ) {
    throw new Error('This item has no saved reading source. Create it with a Reading notes PDF action.');
  }

  const apps = await plugin.request('apps.list');
  const source = apps.find((app) => app._id === value.appId && app.data.type === 'PDFViewer' && app.data.state.assetid === value.assetId);

  if (!source) {
    throw new Error('The original PDF is no longer on this board, or its document was replaced.');
  }

  await plugin.request('documents.navigate', { appId: source._id, page: value.page });
}

export function showError(target: HTMLElement, error: unknown): void {
  target.textContent = error instanceof Error ? error.message : String(error);
  target.setAttribute('role', 'alert');
}
