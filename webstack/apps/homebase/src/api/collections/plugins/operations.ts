import { createHash } from 'crypto';
import { z } from 'zod';
import { type App, type AppSchema, isApp } from '@sage3/applications/schema';
import { toPluginAsset } from '@sage3/backend';
import type { SAGE3Collection } from '@sage3/backend';
import type { SBAuthSchema, SBConditionalWriteResult, SBDocument, SBDocumentRef, SBJSON, SBNestedChange } from '@sage3/sagebase';
import { SAGEBase } from '@sage3/sagebase';
import {
  Plugin,
  PluginSchema,
  pluginJSONSchema,
  pluginPackageDigestSchema,
  pluginPatchSchema,
  pluginStateKeySchema,
} from '@sage3/shared/types';
import type { LinkSchema } from '@sage3/shared/types';
import type { PluginCapability, PluginSnapshot } from '@sage3/sageplugin';
import { checkPermissionsWS, AuthAction, AuthSubject } from '@sage3/backend/permissions';
import { AppsCollection } from '../apps';
import { BoardsCollection } from '../boards';
import { LinkCollection } from '../link';
import { isPluginAppType, parsePluginAppState, pluginAppAdapters } from './app-adapters';
import { AssetsCollection } from '../assets';
import { performPluginTextOperation } from './text';
import { pluginAppConditions } from './app-scope';

export class PluginRequestError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export function requirePluginPermission(user: SBAuthSchema, action: AuthAction, subject: AuthSubject): void {
  if (!checkPermissionsWS(user, action, subject)) {
    throw new PluginRequestError('Permission denied.', 403);
  }
}

const id = z.string().regex(/^[a-zA-Z0-9_-]+$/);

const jsonObject = z.record(pluginStateKeySchema, pluginJSONSchema);

const position = z
  .object({
    x: z.number().finite(),
    y: z.number().finite(),
  })
  .strict();

const size = z
  .object({
    width: z.number().finite().positive(),
    height: z.number().finite().positive(),
  })
  .strict();

const appChanges = z
  .object({
    title: z.string().optional(),
    position: position.optional(),
    size: size.optional(),
    state: jsonObject.optional(),
  })
  .strict();

const empty = z.object({}).strict().default({});

export const pluginOperationSchema = z
  .discriminatedUnion('method', [
    z.object({ method: z.literal('state.get'), params: empty }),
    z.object({
      method: z.literal('state.patch'),
      params: pluginPatchSchema,
    }),
    z.object({ method: z.literal('apps.list'), params: empty }),
    z.object({
      method: z.literal('apps.create'),
      params: appChanges.extend({ type: z.string() }),
    }),
    z.object({
      method: z.literal('apps.update'),
      params: z.object({ id, updates: appChanges }).strict(),
    }),
    z.object({
      method: z.literal('apps.remove'),
      params: z.object({ id }).strict(),
    }),
    z.object({
      method: z.literal('app.content.get'),
      params: z.object({ appId: id.optional() }).strict().default({}),
    }),
    z.object({
      method: z.literal('app.content.patch'),
      params: pluginPatchSchema.extend({ appId: id.optional() }),
    }),
    z.object({ method: z.literal('links.list'), params: empty }),
    z.object({
      method: z.literal('links.create'),
      params: z
        .object({
          key: z.string().min(1),
          sourceAppId: id,
          targetAppId: id,
          metadata: jsonObject.optional(),
        })
        .strict(),
    }),
    z.object({
      method: z.literal('links.remove'),
      params: z.object({ id }).strict(),
    }),
    z.object({ method: z.literal('assets.list'), params: empty }),
    z.object({
      method: z.literal('text.get'),
      params: z.object({ appId: id, field: pluginStateKeySchema }).strict(),
    }),
    z.object({
      method: z.literal('text.apply'),
      params: z
        .object({
          appId: id,
          field: pluginStateKeySchema,
          // performPluginTextOperation decodes and bounds the update.
          update: z.string(),
        })
        .strict(),
    }),
    z.object({
      method: z.literal('documents.navigate'),
      params: z
        .object({
          appId: id,
          page: z.number().int().nonnegative(),
        })
        .strict(),
    }),
  ])
  .and(z.object({ packageDigest: pluginPackageDigestSchema, appId: id.optional() }));

const scopeParams = z.object({ pluginId: id, boardId: id });

export async function pluginScope(collection: SAGE3Collection<PluginSchema>, params: unknown, user: SBAuthSchema) {
  const { pluginId, boardId } = scopeParams.parse(params);

  // Every role that can read one collection can read all of them.
  requirePluginPermission(user, 'GET', 'PLUGINS');

  const plugin = await collection.get(pluginId);
  const board = await BoardsCollection.get(boardId);
  if (!plugin || !board || !plugin.data.roomId || board.data.roomId !== plugin.data.roomId) {
    throw new PluginRequestError('Plugin or board not found in this room.', 404);
  }

  return { plugin, board, boardId };
}

export async function performPluginOperation(
  document: Pick<SBDocumentRef<PluginSchema>, 'patchNested'>,
  plugin: Plugin,
  boardId: string,
  user: SBAuthSchema,
  body: unknown,
): Promise<unknown> {
  const packaged = plugin.data.package;
  if (!packaged || plugin.data.boardGrants?.[boardId] !== packaged.digest) {
    throw new PluginRequestError('Extension is unavailable or disabled.', 403);
  }

  // pluginScope proved the plugin belongs to the board's room, and every role that can read one
  // collection can read all of them, so only writes need a further permission check.
  const manifest = packaged.manifest;
  const roomId = plugin.data.roomId!;
  const operation = pluginOperationSchema.parse(body);
  if (operation.packageDigest !== packaged.digest) {
    throw new PluginRequestError('Extension package has changed. Reopen the extension.', 403);
  }

  switch (operation.method) {
    case 'state.get':
      return stateSnapshot(plugin, boardId);
    case 'state.patch': {
      requirePluginPermission(user, 'PUT', 'PLUGINS');

      const result = await document.patchNested(
        ['boardState', boardId],
        ['boardRevisions', boardId],
        operation.params.changes,
        user.id,
        operation.params.expectedRevision,
        [
          { segments: ['package', 'digest'], value: packaged.digest },
          { segments: ['boardGrants', boardId], value: packaged.digest },
          { segments: ['roomId'], value: roomId },
        ],
      );
      if (result.conflict) {
        throw new PluginRequestError('Extension state or approval has changed.', 409);
      }
      if (!result.success || !result.doc) {
        throw new PluginRequestError('Failed to persist extension state.', 500);
      }

      return stateSnapshot(result.doc, boardId);
    }
    case 'apps.list':
      requireCapability(manifest.capabilities, 'apps.read');

      return saved(await AppsCollection.query('boardId', boardId)).filter((app) => app.data.roomId === roomId);
    case 'apps.create': {
      requirePluginPermission(user, 'POST', 'APPS');

      const params = operation.params;
      if (!isPluginAppType(params.type)) {
        throw new PluginRequestError(`Unsupported app type: ${params.type}`);
      }

      const parsed = parsePluginAppState(params.type, params.state ?? {});
      if (parsed.type === 'ImageViewer' || parsed.type === 'PDFViewer') {
        await requireRoomAsset(parsed.state.assetid, roomId);
      }

      if (parsed.type === 'PluginApp') {
        const own = parsed.state;
        if (own.pluginId !== plugin._id || !manifest.views?.some((view) => view.id === own.viewId && view.kind === 'app')) {
          throw new PluginRequestError('Invalid extension app view.');
        }
      } else {
        requireCapability(manifest.capabilities, 'apps.write');
      }

      return saved(
        await AppsCollection.add(
          {
            title: params.title ?? params.type,
            ...parsed,
            roomId,
            boardId,
            position: {
              x: params.position?.x ?? 0,
              y: params.position?.y ?? 0,
              z: 0,
            },
            size: {
              width: params.size?.width ?? 600,
              height: params.size?.height ?? 400,
              depth: 0,
            },
            rotation: { x: 0, y: 0, z: 0 },
            raised: true,
            dragging: false,
            pinned: false,
          },
          user.id,
        ),
      );
    }
    case 'apps.update': {
      requireCapability(manifest.capabilities, 'apps.write');
      requirePluginPermission(user, 'PUT', 'APPS');

      const app = await requireAppOnBoard(operation.params.id, boardId, roomId);
      const changes = operation.params.updates;
      const updates: SBNestedChange[] = [];

      if (changes.title !== undefined) {
        updates.push({ segments: ['title'], value: changes.title });
      }

      if (changes.position) {
        updates.push(
          { segments: ['position', 'x'], value: changes.position.x },
          { segments: ['position', 'y'], value: changes.position.y },
        );
      }

      if (changes.size) {
        updates.push(
          { segments: ['size', 'width'], value: changes.size.width },
          { segments: ['size', 'height'], value: changes.size.height },
        );
      }

      if (changes.state) {
        if (!isPluginAppType(app.data.type)) {
          throw new PluginRequestError(`Unsupported app state: ${app.data.type}`);
        }

        // PluginApp content changes only through app.content.patch or text.apply: its update adapter accepts no fields.
        const parsed: SBJSON = pluginAppAdapters[app.data.type].update.parse(changes.state);
        if (typeof parsed.assetid === 'string') {
          await requireRoomAsset(parsed.assetid, roomId);
        }

        for (const [key, value] of Object.entries(parsed)) {
          updates.push({ segments: ['state', key], value });
        }
      }

      return updateScopedApp(app, updates, user.id);
    }
    case 'apps.remove': {
      requireCapability(manifest.capabilities, 'apps.write');
      requirePluginPermission(user, 'DELETE', 'APPS');

      const app = await requireAppOnBoard(operation.params.id, boardId, roomId);

      const applications = await SAGEBase.Database.collection<AppSchema>('APPS');
      return committed(await applications.docRef(app._id).delete(true, pluginAppConditions(app)));
    }
    case 'app.content.get':
    case 'app.content.patch': {
      if (operation.method === 'app.content.patch') {
        requirePluginPermission(user, 'PUT', 'APPS');
      }

      const appId = operation.params.appId ?? operation.appId;
      if (!appId) {
        throw new PluginRequestError('An app id is required outside an app frame.');
      }

      const app = requireOwnApp(await requireAppOnBoard(appId, boardId, roomId), plugin._id);
      if (operation.method === 'app.content.get') {
        return contentSnapshot(app);
      }

      const applications = await SAGEBase.Database.collection<AppSchema>('APPS');
      const result = await applications
        .docRef(app._id)
        .patchNested(
          ['state', 'content'],
          ['state', 'contentRevision'],
          operation.params.changes,
          user.id,
          operation.params.expectedRevision,
          pluginAppConditions(app),
        );
      if (result.conflict) {
        throw new PluginRequestError('Extension content revision has changed.', 409);
      }
      if (!result.success || !result.doc) {
        throw new PluginRequestError('Failed to persist extension content.', 500);
      }

      // The write was conditioned on the app's type and plugin ownership.
      return contentSnapshot(result.doc as App<'PluginApp'>);
    }
    case 'text.get':
    case 'text.apply': {
      if (operation.method === 'text.apply') {
        requirePluginPermission(user, 'PUT', 'APPS');
      }

      const target = await requireAppOnBoard(operation.params.appId, boardId, roomId);
      let app: App<'PluginApp'>;
      if (operation.method === 'text.get' && isApp(target, 'PluginApp') && target.data.state.pluginId !== plugin._id) {
        requireCapability(manifest.capabilities, 'apps.read');
        app = target;
      } else {
        app = requireOwnApp(target, plugin._id);
      }

      return performPluginTextOperation(app, operation, user.id);
    }
    case 'links.list': {
      requireCapability(manifest.capabilities, 'links.read');

      const apps = saved(await AppsCollection.query('boardId', boardId));
      const inRoom = (appId: string) => apps.some((app) => app._id === appId && app.data.roomId === roomId);

      return saved(await LinkCollection.query('boardId', boardId)).filter(
        (link) => inRoom(link.data.sourceAppId) && inRoom(link.data.targetAppId),
      );
    }
    case 'links.create': {
      requireCapability(manifest.capabilities, 'links.write');
      requirePluginPermission(user, 'POST', 'LINKS');

      const { key, sourceAppId, targetAppId, metadata } = operation.params;
      await requireAppOnBoard(sourceAppId, boardId, roomId);
      await requireAppOnBoard(targetAppId, boardId, roomId);

      const linkId = createHash('sha256')
        .update(JSON.stringify([plugin._id, boardId, key]))
        .digest('hex');
      const created = await LinkCollection.add(
        { sourceAppId, targetAppId, boardId, type: 'provenance', metadata, pluginId: plugin._id, pluginKey: key },
        user.id,
        linkId,
      );
      const link = created ?? saved(await LinkCollection.get(linkId));
      if (
        link.data.boardId !== boardId ||
        link.data.pluginId !== plugin._id ||
        link.data.pluginKey !== key ||
        link.data.sourceAppId !== sourceAppId ||
        link.data.targetAppId !== targetAppId
      ) {
        throw new PluginRequestError('Link key already has different endpoints.', 409);
      }

      return link;
    }
    case 'links.remove': {
      requireCapability(manifest.capabilities, 'links.write');
      requirePluginPermission(user, 'DELETE', 'LINKS');

      const link = await LinkCollection.get(operation.params.id);
      if (!link || link.data.boardId !== boardId) {
        throw new PluginRequestError('Link not found on this board.', 404);
      }
      if (link.data.pluginId !== plugin._id) {
        throw new PluginRequestError('Link belongs to another extension.', 403);
      }

      // An extension may remove its own link even after an endpoint app is gone.
      const links = await SAGEBase.Database.collection<LinkSchema>('LINK');
      return committed(
        await links.docRef(link._id).delete(true, [
          { segments: ['boardId'], value: boardId },
          { segments: ['pluginId'], value: plugin._id },
        ]),
      );
    }
    case 'assets.list':
      requireCapability(manifest.capabilities, 'assets.read');

      return saved(await AssetsCollection.query('room', roomId)).map(toPluginAsset);
    case 'documents.navigate': {
      requireCapability(manifest.capabilities, 'documents.navigate');
      requirePluginPermission(user, 'PUT', 'APPS');

      const app = await requireAppOnBoard(operation.params.appId, boardId, roomId);
      if (!isApp(app, 'PDFViewer')) {
        throw new PluginRequestError('Target must be a PDFViewer.');
      }

      if (operation.params.page >= app.data.state.numPages) {
        throw new PluginRequestError('Page is outside the document.');
      }

      return updateScopedApp(app, [{ segments: ['state', 'currentPage'], value: operation.params.page }], user.id);
    }
  }
}

function requireCapability(capabilities: readonly PluginCapability[], required: PluginCapability): void {
  if (!capabilities.includes(required)) {
    throw new PluginRequestError(`Capability not approved: ${required}`, 403);
  }
}

async function requireAppOnBoard(appId: string, boardId: string, roomId: string): Promise<App> {
  const app = await AppsCollection.get(appId);
  if (!app || app.data.boardId !== boardId || app.data.roomId !== roomId) {
    throw new PluginRequestError('App not found on this board.', 404);
  }

  return app;
}

function requireOwnApp(app: App, pluginId: string): App<'PluginApp'> {
  if (!isApp(app, 'PluginApp')) {
    throw new PluginRequestError('Not an extension app.', 403);
  }
  if (app.data.state.pluginId !== pluginId) {
    throw new PluginRequestError('App belongs to another extension.', 403);
  }

  return app;
}

function stateSnapshot(plugin: Plugin, boardId: string): PluginSnapshot {
  return {
    revision: plugin.data.boardRevisions?.[boardId] ?? 0,
    value: plugin.data.boardState?.[boardId] ?? {},
  };
}

function contentSnapshot(app: App<'PluginApp'>): PluginSnapshot {
  return {
    revision: app.data.state.contentRevision ?? 0,
    value: app.data.state.content,
  };
}

function committed<Type extends SBJSON>(result: SBConditionalWriteResult<Type>): SBDocument<Type> {
  if (result.conflict) {
    throw new PluginRequestError('The target changed while the operation was being authorized.', 409);
  }

  if (!result.success || !result.doc) {
    throw new PluginRequestError('Failed to persist operation.', 500);
  }

  return result.doc;
}

async function updateScopedApp(app: App, changes: readonly SBNestedChange[], by: string): Promise<App> {
  const applications = await SAGEBase.Database.collection<AppSchema>('APPS');
  return committed(await applications.docRef(app._id).updateNestedMany(changes, by, pluginAppConditions(app)));
}

function saved<T>(value: T | undefined): T {
  if (value === undefined) {
    throw new PluginRequestError('Failed to persist operation.', 500);
  }

  return value;
}

// Asset ids are server-generated v4 UUIDs, so a room asset is never read as an ImageViewer URL.
async function requireRoomAsset(assetId: string, roomId: string): Promise<void> {
  const asset = await AssetsCollection.get(assetId);
  if (!asset || asset.data.room !== roomId) {
    throw new PluginRequestError('Asset not found in this room.', 404);
  }
}
