import * as Y from 'yjs';
import { type App, type AppSchema, isApp } from '@sage3/applications/schema';
import type { PluginTextSnapshot } from '@sage3/sageplugin';
import { SAGEBase } from '@sage3/sagebase';
import { PluginRequestError } from './operations';
import { pluginAppConditions } from './app-scope';

// Stored snapshots grow with history; an update can never be larger than the snapshot it produces.
const maxSnapshotBytes = 1024 * 1024;

type PluginTextOperation = {
  readonly method: 'text.get' | 'text.apply';
  readonly params: { readonly appId: string; readonly field: string; readonly update?: string };
};

// Stored snapshots are app state that native clients can also write, so both inputs are decoded here.
function decodeTextUpdate(encoded: unknown, field: string): Uint8Array {
  if (typeof encoded !== 'string' || encoded.length > Math.ceil(maxSnapshotBytes / 3) * 4) {
    throw new PluginRequestError('Text update must be bounded base64.');
  }

  const update = Buffer.from(encoded, 'base64');

  try {
    // Inspect even deleted or unresolved structs: toString/toDelta alone hides forbidden payloads.
    const decoded = Y.decodeUpdate(update);
    for (const struct of decoded.structs) {
      if (!(struct instanceof Y.Item)) {
        continue;
      }

      const parent: unknown = struct.parent;
      if (
        (typeof parent === 'string' && parent !== field) ||
        parent instanceof Y.ID ||
        struct.parentSub !== null ||
        (!(struct.content instanceof Y.ContentString) && !(struct.content instanceof Y.ContentDeleted))
      ) {
        throw new Error('Not plaintext');
      }
    }
  } catch {
    throw new PluginRequestError('Text update must contain only its designated plaintext Y.Text.');
  }

  return update;
}

function applyTextUpdate(document: Y.Doc, update: Uint8Array): void {
  // Y.readUpdate exposes the decoder position; applyUpdate alone silently ignores trailing bytes.
  const decoder = { arr: update, pos: 0 };
  Y.readUpdate(decoder, document, null);
  if (decoder.pos !== update.length) {
    throw new PluginRequestError('Text update contains trailing binary data.');
  }
}

function mergeText(field: string, stored: string | undefined, update?: Uint8Array): string {
  const document = new Y.Doc();
  document.getText(field);

  try {
    // decodeTextUpdate admitted only string content in this field's Y.Text.
    if (stored !== undefined) {
      applyTextUpdate(document, decodeTextUpdate(stored, field));
    }
    if (update) {
      applyTextUpdate(document, update);
    }

    const snapshot = Y.encodeStateAsUpdate(document);
    if (snapshot.length > maxSnapshotBytes) {
      throw new PluginRequestError('Text document exceeds its storage limit.', 413);
    }

    return Buffer.from(snapshot).toString('base64');
  } catch (error: unknown) {
    if (error instanceof PluginRequestError) {
      throw error;
    }
    throw new PluginRequestError('Invalid Yjs text update.');
  } finally {
    document.destroy();
  }
}

/**
 * The caller authorizes the current grant, resolves `app` on this board and room, validates `field`
 * as a state key, and checks apps.read for foreign reads or ownership and PUT APPS for apply.
 * Redis CAS, not client presence or a process-local document, is the durable source of truth.
 */
export async function performPluginTextOperation(
  app: App<'PluginApp'>,
  operation: PluginTextOperation,
  by: string,
): Promise<PluginTextSnapshot> {
  const { appId, field, update } = operation.params;
  let current = app;
  if (operation.method === 'text.get') {
    return { appId, field, update: mergeText(field, current.data.state.texts?.[field]) };
  }

  const incoming = decodeTextUpdate(update, field);
  const applications = await SAGEBase.Database.collection<AppSchema>('APPS');
  const document = applications.docRef(appId);
  const conditions = pluginAppConditions(app);

  // Each conflict means another writer committed; the scope check below ends the loop if the app moved.
  for (;;) {
    const expected = current.data.state.texts?.[field];
    const merged = mergeText(field, expected, incoming);
    const result = await document.compareAndSwapNested(['state', 'texts', field], expected, merged, by, conditions);
    if (result.success && result.doc) {
      return { appId, field, update: merged };
    }
    if (!result.conflict) {
      throw new PluginRequestError('Failed to persist plugin text.', 500);
    }

    const latest = await document.read();
    if (
      !latest ||
      !isApp(latest, 'PluginApp') ||
      latest.data.boardId !== app.data.boardId ||
      latest.data.roomId !== app.data.roomId ||
      latest.data.state.pluginId !== app.data.state.pluginId ||
      latest.data.state.viewId !== app.data.state.viewId
    ) {
      throw new PluginRequestError('Text app is no longer available.', 404);
    }

    current = latest;
  }
}
