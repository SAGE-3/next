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
 * The same bridge serves the apps room, 'apps-<boardId>': a Y.Text per app named by its
 * id (a Stickie's text, as the web's TextAreaBinding keeps it). There the app announces
 * itself with an awareness 'user' { name, color, uid }, as the web's useYjs does: the web
 * Stickie takes a text save from someone not in the room's awareness for a Python
 * update. The awareness is written by hand (the y-protocols Awareness needs timers
 * JavaScriptCore lacks); the app renews it every 15 s.
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
const messageAwareness = 1;
const messageQueryAwareness = 3;
// Awareness states older than this are gone (y-protocols' outdatedTimeout)
const AWARENESS_TIMEOUT = 30000;
// Updates received from the server, so they aren't sent back
const REMOTE = 'remote';

const doc = new Y.Doc();
const lines = doc.getArray('lines');
let synced = false;
// Our awareness (null until announced) and the others' (clientID -> { clock, state, seen })
const local = { clock: 0, state: null };
const others = new Map();

/** An awareness message with our state */
function awarenessMessage() {
  const update = encoding.createEncoder();
  encoding.writeVarUint(update, 1);
  encoding.writeVarUint(update, doc.clientID);
  encoding.writeVarUint(update, local.clock);
  encoding.writeVarString(update, JSON.stringify(local.state));
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, messageAwareness);
  encoding.writeVarUint8Array(encoder, encoding.toUint8Array(update));
  return toBase64(encoding.toUint8Array(encoder));
}

/** Others' awareness states, from the server */
function readAwareness(decoder) {
  const update = decoding.createDecoder(decoding.readVarUint8Array(decoder));
  const count = decoding.readVarUint(update);
  for (let i = 0; i < count; i++) {
    const clientID = decoding.readVarUint(update);
    const clock = decoding.readVarUint(update);
    const state = JSON.parse(decoding.readVarString(update));
    if (clientID === doc.clientID) continue;
    const known = others.get(clientID);
    if (known && known.clock >= clock && state !== null) continue;
    if (state === null) others.delete(clientID);
    else others.set(clientID, { clock, state, seen: Date.now() });
  }
}

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
    others.clear();
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
    if (type === messageAwareness) {
      readAwareness(decoder);
      return '';
    }
    if (type === messageQueryAwareness) return local.state ? awarenessMessage() : '';
    // Auth messages are not used
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

  // MARK: Awareness (the apps room; the annotations room doesn't announce itself, since
  // the web whiteboard loads the saved copy only when alone)

  /** Announce us in the room (JSON { user: { name, color, uid } }); returns the message */
  announce(json) {
    local.clock++;
    local.state = JSON.parse(json);
    return awarenessMessage();
  },
  /** Our awareness again, before the server forgets it; '' if not announced */
  renew() {
    if (!local.state) return '';
    local.clock++;
    return awarenessMessage();
  },
  /** Leave the room's awareness; returns the message */
  leave() {
    local.clock++;
    local.state = null;
    return awarenessMessage();
  },
  /** How many other people are in the room */
  peers() {
    const now = Date.now();
    let count = 0;
    others.forEach((other) => {
      if (now - other.seen < AWARENESS_TIMEOUT) count++;
    });
    return count;
  },

  // MARK: Texts (the apps room)

  /** An app's text */
  text(id) {
    return doc.getText(id).toString();
  },
  /** Change an app's text to a new value, as one edit (what changed between the common
   *  start and end), so others' typing elsewhere in it is kept */
  setText(id, value) {
    const ytext = doc.getText(id);
    const old = ytext.toString();
    if (old === value) return;
    let start = 0;
    while (start < old.length && start < value.length && old[start] === value[start]) start++;
    let end = 0;
    while (end < old.length - start && end < value.length - start && old[old.length - 1 - end] === value[value.length - 1 - end]) end++;
    doc.transact(() => {
      if (old.length - start - end > 0) ytext.delete(start, old.length - start - end);
      if (value.length - start - end > 0) ytext.insert(start, value.slice(start, value.length - end));
    });
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
