/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { z } from 'zod';
import { SBDoc } from './SBSchema';

const identifier = z.string().regex(/^[a-zA-Z0-9_-]+$/);

export const pluginEntrySchema = z
  .string()
  .refine(
    (entry) =>
      /^[a-zA-Z0-9_./-]+\.html$/.test(entry) &&
      entry.split('/').every((part) => part !== '' && part !== '.' && part !== '..'),
    'Entry must be a relative packaged HTML file',
  );

export const pluginCapabilitySchema = z.enum([
  'apps.read',
  'apps.write',
  'links.read',
  'links.write',
  'annotations.read',
  'documents.read',
  'documents.navigate',
  'assets.read',
  'assets.write',
  'urls.open',
  'downloads.write',
]);

const targetSchema = z.union([
  z.object({ appTypes: z.array(z.string().min(1)).min(1) }).strict(),
  z.object({ viewIds: z.array(identifier).min(1) }).strict(),
]);

const viewDefinition = {
  id: identifier,
  title: z.string().min(1),
  entry: pluginEntrySchema,
  width: z.number().finite().positive().optional(),
  height: z.number().finite().positive().optional(),
};

const viewSchema = z.discriminatedUnion('kind', [
  z.object({ ...viewDefinition, kind: z.literal('app') }).strict(),
  z
    .object({
      ...viewDefinition,
      kind: z.literal('panel'),
      scope: z.enum(['board', 'app']),
      target: targetSchema.optional(),
    })
    .strict(),
  z.object({ ...viewDefinition, kind: z.literal('overlay'), target: targetSchema.optional() }).strict(),
]);

export const pluginManifestSchema = z
  .object({
    id: identifier,
    apiVersion: z.literal(1),
    name: z.string().min(1),
    description: z.string(),
    entry: pluginEntrySchema,
    capabilities: z.array(pluginCapabilitySchema),
    commands: z
      .array(
        z
          .object({
            id: identifier,
            title: z.string().min(1),
            placements: z.array(z.enum(['toolbar', 'context-menu', 'board-menu'])).min(1),
            target: targetSchema.optional(),
            shortcut: z.string().min(1).optional(),
            action: z
              .object({
                type: z.enum(['panel', 'create', 'overlay']),
                viewId: identifier,
              })
              .strict()
              .optional(),
          })
          .strict(),
      )
      .optional(),
    views: z.array(viewSchema).optional(),
  })
  .strict()
  .superRefine((manifest, context) => {
    const commands = manifest.commands ?? [];
    const views = manifest.views ?? [];
    const viewKind = (id: string) => views.find((view) => view.id === id)?.kind;
    const issue = (message: string) => context.addIssue({ code: z.ZodIssueCode.custom, message });

    if (
      manifest.capabilities.some((capability, index) => manifest.capabilities.indexOf(capability) !== index) ||
      commands.some((command, index) => commands.findIndex((other) => other.id === command.id) !== index) ||
      views.some((view, index) => views.findIndex((other) => other.id === view.id) !== index)
    ) {
      issue('Duplicate capability or contribution id');
    }

    const targetsAppViews = (target: z.infer<typeof targetSchema> | undefined) =>
      !target || !('viewIds' in target) || target.viewIds.every((id) => viewKind(id) === 'app');

    for (const command of commands) {
      const expectedKind = command.action && (command.action.type === 'create' ? 'app' : command.action.type);

      if (command.action && viewKind(command.action.viewId) !== expectedKind) {
        issue(`Command ${command.id} must reference a declared ${expectedKind} view`);
      }
      if (!targetsAppViews(command.target)) {
        issue(`Contribution ${command.id} must target declared app views`);
      }
    }

    for (const view of views) {
      if (view.kind !== 'app' && !targetsAppViews(view.target)) {
        issue(`Contribution ${view.id} must target declared app views`);
      }
      if (view.kind === 'panel' && view.scope === 'board' && view.target) {
        issue(`Board panel ${view.id} cannot have an app target`);
      }
    }
  });

export const pluginPackageDigestSchema = z.string().regex(/^[a-f0-9]{64}$/);

export type PluginJSON = null | boolean | number | string | PluginJSON[] | { [key: string]: PluginJSON };

export const pluginStateKeySchema = z
  .string()
  .refine(
    (key) => /^[a-zA-Z0-9_-]+$/.test(key) && !['__proto__', 'prototype', 'constructor'].includes(key),
    'State keys must be alphanumeric, hyphens or underscores, and not prototype keys',
  );

export const pluginJSONSchema: z.ZodType<PluginJSON> = z.lazy(() =>
  z.union([
    z.null(),
    z.boolean(),
    z.number().finite(),
    z.string(),
    z.array(pluginJSONSchema),
    z.record(
      z.string().refine((key) => !['__proto__', 'prototype', 'constructor'].includes(key)),
      pluginJSONSchema,
    ),
  ]),
);

export const pluginChangeSchema = z.discriminatedUnion('op', [
  z
    .object({
      op: z.literal('set'),
      path: z.array(pluginStateKeySchema).min(1),
      value: pluginJSONSchema,
    })
    .strict(),
  z
    .object({
      op: z.literal('delete'),
      path: z.array(pluginStateKeySchema).min(1),
    })
    .strict(),
]);

export const pluginPatchSchema = z
  .object({
    changes: z.array(pluginChangeSchema).min(1),
    expectedRevision: z.number().int().nonnegative().optional(),
  })
  .strict();

/**
 * SAGE3 PluginApp Schema
 * @interface Plugin
 */
const schema = z.object({
  // Id of the user who uploads the plugin.
  ownerId: z.string(),
  // Name of user who uploads the plugin.
  ownerName: z.string(),
  // Uploaded At
  dateCreated: z.string(),
  // Name of the plugin app
  name: z.string(),
  // Description of the plugin app
  description: z.string(),
  // Rooms
  roomId: z.string().optional(),
  package: z
    .object({
      digest: pluginPackageDigestSchema,
      manifest: pluginManifestSchema,
    })
    .strict()
    .optional(),
  boardGrants: z.record(pluginPackageDigestSchema).optional(),
  boardAutoApprovals: z
    .record(
      z
        .object({
          ownerId: z.string(),
          capabilities: z.array(pluginCapabilitySchema),
        })
        .strict(),
    )
    .optional(),
  boardState: z.record(z.record(pluginJSONSchema)).optional(),
  boardRevisions: z.record(z.number().int().nonnegative()).optional(),
});

export type PluginSchema = z.infer<typeof schema>;

export type Plugin = SBDoc & { data: PluginSchema };
