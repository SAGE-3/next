/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 * Relays a browser WebSocket to/from the shared per-appId SSH connection.
 * Every viewer of the app instance connects here and receives the same
 * output broadcast; only the current controller's input is honored — this
 * is enforced here, not left to the frontend to self-police.
 */

import { WebSocket } from 'ws';
import { SSHConnectionRegistry } from './sshConnectionRegistry';
import { isHostAllowed } from '@sage3/backend';

// The minimal shape this module needs from an SSHTerminal app's current
// state — supplied by the caller (main.ts) via a lookup function, since
// this module has no direct dependency on the app-state store.
type SSHAppState = {
  host: string;
  port: number;
  ownerId: string;
  credentialId?: string;
  sessionName?: string;
  controllerId?: string;
};

type ClientMessage =
  | { type: 'input'; data: string }
  | { type: 'resize'; cols: number; rows: number }
  | { type: 'setWritable'; writable: boolean }
  | { type: 'setSharedControl'; shared: boolean };
type ServerMessage =
  | { type: 'output'; data: string }
  | { type: 'status'; connected: boolean; error?: string }
  | { type: 'sharedControl'; shared: boolean };

// Clear the screen and home the cursor before a capture-pane snapshot, so the
// snapshot replaces whatever the raw tmux attach paint drew on a first/reconnecting
// viewer's xterm (that paint is formatted for the exec pty geometry and misrenders).
const CLEAR_SCREEN = '\u001b[2J\u001b[H';

function send(socket: WebSocket, message: ServerMessage) {
  socket.send(JSON.stringify(message));
}

export function attachSSHWebSocketServer(
  wsServer: { on: (event: 'connection', listener: (socket: WebSocket, req: { user: { id: string }; url: string }) => void) => void },
  registry: SSHConnectionRegistry,
  // Async: the real implementation reads this via AppsCollection.get(),
  // a Redis call — see the note above Step 1 explaining why.
  getAppState: (appId: string) => Promise<SSHAppState>,
  allowedHosts: string[]
): void {
  // Every viewer of the same appId shares a single SSH connection and must
  // all receive the same output/status broadcast. Track the connected
  // sockets per appId here (module-level to this attach() call) rather than
  // subscribing to registry.onOutput/onStatus once per socket — that would
  // register a separate listener closed over just that one socket, so a
  // second viewer's output would never reach the first viewer's socket.
  const viewersByApp = new Map<string, Set<WebSocket>>();
  const unsubscribeByApp = new Map<string, () => void>();
  // Whether control is shared for an app. Relay-authoritative (NOT app state,
  // which any board member can edit): private by default, only the owner may
  // enable sharing. Resets to private when the connection is torn down.
  const sharedControlByApp = new Map<string, boolean>();

  // Who may drive input/setWritable: in private mode only the credential owner;
  // in shared mode the current take-control holder. The whitelist + this gate are
  // the security boundary — the frontend only mirrors it for UX.
  const mayControl = (state: SSHAppState, userId: string, appId: string): boolean =>
    (sharedControlByApp.get(appId) ?? false) ? state.controllerId === userId : state.ownerId === userId;

  wsServer.on('connection', async (socket, req) => {
    // Attach error handler FIRST, before any early returns
    socket.on('error', () => {
      console.log('sshWebSocketRelay> socket error');
    });

    const url = new URL(req.url, 'http://localhost');
    const appId = url.searchParams.get('appId');
    console.log('sshWebSocketRelay> connection received, appId=', appId, 'user=', req.user?.id);
    if (!appId) {
      socket.close();
      return;
    }

    let viewers = viewersByApp.get(appId);
    if (!viewers) {
      viewers = new Set();
      viewersByApp.set(appId, viewers);
    }
    viewers.add(socket);


    if (!registry.getConnection(appId)) {
      try {
        const state = await getAppState(appId);
        if (!isHostAllowed(state.host, state.port, allowedHosts)) {
          send(socket, { type: 'status', connected: false, error: 'host_not_allowed' });
          viewers.delete(socket);
          if (viewers.size === 0) viewersByApp.delete(appId);
          socket.close();
          return;
        }
        const result = await registry.connect(appId, {
          host: state.host,
          port: state.port,
          ownerId: state.ownerId,
          credentialId: state.credentialId,
          sessionName: state.sessionName,
        });
        if (!result.success) {
          // registry.connect() never rejects — it always resolves, even on
          // failure. Treat a resolved failure identically to the catch
          // block below: report status and bail out BEFORE the subscribe
          // block runs. Falling through here would still register a
          // subscription in unsubscribeByApp even though there's no real
          // connection to subscribe to (onOutput/onStatus return no-op
          // unsubscribes when getConnection() is undefined), which would
          // permanently poison that appId's subscription for every future
          // viewer via the `!unsubscribeByApp.has(appId)` guard below.
          send(socket, { type: 'status', connected: false, error: result.error });
          viewers.delete(socket);
          if (viewers.size === 0) viewersByApp.delete(appId);
          socket.close();
          return;
        }
      } catch (error) {
        console.log('sshWebSocketRelay> failed to establish connection for appId', appId, error);
        // The socket was already added to the viewers Set before this
        // attempt — remove it now, since the close handler that would
        // normally do this cleanup isn't registered yet at this point.
        viewers.delete(socket);
        if (viewers.size === 0) viewersByApp.delete(appId);
        socket.close();
        return;
      }
    }

    // Only the first viewer of an appId subscribes to the registry — every
    // subsequent viewer just gets added to the `viewers` Set above and rides
    // along on that single subscription's broadcast.
    console.log('sshWebSocketRelay> subscribing viewer, has existing subscription=', unsubscribeByApp.has(appId));
    if (!unsubscribeByApp.has(appId)) {
      const unsubscribeOutput = registry.onOutput(appId, (data) => {
        console.log('sshWebSocketRelay> broadcasting output, bytes=', data.length, 'viewers=', viewersByApp.get(appId)?.size);
        viewersByApp.get(appId)?.forEach((viewerSocket) => send(viewerSocket, { type: 'output', data }));
      });
      const unsubscribeStatus = registry.onStatus(appId, (status) => {
        viewersByApp
          .get(appId)
          ?.forEach((viewerSocket) => send(viewerSocket, { type: 'status', connected: status.connected, error: status.error }));
      });
      unsubscribeByApp.set(appId, () => {
        unsubscribeOutput();
        unsubscribeStatus();
      });
    }

    socket.on('message', async (raw: Buffer | string) => {
      let message: ClientMessage;
      try {
        message = JSON.parse(raw.toString());
      } catch {
        return;
      }

      if (message.type === 'input') {
        const state = await getAppState(appId);
        if (!mayControl(state, req.user.id, appId)) return;
        registry.write(appId, message.data);
      } else if (message.type === 'resize') {
        // Size follows the shared board window and is decoupled from control:
        // every viewer computes the same grid from the shared app size, so honor
        // a resize from any viewer (read-only included).
        registry.resize(appId, message.cols, message.rows);
      } else if (message.type === 'setWritable') {
        // Flipping a read-only external session read-write requires the same
        // control right as typing (belt-and-suspenders under the relay gate).
        const state = await getAppState(appId);
        if (!mayControl(state, req.user.id, appId)) return;
        registry.setWritable(appId, message.writable);
      } else if (message.type === 'setSharedControl') {
        // Only the owner may enable/disable sharing. Relay-authoritative so a
        // non-owner can't grant themselves control by editing app state.
        const state = await getAppState(appId);
        if (state.ownerId !== req.user.id) return;
        sharedControlByApp.set(appId, message.shared);
        viewersByApp.get(appId)?.forEach((s) => send(s, { type: 'sharedControl', shared: message.shared }));
      }
    });

    socket.on('close', () => {
      viewers?.delete(socket);
      if (viewers && viewers.size === 0) {
        viewersByApp.delete(appId);
        unsubscribeByApp.get(appId)?.();
        unsubscribeByApp.delete(appId);
        // No one is watching this app instance's terminal anymore — tear
        // down the shared SSH/tmux connection rather than leaving it open
        // for the lifetime of the homebase process.
        registry.disconnect(appId);
        sharedControlByApp.delete(appId);
      }
    });

    // Paint EVERY joining viewer with the current tmux screen via a capture-pane
    // snapshot — including the first viewer, which is what a reconnect (leave and
    // return to the board) produces. We can't rely on tmux's own attach paint for
    // that first viewer: tmux formats it for the exec pty's geometry (80x24), so a
    // reconnecting controller whose xterm is a different, board-derived size renders
    // it corrupted (misplaced scroll region / status bar, lost scrollback). The
    // capture-pane snapshot is line-based (no absolute cursor positioning), so it
    // renders correctly at any xterm size; the leading clear replaces whatever the
    // attach paint drew. Done AFTER the message/close handlers so the async capture
    // never delays them; the socket is already in the viewers Set, so live output
    // during the capture still reaches it and self-heals on the next byte. Skipped
    // if the viewer already left, or when there's no snapshot (capture error).
    const snapshot = await registry.captureSnapshot(appId);
    if (snapshot && viewersByApp.get(appId)?.has(socket)) {
      send(socket, { type: 'output', data: CLEAR_SCREEN + snapshot });
    }

    // Tell the joining viewer whether control is currently shared (default private).
    send(socket, { type: 'sharedControl', shared: sharedControlByApp.get(appId) ?? false });

    // Tell the joining viewer the current authoritative pty size so it renders
    // at the real size and letterboxes, rather than measuring its own window.
  });
}
