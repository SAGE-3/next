import { z } from 'zod';
import type { AppName, AppSchema, AppStateMap } from '@sage3/applications/schema';
import { pluginJSONSchema, pluginStateKeySchema } from '@sage3/shared/types';
import * as PluginApp from '@sage3/applications/apps/PluginApp';
import * as ImageViewer from '@sage3/applications/apps/ImageViewer';
import * as Notepad from '@sage3/applications/apps/Notepad';
import * as PDFViewer from '@sage3/applications/apps/PDFViewer';
import * as Stickie from '@sage3/applications/apps/Stickie';

// Native schemas also contain worker commands and renderer side effects. Only
// these explicitly reviewed fields are writable through the extension bridge.
const notepadState = Notepad.schema
  .extend({
    // Quill receives a text-only Delta, never arbitrary embeds or HTML.
    content: z
      .object({
        ops: z.array(
          z
            .object({
              insert: z.string(),
            })
            .strict(),
        ),
      })
      .strict(),
  })
  .strict();

const stickieState = Stickie.schema
  .pick({
    text: true,
    fontSize: true,
    color: true,
    lock: true,
    sources: true,
  })
  .extend({
    fontSize: Stickie.schema.shape.fontSize.finite().positive(),
  })
  .strict();

// Asset references are confirmed as room assets by the operation before any write.
const imageState = ImageViewer.schema
  .pick({
    assetid: true,
    annotations: true,
    boxes: true,
  })
  .strict();

const pdfState = PDFViewer.schema
  .pick({
    assetid: true,
    currentPage: true,
    numPages: true,
    displayPages: true,
  })
  .extend({
    currentPage: PDFViewer.schema.shape.currentPage.int().nonnegative(),
    numPages: PDFViewer.schema.shape.numPages.int().positive(),
    displayPages: PDFViewer.schema.shape.displayPages.int().positive(),
  })
  .strict();

const extensionState = PluginApp.schema
  .pick({ pluginId: true, viewId: true, content: true })
  .extend({
    content: z.record(pluginStateKeySchema, pluginJSONSchema),
  })
  .strict();

export const pluginAppAdapters = {
  [Notepad.name]: {
    create: notepadState.partial(),
    update: z.object({}).strict(),
    initialState: Notepad.init,
  },
  [Stickie.name]: {
    create: stickieState.partial(),
    update: stickieState.partial(),
    initialState: Stickie.init,
  },
  [ImageViewer.name]: {
    create: imageState.partial(),
    update: imageState.partial(),
    initialState: ImageViewer.init,
  },
  [PDFViewer.name]: {
    create: pdfState.partial(),
    update: pdfState.partial(),
    initialState: PDFViewer.init,
  },
  [PluginApp.name]: {
    create: extensionState.partial(),
    update: z.object({}).strict(),
    initialState: PluginApp.init,
  },
} as const satisfies Partial<{
  readonly [Name in AppName]: {
    readonly create: z.ZodType<Partial<AppStateMap[Name]>, z.ZodTypeDef, unknown>;
    readonly update: z.ZodType<Partial<AppStateMap[Name]>, z.ZodTypeDef, unknown>;
    readonly initialState: Partial<AppStateMap[Name]>;
  };
}>;

type PluginAppType = keyof typeof pluginAppAdapters;
type ParsedAppState = {
  [Name in PluginAppType]: Pick<AppSchema<Name>, 'type' | 'state'>;
}[PluginAppType];

export function isPluginAppType(value: string): value is PluginAppType {
  return Object.prototype.hasOwnProperty.call(pluginAppAdapters, value);
}

export function parsePluginAppState(type: PluginAppType, value: unknown): ParsedAppState {
  const adapter = pluginAppAdapters[type];

  // Every native init is a complete state, so validated changes over it are complete.
  // TS loses the type/state correlation when indexing a union; restore it here.
  return {
    type,
    state: {
      ...adapter.initialState,
      ...adapter.create.parse(value),
    },
  } as ParsedAppState;
}
