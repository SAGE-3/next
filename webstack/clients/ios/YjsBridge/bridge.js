/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * The web client's Yjs, for the iOS app (run in JavaScriptCore): a board's annotations
 * room, 'annotations-<boardId>', kept in sync over the y-websocket protocol. Swift owns
 * the websocket and passes its binary messages in and out as base64; the shapes are
 * built exactly as the web whiteboard builds them (Whiteboard.tsx): a Y.Array 'lines' of
 * Y.Map { id, type, points: Y.Array of [x, y, x, y, ...], userColor, alpha, size,
 * isComplete, userId, text }.
 *
 * Needs from the host, before this runs: globalThis.crypto.getRandomValues, btoa, atob,
 * and the callbacks __send(base64) (a message for the server) and __changed() (the lines
 * changed).
 */

import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';

// Base64 with the host's btoa/atob: lib0/buffer takes JavaScriptCore for Node (no
// window) and reaches for Buffer
function toBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function fromBase64(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// y-websocket message types
const messageSync = 0;
// Updates received from the server, so they aren't sent back
const REMOTE = 'remote';

const doc = new Y.Doc();
const lines = doc.getArray('lines');
let synced = false;

// Local changes go to the server; any change is reported to the app
doc.on('update', (update, origin) => {
  if (origin !== REMOTE) {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.writeUpdate(encoder, update);
    globalThis.__send(toBase64(encoding.toUint8Array(encoder)));
  }
  globalThis.__changed();
});

/** A shape as the web whiteboard stores it (commitShape / buildYLineMap) */
function shapeMap(line) {
  const points = new Y.Array();
  points.push(line.points || []);
  const shape = new Y.Map();
  shape.set('id', line.id);
  shape.set('type', line.type || 'line');
  shape.set('points', points);
  shape.set('userColor', line.userColor);
  shape.set('alpha', line.alpha);
  shape.set('size', line.size);
  shape.set('isComplete', true);
  shape.set('userId', line.userId);
  shape.set('text', line.text || '');
  return shape;
}

globalThis.YjsBridge = {
  /** The first message on a new connection: our state, asking for the server's */
  start() {
    synced = false;
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.writeSyncStep1(encoder, doc);
    return toBase64(encoding.toUint8Array(encoder));
  },

  /** A message from the server; returns the reply to send, or '' */
  receive(message) {
    const decoder = decoding.createDecoder(fromBase64(message));
    const encoder = encoding.createEncoder();
    const type = decoding.readVarUint(decoder);
    // Awareness, auth and awareness queries are not used: the app doesn't announce
    // itself in the room (the web whiteboard loads the saved copy only when alone)
    if (type !== messageSync) return '';
    encoding.writeVarUint(encoder, messageSync);
    const syncType = syncProtocol.readSyncMessage(decoder, encoder, doc, REMOTE);
    if (syncType === syncProtocol.messageYjsSyncStep2) synced = true;
    return encoding.length(encoder) > 1 ? toBase64(encoding.toUint8Array(encoder)) : '';
  },

  isSynced() {
    return synced;
  },

  /** All the shapes, as JSON */
  lines() {
    return JSON.stringify(lines.toJSON());
  },

  /** Add a shape (JSON); returns it as stored, for the saved copy */
  add(json) {
    const shape = shapeMap(JSON.parse(json));
    lines.push([shape]);
    return JSON.stringify(shape.toJSON());
  },

  /** Remove a shape by id; true if it was there */
  remove(id) {
    for (let index = lines.length - 1; index >= 0; index--) {
      if (lines.get(index).get('id') === id) {
        lines.delete(index, 1);
        return true;
      }
    }
    return false;
  },

  /** Load the saved shapes (JSON array) into an empty room, as the web whiteboard does */
  hydrate(json) {
    if (lines.length > 0) return false;
    const saved = JSON.parse(json);
    if (!Array.isArray(saved) || saved.length === 0) return false;
    doc.transact(() => lines.push(saved.map(shapeMap)));
    return true;
  },
};
