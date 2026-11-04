export type PluginCapability =
  | 'apps.read'
  | 'apps.write'
  | 'links.read'
  | 'links.write'
  | 'annotations.read'
  | 'documents.read'
  | 'documents.navigate'
  | 'assets.read'
  | 'assets.write'
  | 'urls.open'
  | 'downloads.write';

export type PluginState = Readonly<Record<string, unknown>>;

export interface PluginSnapshot {
  readonly revision: number;
  readonly value: PluginState;
}

export type PluginChange =
  | { readonly op: 'set'; readonly path: readonly string[]; readonly value: unknown }
  | { readonly op: 'delete'; readonly path: readonly string[] };

export type PluginTarget = { readonly appTypes: readonly string[] } | { readonly viewIds: readonly string[] };

export type PluginCommandAction =
  | { readonly type: 'panel'; readonly viewId: string }
  | { readonly type: 'create'; readonly viewId: string }
  | { readonly type: 'overlay'; readonly viewId: string };

export type PluginPoint = Readonly<{
  x: number;
  y: number;
}>;

export interface PluginCommand {
  readonly id: string;
  readonly title: string;
  readonly placements: readonly ('toolbar' | 'context-menu' | 'board-menu')[];
  readonly target?: PluginTarget;
  readonly shortcut?: string;
  readonly action?: PluginCommandAction;
}

interface PluginViewDefinition {
  readonly id: string;
  readonly title: string;
  readonly entry: string;
  readonly width?: number;
  readonly height?: number;
}

export type PluginView = PluginViewDefinition &
  (
    | { readonly kind: 'app' }
    | { readonly kind: 'panel'; readonly scope: 'board' | 'app'; readonly target?: PluginTarget }
    | { readonly kind: 'overlay'; readonly target?: PluginTarget }
  );

export interface PluginManifest {
  readonly id: string;
  readonly apiVersion: 1;
  readonly name: string;
  readonly description: string;
  readonly entry: string;
  readonly capabilities: readonly PluginCapability[];
  readonly commands?: readonly PluginCommand[];
  readonly views?: readonly PluginView[];
}

export interface PluginAppRecord {
  readonly _id: string;
  readonly data: {
    readonly type: string;
    readonly title: string;
    readonly boardId: string;
    readonly roomId: string;
    readonly position: PluginPoint & { readonly z: number };
    readonly size: {
      readonly width: number;
      readonly height: number;
      readonly depth: number;
    };
    readonly state: PluginState;
  };
}

export interface PluginSelection {
  readonly text: string;
  readonly rects: readonly (PluginPoint & {
    readonly width: number;
    readonly height: number;
  })[];
}

export interface PluginDocumentReference {
  readonly appId: string;
  readonly assetId?: string;
  readonly page: number;
}

export interface PluginViewport {
  readonly position: PluginPoint;
  readonly size: {
    readonly width: number;
    readonly height: number;
  };
  readonly scale: number;
}

export interface PluginTheme {
  readonly mode: 'light' | 'dark';
  readonly background: string;
  readonly foreground: string;
  readonly muted: string;
  readonly border: string;
  readonly accent: string;
  readonly fontFamily: string;
}

export interface PluginContext {
  readonly boardId: string;
  readonly roomId: string;
  readonly selectedAppIds: readonly string[];
  /** This client's rendered app windows, back to front; empty without apps.read. */
  readonly appOrder: readonly string[];
  readonly app?: PluginAppRecord;
  readonly document?: {
    readonly assetId: string;
    readonly page: number;
    readonly numPages: number;
    readonly selection?: PluginSelection;
  };
  readonly position?: PluginPoint;
  readonly viewport: PluginViewport;
  readonly theme: PluginTheme;
}

export interface PluginInit {
  readonly pluginId: string;
  readonly boardId: string;
  readonly roomId: string;
  readonly appId?: string;
  readonly viewId?: string;
  readonly context: PluginContext;
  readonly state: PluginSnapshot;
  readonly app?: PluginAppRecord;
}

export interface PluginAppUpdates {
  readonly title?: string;
  readonly position?: PluginPoint;
  readonly size?: {
    readonly width: number;
    readonly height: number;
  };
  readonly state?: PluginState;
}

/** Native creation is restricted to server-validated safe adapters; other app types remain readable. */
export type PluginCreatableAppType = 'Notepad' | 'Stickie' | 'PDFViewer' | 'ImageViewer' | 'PluginApp';

export interface PluginAppCreate extends PluginAppUpdates {
  readonly type: PluginCreatableAppType;
}

export interface PluginAsset {
  readonly id: string;
  readonly name: string;
  readonly mimeType: string;
  readonly size: number;
  readonly pageCount?: number;
}

export interface PluginLink {
  readonly _id: string;
  readonly data: {
    readonly boardId: string;
    readonly sourceAppId: string;
    readonly targetAppId: string;
    readonly type: string;
    readonly metadata?: PluginState;
  };
}

/** Committed board-space geometry, independent of annotation storage and viewport culling. */
export interface PluginAnnotation {
  readonly id: string | number;
  readonly type: string;
  readonly points: readonly (readonly [number, number])[];
  readonly color?: string;
  readonly alpha?: number;
  readonly size?: number;
  readonly isComplete?: boolean;
  readonly text?: string;
}

export interface PluginTextSnapshot {
  readonly appId: string;
  readonly field: string;
  readonly update: string;
}

export interface PluginOperations {
  'context.get': {
    readonly params: undefined;
    readonly result: PluginContext;
  };

  'state.get': {
    readonly params: undefined;
    readonly result: PluginSnapshot;
  };

  'state.patch': {
    readonly params: {
      readonly changes: readonly PluginChange[];
      readonly expectedRevision?: number;
    };
    readonly result: PluginSnapshot;
  };

  'apps.list': {
    readonly params: undefined;
    readonly result: readonly PluginAppRecord[];
  };

  'apps.create': {
    readonly params: PluginAppCreate;
    readonly result: PluginAppRecord;
  };

  'apps.update': {
    readonly params: {
      readonly id: string;
      readonly updates: PluginAppUpdates;
    };
    readonly result: PluginAppRecord;
  };

  'apps.remove': {
    readonly params: { readonly id: string };
    readonly result: unknown;
  };

  'app.content.get': {
    readonly params: { readonly appId?: string };
    readonly result: PluginSnapshot;
  };

  'app.content.patch': {
    readonly params: {
      readonly appId?: string;
      readonly changes: readonly PluginChange[];
      readonly expectedRevision?: number;
    };
    readonly result: PluginSnapshot;
  };

  'links.list': {
    readonly params: undefined;
    readonly result: readonly PluginLink[];
  };

  'links.create': {
    readonly params: {
      readonly key: string;
      readonly sourceAppId: string;
      readonly targetAppId: string;
      readonly metadata?: PluginState;
    };
    readonly result: PluginLink;
  };

  'links.remove': {
    readonly params: { readonly id: string };
    readonly result: unknown;
  };

  'annotations.list': {
    readonly params: undefined;
    readonly result: readonly PluginAnnotation[];
  };

  'assets.list': {
    readonly params: undefined;
    readonly result: readonly PluginAsset[];
  };

  'assets.read': {
    readonly params: {
      readonly id: string;
      readonly page?: number;
    };
    readonly result: Blob;
  };

  'assets.upload': {
    readonly params: {
      readonly name: string;
      readonly data: Blob;
    };
    readonly result: PluginAsset;
  };

  'text.get': {
    readonly params: {
      readonly appId: string;
      readonly field: string;
    };
    readonly result: PluginTextSnapshot;
  };

  'text.apply': {
    readonly params: {
      readonly appId: string;
      readonly field: string;
      readonly update: string;
    };
    readonly result: PluginTextSnapshot;
  };

  'documents.navigate': {
    readonly params: {
      readonly appId: string;
      readonly page: number;
    };
    readonly result: PluginAppRecord;
  };

  'ui.openUrl': {
    readonly params: { readonly url: string };
    readonly result: unknown;
  };

  'ui.download': {
    readonly params: {
      readonly name: string;
      readonly data: Blob;
    };
    readonly result: unknown;
  };

  'ui.panel.open': {
    readonly params: {
      readonly viewId: string;
      readonly appId?: string;
    };
    readonly result: unknown;
  };

  'ui.panel.close': {
    readonly params: undefined;
    readonly result: unknown;
  };
}

export interface PluginEvents {
  readonly context: PluginContext;
  readonly state: PluginSnapshot;
  readonly app: PluginAppRecord;
  readonly text: PluginTextSnapshot;

  /** SDK-local failures from async command/event handlers or the message channel. */
  readonly error: Error;
}

export type PluginMethod = keyof PluginOperations;

export type PluginRequest = {
  [M in PluginMethod]: {
    readonly protocol: 'sage3:plugin';
    readonly kind: 'request';
    readonly id: string;
    readonly method: M;
    readonly params: PluginOperations[M]['params'];
  };
}[PluginMethod];

export interface PluginCommandRequest {
  readonly protocol: 'sage3:plugin';
  readonly kind: 'request';
  readonly id: string;
  readonly method: 'command.run';
  readonly params: {
    readonly id: string;
    readonly context: PluginContext;
  };
}

export type PluginEvent = {
  [E in Exclude<keyof PluginEvents, 'error'>]: {
    readonly protocol: 'sage3:plugin';
    readonly kind: 'event';
    readonly event: E;
    readonly data: PluginEvents[E];
  };
}[Exclude<keyof PluginEvents, 'error'>];

export type PluginMessage =
  | {
      readonly protocol: 'sage3:plugin';
      readonly kind: 'ready';
    }
  | {
      readonly protocol: 'sage3:plugin';
      readonly kind: 'init';
      readonly data: PluginInit;
    }
  | {
      readonly protocol: 'sage3:plugin';
      readonly kind: 'dispose';
      readonly error: string;
    }
  | PluginRequest
  | PluginCommandRequest
  | {
      readonly protocol: 'sage3:plugin';
      readonly kind: 'response';
      readonly id: string;
      readonly result?: unknown;
      readonly error?: string;
    }
  | PluginEvent;
