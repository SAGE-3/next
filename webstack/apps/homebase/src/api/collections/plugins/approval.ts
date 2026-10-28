import { z } from 'zod';
import type { SBDocumentRef } from '@sage3/sagebase';
import { pluginPackageDigestSchema, Plugin, PluginSchema } from '@sage3/shared/types';
import { PluginRequestError } from './operations';
import { RoomsCollection } from '../rooms';

export const pluginActivationSchema = z.discriminatedUnion('enabled', [
  z
    .object({
      enabled: z.literal(true),
      packageDigest: pluginPackageDigestSchema,
      autoApprove: z.boolean(),
    })
    .strict(),
  z.object({ enabled: z.literal(false) }).strict(),
]);

type PluginDocument = Pick<SBDocumentRef<PluginSchema>, 'read' | 'updateNestedMany'>;
type PluginPackage = NonNullable<PluginSchema['package']>;
type PluginActivation = z.infer<typeof pluginActivationSchema>;

/**
 * Publish package identity and its exact board grants together, without replacing board data.
 * The caller has verified that `by` owns the plugin and that `roomOwnerId` owns its room.
 */
export async function replacePluginPackage(
  document: PluginDocument,
  packaged: PluginPackage,
  by: string,
  roomOwnerId: string,
): Promise<Plugin> {
  const plugin = await document.read();
  if (!plugin) {
    throw new PluginRequestError('Plugin not found.', 404);
  }

  const boardGrants: Record<string, string> = plugin.data.package?.digest === packaged.digest ? { ...plugin.data.boardGrants } : {};
  const boardAutoApprovals = { ...plugin.data.boardAutoApprovals };
  for (const boardId in boardAutoApprovals) {
    const policy = boardAutoApprovals[boardId];
    if (policy.ownerId !== roomOwnerId) {
      delete boardAutoApprovals[boardId];
    } else if (packaged.manifest.capabilities.every((capability) => policy.capabilities.includes(capability))) {
      boardGrants[boardId] = packaged.digest;
    }
  }

  const result = await document.updateNestedMany(
    [
      { segments: ['package'], value: packaged },
      { segments: ['boardGrants'], value: boardGrants },
      { segments: ['boardAutoApprovals'], value: boardAutoApprovals },
    ],
    by,
    [
      { segments: ['ownerId'], value: by },
      { segments: ['roomId'], value: plugin.data.roomId },
      { segments: ['package'], value: plugin.data.package },
      { segments: ['boardGrants'], value: plugin.data.boardGrants },
      { segments: ['boardAutoApprovals'], value: plugin.data.boardAutoApprovals },
    ],
  );
  // A concurrent approval or disable is never overwritten; the uploader retries against it.
  if (result.conflict) {
    throw new PluginRequestError('Extension approval changed during upload. Retry the upload.', 409);
  }
  if (!result.success || !result.doc) {
    throw new PluginRequestError('Failed to save package catalogue.', 500);
  }

  return result.doc;
}

/** A disable always clears both decisions; an enable is bound to the package the owner reviewed. */
export async function setPluginActivation(
  document: PluginDocument,
  boardId: string,
  activation: PluginActivation,
  by: string,
): Promise<Plugin> {
  const plugin = await document.read();
  if (!plugin) {
    throw new PluginRequestError('Plugin not found.', 404);
  }

  // pluginScope proved the plugin belongs to a room.
  const room = await RoomsCollection.get(plugin.data.roomId!);
  if (!room) {
    throw new PluginRequestError('Room not found.', 404);
  }
  if (room.data.ownerId !== by) {
    throw new PluginRequestError('Only the room owner can approve extensions.', 403);
  }

  const packaged = plugin.data.package;
  if (activation.enabled && activation.packageDigest !== packaged?.digest) {
    throw new PluginRequestError('Extension package changed. Reopen approval to review the current package.', 409);
  }

  const result = await document.updateNestedMany(
    [
      { segments: ['boardGrants', boardId], value: activation.enabled ? activation.packageDigest : undefined },
      {
        segments: ['boardAutoApprovals', boardId],
        value:
          // An enable matched the stored package digest above.
          activation.enabled && activation.autoApprove ? { ownerId: by, capabilities: packaged!.manifest.capabilities } : undefined,
      },
    ],
    by,
    activation.enabled ? [{ segments: ['package'], value: packaged }] : [],
  );
  if (result.conflict) {
    throw new PluginRequestError('Extension package changed. Reopen approval to review the current package.', 409);
  }
  if (!result.success || !result.doc) {
    throw new PluginRequestError('Failed to save extension approval.', 500);
  }

  return result.doc;
}
