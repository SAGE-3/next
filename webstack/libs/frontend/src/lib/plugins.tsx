import { Fragment, useCallback, useEffect, useRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Box, Button, CloseButton, Menu, MenuButton, MenuItem, MenuList, Portal, useToast } from '@chakra-ui/react';
import { create } from 'zustand';
import { z } from 'zod';
import type { Plugin } from '@sage3/shared/types';
import type {
  PluginAppRecord,
  PluginCommand,
  PluginContext,
  PluginEvents,
  PluginInit,
  PluginTarget,
  PluginTextSnapshot,
  PluginTheme,
  PluginView,
} from '@sage3/sageplugin';
import { useAppStore } from './stores/app';
import { usePluginStore } from './stores/plugin';
import { useUIStore } from './stores/ui';
import { usePluginContextStore } from './stores/pluginContext';
import { useCursorBoardPosition } from './providers/useCursorBoardPosition';
import { useYjs } from './providers/useYjs';
import { readPluginAnnotations } from './plugin-annotations';
import { downloadFile } from './utils/download';
import { placeNewApp } from './utils/placeNewApp';

const protocol = 'sage3:plugin';

// Plugin messages are untrusted: read only the fields the host uses.
const requestSchema = z.object({
  protocol: z.literal(protocol),
  kind: z.literal('request'),
  id: z.string(),
  method: z.string(),
  params: z.unknown().optional(),
});

const commandResponseSchema = z.object({
  protocol: z.literal(protocol),
  kind: z.literal('response'),
  id: z.string(),
  error: z.string().optional(),
});

const disposeSchema = z.object({
  protocol: z.literal(protocol),
  kind: z.literal('dispose'),
});

type TextSubscription = Readonly<{
  appId: string;
  field: string;
}>;

type PendingCommand = Readonly<{
  id: string;
  resolve: () => void;
  reject: (error: Error) => void;
}>;

type Runtime = Readonly<{
  pluginId: string;
  invoke: (command: PluginCommand, context: PluginContext) => Promise<void>;
}>;

type ViewLocation = Readonly<{
  pluginId: string;
  viewId: string;
  appId?: string;
}>;

type ExtensionUI = {
  readonly runtimes: readonly Runtime[];
  readonly panel: ViewLocation | null;
  // Keys of the overlays currently shown.
  readonly overlays: readonly string[];
  readonly menu: Readonly<{
    context: PluginContext;
    x: number;
    y: number;
  }> | null;
};

const useExtensionUI = create<ExtensionUI>(() => ({
  runtimes: [],
  panel: null,
  overlays: [],
  menu: null,
}));

export type EnabledPlugin = Plugin & {
  readonly data: { readonly package: NonNullable<Plugin['data']['package']> };
};

/** Grants are written only for boards in the plugin's own room, so enabled implies same room. */
export function isPluginEnabled(plugin: Plugin, boardId: string): plugin is EnabledPlugin {
  const packageDigest = plugin.data.package?.digest;

  return Boolean(packageDigest && plugin.data.boardGrants?.[boardId] === packageDigest);
}

function appRecord(app: PluginAppRecord): PluginAppRecord {
  const { type, title, boardId, roomId, position, size, state } = app.data;

  return {
    _id: app._id,
    data: {
      type,
      title,
      boardId,
      roomId,
      position,
      size,
      state,
    },
  };
}

function getTheme(): PluginTheme {
  const bodyStyle = getComputedStyle(document.body);
  const isDarkMode = document.body.classList.contains('chakra-ui-dark') || document.documentElement.dataset.theme === 'dark';
  const themeColor = (name: string) => bodyStyle.getPropertyValue(`--chakra-colors-${name}`).trim();

  return {
    mode: isDarkMode ? 'dark' : 'light',
    background: bodyStyle.backgroundColor,
    foreground: bodyStyle.color,
    muted: themeColor(isDarkMode ? 'gray-400' : 'gray-600'),
    border: themeColor(isDarkMode ? 'gray-600' : 'gray-200'),
    accent: themeColor(isDarkMode ? 'teal-300' : 'teal-600'),
    fontFamily: bodyStyle.fontFamily,
  };
}

export function getPluginContext(boardId: string, roomId: string, appId?: string): PluginContext {
  const uiState = useUIStore.getState();
  const localContext = usePluginContextStore.getState();
  const selectedAppId = appId ?? uiState.selectedAppId;
  const app = useAppStore
    .getState()
    .apps.find((item) => item._id === selectedAppId && item.data.boardId === boardId && item.data.roomId === roomId);
  const documentContext = app ? usePluginContextStore.getState().documents.find((entry) => entry.appId === app._id)?.document : undefined;

  let selectedAppIds = uiState.selectedAppsIds;

  if (appId) {
    selectedAppIds = [appId];
  } else if (!selectedAppIds.length) {
    selectedAppIds = app ? [app._id] : [];
  }

  return {
    boardId,
    roomId,
    selectedAppIds,
    appOrder: localContext.boardId === boardId ? localContext.appOrder : [],
    viewport: { ...uiState.viewport, scale: uiState.scale },
    theme: getTheme(),
    position: {
      x: uiState.viewport.position.x + uiState.viewport.size.width / 2,
      y: uiState.viewport.position.y + uiState.viewport.size.height / 2,
    },
    ...(app ? { app: appRecord(app) } : {}),
    ...(documentContext ? { document: documentContext } : {}),
  };
}

function permittedContext(plugin: EnabledPlugin, context: PluginContext): PluginContext {
  const capabilities = plugin.data.package.manifest.capabilities;
  const canReadApps = capabilities.includes('apps.read');
  const canReadDocument = capabilities.includes('documents.read');
  const ownApp = context.app?.data.type === 'PluginApp' && context.app.data.state.pluginId === plugin._id;

  let selectedAppIds: readonly string[] = [];

  if (canReadApps) {
    selectedAppIds = context.selectedAppIds;
  } else if (ownApp) {
    selectedAppIds = [context.app._id];
  }

  return {
    boardId: context.boardId,
    roomId: context.roomId,
    viewport: context.viewport,
    theme: context.theme,
    selectedAppIds,
    appOrder: canReadApps ? context.appOrder : [],
    app: canReadApps || ownApp ? context.app : undefined,
    document: canReadDocument ? context.document : undefined,
    position: context.position,
  };
}

export function pluginTargetMatches(pluginId: string, target: PluginTarget | undefined, app?: PluginAppRecord): boolean {
  if (!target) {
    return true;
  }

  if (!app) {
    return false;
  }

  if ('appTypes' in target) {
    return target.appTypes.includes(app.data.type);
  }

  // includes() is false for any non-string viewId.
  return app.data.type === 'PluginApp' && app.data.state.pluginId === pluginId && target.viewIds.includes(app.data.state.viewId as string);
}

function commandMatches(plugin: EnabledPlugin, command: PluginCommand, context: PluginContext): boolean {
  if (!pluginTargetMatches(plugin._id, command.target, context.app)) {
    return false;
  }

  const action = command.action;

  if (!action || action.type === 'create') {
    return true;
  }

  const view = actionView(plugin, action.viewId);

  if (action.type === 'overlay') {
    return Boolean(context.app && pluginTargetMatches(plugin._id, view.target, context.app));
  }

  return (
    pluginTargetMatches(plugin._id, view.target, context.app) && ((view.kind === 'panel' && view.scope === 'board') || Boolean(context.app))
  );
}

/** The manifest schema binds every command action to a declared view of the action's kind. */
function actionView<Kind extends PluginView['kind'] = 'panel' | 'overlay'>(plugin: EnabledPlugin, viewId: string) {
  return plugin.data.package.manifest.views?.find((item) => item.id === viewId) as Extract<PluginView, { kind: Kind }>;
}

function openPanel(plugin: EnabledPlugin, boardId: string, roomId: string, viewId: string, appId?: string): void {
  const view = plugin.data.package.manifest.views?.find((item) => item.id === viewId);

  if (!view || view.kind !== 'panel') {
    throw new Error('Unknown panel.');
  }

  if (view.scope === 'app') {
    const app = useAppStore
      .getState()
      .apps.find((item) => item._id === appId && item.data.boardId === boardId && item.data.roomId === roomId);
    if (!app || !pluginTargetMatches(plugin._id, view.target, app)) {
      throw new Error('This panel requires a matching app on the current board.');
    }
  } else if (appId) {
    throw new Error('Board panels cannot bind an app.');
  } else if (!pluginTargetMatches(plugin._id, view.target, getPluginContext(boardId, roomId).app)) {
    throw new Error('This panel is not available for the current app.');
  }

  useExtensionUI.setState({ panel: { pluginId: plugin._id, viewId, ...(appId ? { appId } : {}) } });
}

// The server validates every operation; the host reads params only to place new apps.
async function serverOperation(
  plugin: EnabledPlugin,
  context: PluginContext,
  method: string,
  params: unknown,
  signal?: AbortSignal,
  appId?: string,
): Promise<unknown> {
  if (method === 'apps.create') {
    const creation = params as { position?: unknown; size?: { width: number; height: number } };

    if (creation.position === undefined) {
      params = {
        ...creation,
        position: placeNewApp(
          { width: creation.size?.width ?? 600, height: creation.size?.height ?? 400 },
          { target: context.position },
        ),
      };
    }
  }

  const response = await fetch(`/api/plugins/${encodeURIComponent(plugin._id)}/boards/${encodeURIComponent(context.boardId)}/operation`, {
    method: 'POST',
    credentials: 'same-origin',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, params, packageDigest: plugin.data.package.digest, ...(appId ? { appId } : {}) }),
  });
  const result = (await response.json()) as { success: boolean; data?: unknown; message?: string };

  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Extension operation failed.');
  }

  return result.data;
}

/** Callers pass a fresh context and a command from this plugin's manifest that matches it. */
async function dispatchCommand(plugin: EnabledPlugin, command: PluginCommand, context: PluginContext): Promise<void> {
  const action = command.action;

  if (action?.type === 'overlay') {
    // A matching overlay command requires an app.
    const key = overlayKey(plugin._id, (context.app as PluginAppRecord)._id, action.viewId);

    useExtensionUI.setState((state) => ({
      overlays: state.overlays.includes(key) ? state.overlays.filter((item) => item !== key) : [...state.overlays, key],
    }));
  } else if (action?.type === 'panel') {
    const view = actionView<'panel'>(plugin, action.viewId);

    openPanel(plugin, context.boardId, context.roomId, action.viewId, view.scope === 'app' ? context.app?._id : undefined);
  } else if (action?.type === 'create') {
    const view = actionView<'app'>(plugin, action.viewId);

    await serverOperation(plugin, context, 'apps.create', {
      type: 'PluginApp',
      title: view.title,
      size: { width: view.width ?? 600, height: view.height ?? 400 },
      state: { pluginId: plugin._id, viewId: view.id, content: {} },
    });
  } else {
    const runtime = useExtensionUI.getState().runtimes.find((item) => item.pluginId === plugin._id);
    if (!runtime) {
      throw new Error('Extension is still loading.');
    }

    await runtime.invoke(command, context);
  }
}

function overlayKey(pluginId: string, appId: string, viewId: string): string {
  return `${pluginId}:${appId}:${viewId}`;
}

type FrameProps = Readonly<{
  plugin: EnabledPlugin;
  boardId: string;
  roomId: string;
  entry: string;
  appId?: string;
  viewId?: string;
  // App views, app panels and overlays bind to a live board app, never a context snapshot.
  controller?: boolean;
}>;

const frameStyle = { width: '100%', height: '100%', border: 0 } as const;

/**
 * Each sandbox gets a dedicated port. Revocation closes it immediately; every
 * server operation independently checks the current grant and user permissions.
 */
export function PluginFrame(props: FrameProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const latestProps = useRef(props);

  latestProps.current = props;

  const toast = useToast();
  const { yAnnotations } = useYjs();
  const packageDigest = props.plugin.data.package.digest;
  const src = `/plugins/host?${new URLSearchParams({
    roomId: props.roomId,
    name: props.plugin.data.name,
    digest: packageDigest,
    entry: props.entry,
  })}`;

  useEffect(() => {
    let abortController = new AbortController();
    let port: MessagePort | undefined;
    let textSubscriptions: readonly TextSubscription[] = [];
    let pendingCommands: readonly PendingCommand[] = [];
    const activeToastIds: (string | number)[] = [];
    let commandSequence = 0;

    const getContext = (): PluginContext => {
      const { plugin, boardId, roomId, appId } = latestProps.current;
      return permittedContext(plugin, getPluginContext(boardId, roomId, appId));
    };

    const stopSession = (notify = true) => {
      if (notify) {
        port?.postMessage({ protocol, kind: 'dispose', error: 'Extension frame disposed.' });
      }

      abortController.abort();
      port?.close();
      port = undefined;
      textSubscriptions = [];

      for (const pendingCommand of pendingCommands) {
        pendingCommand.reject(new Error('Extension frame disposed.'));
      }

      pendingCommands = [];

      for (const toastId of activeToastIds) {
        toast.close(toastId);
      }

      activeToastIds.length = 0;

      if (latestProps.current.controller) {
        useExtensionUI.setState((state) => ({
          runtimes: state.runtimes.filter((item) => item.pluginId !== latestProps.current.plugin._id),
        }));
      }
    };

    const sendEvent = <E extends Exclude<keyof PluginEvents, 'error'>>(event: E, data: PluginEvents[E]) => {
      port?.postMessage({ protocol, kind: 'event', event, data });
    };

    const readableTextApp = (appId: string): PluginAppRecord => {
      const { plugin, boardId, roomId } = latestProps.current;
      const app = useAppStore
        .getState()
        .apps.find((item) => item._id === appId && item.data.boardId === boardId && item.data.roomId === roomId);
      const record: PluginAppRecord | undefined = app;

      if (
        !record ||
        record.data.type !== 'PluginApp' ||
        (record.data.state.pluginId !== plugin._id && !plugin.data.package.manifest.capabilities.includes('apps.read'))
      ) {
        throw new Error('Text app is no longer available.');
      }

      return record;
    };

    const publishText = (subscription: Readonly<{ appId: string; field: string }>) => {
      const app = readableTextApp(subscription.appId);
      const texts = app.data.state.texts as Readonly<Record<string, string>> | undefined;
      const update = texts?.[subscription.field];

      if (typeof update === 'string') {
        sendEvent('text', { ...subscription, update });
      }
    };

    // A frame renders only while its plugin is enabled and its bound app matches; disposal closes the port.
    const performOperation = async (method: string, params: unknown): Promise<unknown> => {
      const activeProps = latestProps.current;
      const { plugin, boardId, roomId, appId } = activeProps;

      if (method === 'context.get') {
        return getContext();
      }
      if (method === 'annotations.list') {
        if (!plugin.data.package.manifest.capabilities.includes('annotations.read')) {
          throw new Error('Missing annotations.read capability.');
        }

        // Board frames mount inside the connected board's Yjs provider.
        return readPluginAnnotations(yAnnotations!.doc);
      }
      if (method === 'ui.panel.open') {
        // openPanel matches both ids against the manifest and the board.
        const input = params as { viewId: string; appId?: string };

        openPanel(plugin, boardId, roomId, input.viewId, input.appId);

        return null;
      }

      if (method === 'ui.panel.close') {
        if (useExtensionUI.getState().panel?.pluginId === plugin._id) {
          useExtensionUI.setState({ panel: null });
        }

        return null;
      }

      if (method === 'ui.openUrl') {
        if (!plugin.data.package.manifest.capabilities.includes('urls.open')) {
          throw new Error('Missing urls.open capability.');
        }

        const url = new URL((params as { url: string }).url);

        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
          throw new Error('Only HTTP(S) URLs without credentials can be opened.');
        }

        // A host-owned link supplies activation without guessing whether window.open was blocked.
        const toastId = toast({
          title: `${plugin.data.name} wants to open ${url.host}`,
          description: (
            <Button as="a" href={url.href} target="_blank" rel="noopener noreferrer" size="sm" onClick={() => toast.close(toastId)}>
              Open {url.host}
            </Button>
          ),
          status: 'info',
          duration: null,
          isClosable: true,
        });

        activeToastIds.push(toastId);

        return { requiresClick: true };
      }

      if (method === 'ui.download') {
        if (!plugin.data.package.manifest.capabilities.includes('downloads.write')) {
          throw new Error('Missing downloads.write capability.');
        }

        // createObjectURL rejects non-Blob data; the browser sanitizes download names.
        const input = params as { name: string; data: Blob };
        const url = URL.createObjectURL(input.data);

        return new Promise<void>((resolve, reject) => {
          let settled = false;
          let toastId: string | number | undefined;

          const finish = (error?: Error) => {
            if (settled) {
              return;
            }

            settled = true;

            if (toastId !== undefined) {
              toast.close(toastId);
            }

            if (error) {
              URL.revokeObjectURL(url);
              reject(error);
            } else {
              // Let the browser consume the download link before releasing its Blob URL.
              window.setTimeout(() => URL.revokeObjectURL(url), 0);
              resolve();
            }
          };

          // Disposal closes the prompt, which cancels through onCloseComplete.
          const cancel = () => finish(new Error('Download cancelled.'));

          const save = () => {
            if (settled) {
              return;
            }

            try {
              downloadFile(url, input.name);
              finish();
            } catch (error: unknown) {
              finish(error instanceof Error ? error : new Error('Download failed.'));
            }
          };

          if (navigator.userActivation?.isActive) {
            save();
            return;
          }

          toastId = toast({
            title: `${plugin.data.name} wants to save ${input.name}`,
            description: (
              <Box display="flex" gap={2}>
                <Button size="sm" onClick={save}>
                  Save {input.name}
                </Button>
                <Button size="sm" variant="outline" onClick={cancel}>
                  Cancel
                </Button>
              </Box>
            ),
            status: 'info',
            duration: null,
            isClosable: true,
            onCloseComplete: cancel,
          });

          activeToastIds.push(toastId);
        });
      }

      // The file service authorizes the grant, digest and asset capability.
      if (method === 'assets.read' || method === 'assets.upload') {
        const base = `/api/assets/plugins/${encodeURIComponent(plugin._id)}/boards/${encodeURIComponent(boardId)}`;
        let url: string;
        let body: FormData | undefined;

        if (method === 'assets.read') {
          const input = params as { id: string; page?: number };
          const pageQuery = input.page === undefined ? '' : `?page=${input.page}`;
          url = `${base}/${encodeURIComponent(input.id)}${pageQuery}`;
        } else {
          const input = params as { name: string; data: Blob };
          body = new FormData();
          body.append('files', input.data, input.name);
          url = `${base}/upload`;
        }

        const response = await fetch(url, {
          method: body ? 'POST' : 'GET',
          credentials: 'same-origin',
          signal: abortController.signal,
          headers: { 'x-sage3-plugin-digest': packageDigest },
          body,
        });

        if (!response.ok) {
          const error = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(error.error || 'Asset operation failed.');
        }

        return method === 'assets.read' ? response.blob() : response.json();
      }

      const result = await serverOperation(plugin, getContext(), method, params, abortController.signal, appId);

      // The server validated these params and the app's ownership.
      if (method === 'text.get') {
        const textInput = params as TextSubscription;

        if (!textSubscriptions.some((item) => item.appId === textInput.appId && item.field === textInput.field)) {
          textSubscriptions = [...textSubscriptions, textInput];
        }

        sendEvent('text', result as PluginTextSnapshot);

        // A store update may have arrived during text.get. Yjs safely merges both snapshots.
        if (useAppStore.getState().apps.some((item) => item._id === textInput.appId)) {
          publishText(textInput);
        }
      }

      return result;
    };

    const handleHandshake = (event: MessageEvent<unknown>) => {
      // The frame holds the same-origin host page; its sandboxed child cannot navigate it.
      if (event.source !== frame.current?.contentWindow) {
        return;
      }

      const activeProps = latestProps.current;
      stopSession();
      abortController = new AbortController();

      const channel = new MessageChannel();
      port = channel.port1;
      const sessionPort = port;

      // A closed port delivers nothing, and posting to one is a no-op.
      port.onmessage = (message: MessageEvent<unknown>) => {
        if (disposeSchema.safeParse(message.data).success) {
          stopSession(false);
          return;
        }

        const response = commandResponseSchema.safeParse(message.data);
        if (response.success) {
          const pendingCommand = pendingCommands.find((item) => item.id === response.data.id);
          pendingCommands = pendingCommands.filter((item) => item.id !== response.data.id);

          if (response.data.error) {
            pendingCommand?.reject(new Error(response.data.error));
          } else {
            pendingCommand?.resolve();
          }

          return;
        }

        const parsed = requestSchema.safeParse(message.data);
        if (!parsed.success) {
          return;
        }

        const request = parsed.data;
        void performOperation(request.method, request.params).then(
          (result) => sessionPort.postMessage({ protocol, kind: 'response', id: request.id, result }),
          (cause: unknown) =>
            sessionPort.postMessage({
              protocol,
              kind: 'response',
              id: request.id,
              error: cause instanceof Error ? cause.message : 'Extension operation failed.',
            }),
        );
      };
      port.start();

      const context = getContext();
      const current = activeProps.plugin;
      const initData: PluginInit = {
        pluginId: current._id,
        boardId: activeProps.boardId,
        roomId: activeProps.roomId,
        ...(activeProps.appId && context.app ? { appId: activeProps.appId } : {}),
        ...(activeProps.viewId ? { viewId: activeProps.viewId } : {}),
        context,
        state: {
          revision: current.data.boardRevisions?.[activeProps.boardId] ?? 0,
          value: current.data.boardState?.[activeProps.boardId] ?? {},
        },
        ...(activeProps.appId && context.app ? { app: context.app } : {}),
      };

      frame.current?.contentWindow?.postMessage({ protocol, kind: 'init', data: initData }, window.location.origin, [channel.port2]);

      if (activeProps.controller) {
        const runtime: Runtime = {
          pluginId: current._id,
          invoke: async (command, input) => {
            const id = `command:${++commandSequence}`;

            return new Promise<void>((resolve, reject) => {
              pendingCommands = [...pendingCommands, { id, resolve, reject }];
              sessionPort.postMessage({
                protocol,
                kind: 'request',
                id,
                method: 'command.run',
                params: { id: command.id, context: permittedContext(current, input) },
              });
            });
          },
        };
        useExtensionUI.setState((state) => ({
          runtimes: [...state.runtimes.filter((item) => item.pluginId !== runtime.pluginId), runtime],
        }));
      }
    };

    const publishContext = () => sendEvent('context', getContext());

    const unsubscribeUI = useUIStore.subscribe((state, previous) => {
      if (
        state.selectedAppId !== previous.selectedAppId ||
        state.selectedAppsIds !== previous.selectedAppsIds ||
        state.viewport !== previous.viewport ||
        state.scale !== previous.scale
      ) {
        publishContext();
      }
    });
    const unsubscribeDocuments = usePluginContextStore.subscribe(publishContext);
    const unsubscribeApps = useAppStore.subscribe((state, previous) => {
      if (state.apps === previous.apps || !port) {
        return;
      }

      publishContext();

      const { appId } = latestProps.current;
      const context = getContext();

      if (appId && context.app) {
        sendEvent('app', context.app);
      }

      for (const subscription of textSubscriptions) {
        const app = state.apps.find((item) => item._id === subscription.appId);
        if (app === previous.apps.find((item) => item._id === subscription.appId)) {
          continue;
        }

        try {
          publishText(subscription);
        } catch {
          textSubscriptions = textSubscriptions.filter((item) => item.appId !== subscription.appId);
        }
      }
    });

    // Disabling, removal or a new digest unmounts or restarts this frame through its parent.
    const unsubscribePlugins = usePluginStore.subscribe((state, previous) => {
      const { plugin: mounted, boardId } = latestProps.current;
      const plugin = state.plugins.find((item) => item._id === mounted._id);

      if (plugin && plugin !== previous.plugins.find((item) => item._id === mounted._id)) {
        sendEvent('state', {
          revision: plugin.data.boardRevisions?.[boardId] ?? 0,
          value: plugin.data.boardState?.[boardId] ?? {},
        });
      }
    });

    const themeObserver = new MutationObserver(publishContext);
    themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });

    window.addEventListener('message', handleHandshake);

    if (frame.current) {
      frame.current.src = src;
    }

    return () => {
      stopSession();
      unsubscribeUI();
      unsubscribeDocuments();
      unsubscribeApps();
      unsubscribePlugins();
      themeObserver.disconnect();
      window.removeEventListener('message', handleHandshake);
    };
  }, [src, packageDigest, props.boardId, props.appId, props.viewId, props.controller, toast, yAnnotations]);

  return (
    <iframe
      ref={frame}
      title={`${props.plugin.data.name}${props.viewId ? `: ${props.viewId}` : ''}`}
      referrerPolicy="no-referrer"
      style={frameStyle}
    />
  );
}

type ActionContext = Pick<PluginContext, 'boardId' | 'roomId'> & Partial<PluginContext>;
type PluginActionsProps = Readonly<
  {
    placement: PluginCommand['placements'][number];
    menuItems?: boolean;
    onActionComplete?: () => void;
  } & ({ context: ActionContext; app?: undefined } | { app: PluginAppRecord; context?: undefined })
>;

export function PluginActions(props: PluginActionsProps) {
  const plugins = usePluginStore((state) => state.plugins);
  const runtimes = useExtensionUI((state) => state.runtimes);
  const overlays = useExtensionUI((state) => state.overlays);
  useUIStore((state) => state.selectedAppId);
  useUIStore((state) => state.selectedAppsIds);
  useAppStore((state) => (props.app ? undefined : state.apps));

  const toast = useToast();
  const contextInput = props.context ?? props.app.data;
  const appId = props.app?._id ?? props.context?.app?._id;
  const context = getPluginContext(contextInput.boardId, contextInput.roomId, appId);
  const Action = props.menuItems ? MenuItem : Button;

  return (
    <>
      {plugins
        .filter((plugin) => isPluginEnabled(plugin, context.boardId))
        .map((plugin) => (
          <Fragment key={plugin._id}>
            {plugin.data.package.manifest.commands
              ?.filter((command) => command.placements.includes(props.placement) && commandMatches(plugin, command, context))
              .map((command) => {
                const isOverlayVisible =
                  command.action?.type === 'overlay' &&
                  context.app &&
                  overlays.includes(overlayKey(plugin._id, context.app._id, command.action.viewId));

                return (
                  <Action
                    key={command.id}
                    size={props.menuItems ? 'sm' : 'xs'}
                    {...(props.menuItems ? {} : { flexShrink: 0, whiteSpace: 'nowrap' })}
                    isDisabled={!command.action && !runtimes.some((runtime) => runtime.pluginId === plugin._id)}
                    onClick={() => {
                      const invocation = getPluginContext(context.boardId, context.roomId, appId);

                      void dispatchCommand(plugin, command, {
                        ...invocation,
                        position: props.context?.position ?? invocation.position,
                      })
                        .then(() => {
                          useExtensionUI.setState({ menu: null });
                          props.onActionComplete?.();
                        })
                        .catch((error: unknown) => {
                          toast({
                            title: command.title,
                            description: error instanceof Error ? error.message : 'Extension command failed.',
                            status: 'error',
                            isClosable: true,
                          });
                        });
                    }}
                  >
                    {isOverlayVisible ? 'Hide ' : ''}
                    {command.title}
                  </Action>
                );
              })}
          </Fragment>
        ))}
    </>
  );
}

export function openPluginContextMenu(event: React.MouseEvent, app: PluginAppRecord): void {
  const context = getPluginContext(app.data.boardId, app.data.roomId, app._id);
  const available = usePluginStore
    .getState()
    .plugins.some(
      (plugin) =>
        isPluginEnabled(plugin, context.boardId) &&
        plugin.data.package.manifest.commands?.some(
          (command) => command.placements.includes('context-menu') && commandMatches(plugin, command, context),
        ),
    );

  if (!available) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  useExtensionUI.setState({ menu: { context, x: event.clientX, y: event.clientY } });
}

export function PluginOverlays({ app }: Readonly<{ app: PluginAppRecord }>) {
  const plugins = usePluginStore((state) => state.plugins);
  const overlays = useExtensionUI((state) => state.overlays);
  const context = getPluginContext(app.data.boardId, app.data.roomId, app._id);

  return (
    <>
      {plugins
        .filter((plugin) => isPluginEnabled(plugin, context.boardId))
        .flatMap((plugin) => {
          const visibleViews = plugin.data.package.manifest.views?.filter(
            (view) =>
              view.kind === 'overlay' &&
              pluginTargetMatches(plugin._id, view.target, app) &&
              overlays.includes(overlayKey(plugin._id, app._id, view.id)),
          );

          return (
            visibleViews?.map((view) => (
              <Box key={`${plugin._id}:${view.id}`} position="absolute" inset={0} zIndex={2}>
                <PluginFrame
                  plugin={plugin}
                  boardId={context.boardId}
                  roomId={context.roomId}
                  entry={view.entry}
                  viewId={view.id}
                  appId={app._id}
                />
              </Box>
            )) ?? []
          );
        })}
    </>
  );
}

type BoardPluginRuntimeProps = Readonly<{
  boardId: string;
  roomId: string;
}>;

export function BoardPluginRuntime({ boardId, roomId }: BoardPluginRuntimeProps) {
  const plugins = usePluginStore((state) => state.plugins);
  const panel = useExtensionUI((state) => state.panel);
  const menu = useExtensionUI((state) => state.menu);
  const apps = useAppStore((state) => state.apps);
  const { uiToBoard } = useCursorBoardPosition();
  const toast = useToast();
  const panelReturnFocus = useRef<HTMLElement | null>(null);
  const focusPanel = useCallback((element: HTMLButtonElement | null) => {
    if (element) {
      panelReturnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

      element.focus();
    } else {
      if (panelReturnFocus.current?.isConnected) {
        panelReturnFocus.current.focus();
      }

      panelReturnFocus.current = null;
    }
  }, []);

  const enabledPlugins = plugins.filter((plugin) => isPluginEnabled(plugin, boardId));
  const panelPlugin = enabledPlugins.find((plugin) => plugin._id === panel?.pluginId);
  const panelView = panelPlugin?.data.package.manifest.views?.find(
    (view) =>
      view.id === panel?.viewId &&
      view.kind === 'panel' &&
      (view.scope === 'board' ||
        apps.some(
          (app) =>
            app._id === panel?.appId &&
            app.data.boardId === boardId &&
            app.data.roomId === roomId &&
            pluginTargetMatches(panelPlugin._id, view.target, app),
        )),
  );

  useEffect(() => {
    return () => {
      useExtensionUI.setState({
        panel: null,
        menu: null,
        overlays: [],
      });
    };
  }, [boardId]);

  useEffect(() => {
    const selector = '[data-sage-app-window]';
    const refreshAppOrder = () => {
      const windows: { appId: string; z: number }[] = [];
      for (const element of document.querySelectorAll<HTMLElement>(selector)) {
        if (element.dataset.sageBoardId === boardId) {
          windows.push({ appId: element.dataset.sageAppWindow!, z: Number(element.dataset.sageAppZ) });
        }
      }
      // Stable sort preserves actual DOM paint order for equal z-indices.
      windows.sort((a, b) => a.z - b.z);
      const appOrder = windows.map((item) => item.appId);
      const previous = usePluginContextStore.getState();
      if (
        previous.boardId !== boardId ||
        previous.appOrder.length !== appOrder.length ||
        appOrder.some((appId, index) => appId !== previous.appOrder[index])
      ) {
        previous.setAppOrder(boardId, appOrder);
      }
    };
    const containsWindow = (node: Node) => node instanceof Element && (node.matches(selector) || node.querySelector(selector));
    const observer = new MutationObserver((changes) => {
      if (
        changes.some(
          (change) =>
            change.type === 'attributes' || [...change.addedNodes, ...change.removedNodes].some(containsWindow),
        )
      ) {
        refreshAppOrder();
      }
    });
    refreshAppOrder();
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-sage-app-z', 'data-sage-board-id'],
    });
    return () => {
      observer.disconnect();
      usePluginContextStore.getState().setAppOrder(null, []);
    };
  }, [boardId]);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (
        event.repeat ||
        (event.target instanceof HTMLElement &&
          (event.target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)))
      ) {
        return;
      }

      const context = getPluginContext(boardId, roomId);

      for (const plugin of usePluginStore.getState().plugins) {
        if (!isPluginEnabled(plugin, boardId)) {
          continue;
        }

        const command = plugin.data.package.manifest.commands?.find((item) => {
          if (!item.shortcut || !commandMatches(plugin, item, context)) {
            return false;
          }

          const keys = item.shortcut.toLowerCase().split('+');

          return (
            keys.includes('ctrl') === event.ctrlKey &&
            keys.includes('meta') === event.metaKey &&
            keys.includes('shift') === event.shiftKey &&
            keys.includes('alt') === event.altKey &&
            keys[keys.length - 1] === event.key.toLowerCase()
          );
        });

        const runtime = useExtensionUI.getState().runtimes.find((item) => item.pluginId === plugin._id);

        if (command && (command.action || runtime)) {
          event.preventDefault();

          void dispatchCommand(plugin, command, context).catch((error: unknown) => {
            toast({
              title: command.title,
              description: error instanceof Error ? error.message : 'Extension command failed.',
              status: 'error',
              isClosable: true,
            });
          });

          break;
        }
      }
    };

    window.addEventListener('keydown', keydown);

    return () => window.removeEventListener('keydown', keydown);
  }, [boardId, roomId, toast]);

  return (
    <>
      <Box display="none">
        {enabledPlugins.map((plugin) => (
          <PluginFrame
            key={`${plugin._id}:${plugin.data.package.digest}`}
            plugin={plugin}
            boardId={boardId}
            roomId={roomId}
            entry={plugin.data.package.manifest.entry}
            controller
          />
        ))}
      </Box>

      {menu && (
        <Portal>
          <Menu isOpen onClose={() => useExtensionUI.setState({ menu: null })} placement="bottom-start">
            <MenuButton
              as={Button}
              aria-label="Extension actions"
              position="fixed"
              left={menu.x}
              top={menu.y}
              width="1px"
              height="1px"
              minWidth={0}
              padding={0}
              opacity={0}
            />
            <MenuList zIndex={2000}>
              <PluginActions placement="context-menu" context={{ ...menu.context, position: uiToBoard(menu.x, menu.y) }} menuItems />
            </MenuList>
          </Menu>
        </Portal>
      )}

      {panel && panelPlugin && panelView && (
        <Portal>
          <Box
            as="aside"
            aria-label={panelView.title}
            position="fixed"
            top={0}
            right={0}
            zIndex="modal"
            width={panelView.width ?? 448}
            maxWidth="100vw"
            height={panelView.height ?? '100vh'}
            maxHeight="100vh"
            display="flex"
            flexDirection="column"
            bg="chakra-body-bg"
            color="chakra-body-text"
            borderLeftWidth="1px"
            boxShadow="lg"
            onKeyDown={(event: ReactKeyboardEvent<HTMLElement>) => {
              if (event.key === 'Escape') {
                event.stopPropagation();
                useExtensionUI.setState({ panel: null });
              }
            }}
          >
            <Box display="flex" alignItems="center" justifyContent="space-between" padding={4} gap={3}>
              <Box as="h2" fontSize="lg" fontWeight="semibold">
                {panelView.title}
              </Box>
              <CloseButton ref={focusPanel} aria-label="Close extension panel" onClick={() => useExtensionUI.setState({ panel: null })} />
            </Box>
            <Box flex="1" minHeight={0}>
              <PluginFrame
                plugin={panelPlugin}
                boardId={boardId}
                roomId={roomId}
                entry={panelView.entry}
                viewId={panelView.id}
                appId={panel.appId}
              />
            </Box>
          </Box>
        </Portal>
      )}
    </>
  );
}
