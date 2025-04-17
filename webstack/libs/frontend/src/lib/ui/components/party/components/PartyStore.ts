/**
 * Copyright (c) SAGE3 Development Team 2025. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * PartyStore: a Zustand store backed by a single Yjs document + y-websocket.
 * Manages:
 *   - A global parties map (Y.Map) to track available parties
 *   - Awareness of who is in which party
 *   - A per-party Y.Array of chat messages
 */

// Yjs imports (shared CRDT document and awareness protocol)
import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import { WebsocketProvider } from 'y-websocket';

// Zustand store creator
import { create } from 'zustand';

// Local utility imports
import { genId } from '@sage3/shared';
import { User } from '@sage3/shared/types';
import { serverTime } from '@sage3/frontend';
import { Party, PartyChatMessage, PartyMember } from './types';

/**
 * Defines the shape of the PartyStore state and actions
 */
type PartyStore = {
  // Yjs document for global party list
  yDoc: Y.Doc | null;
  // Websocket provider for global party Hub
  provider: WebsocketProvider | null;
  // Awareness protocol instance for membership
  awareness: Awareness | null;

  /**
   * Initialize the Yjs + websocket connection for parties
   * Must be called once, passing the authenticated user
   */
  initPartyConnection: (user: User) => void;

  // List of all parties available
  parties: Party[];
  setParties: (parties: Party[]) => void;

  // The currently active party (or null if none)
  currentParty: Party | null;
  setCurrentParty: (party: Party | null) => void;

  /**
   * Update the board/room metadata for the current party
   */
  setPartyBoard: (boardId?: string, roomId?: string) => void;

  // List of members in the current party (via awareness)
  partyMembers: PartyMember[];

  // Chat messages for the current party
  chats: PartyChatMessage[];

  /**
   * Switches which party's chats are loaded and observed
   */
  setChats: (party: Party | null) => void;

  /**
   * Adds a new chat message for the current party
   */
  addChat: (message: string) => Promise<void>;

  /**
   * Clears all chat messages for a given party
   */
  clearChat: (party: Party) => void;

  // Convenience actions
  joinParty: (party: Party) => void;
  leaveParty: () => void;
  createParty: () => void;
  disbandParty: () => void;
  togglePartyPrivate: () => void;
};

// Global variable to hold the current user (hooks cannot be used directly)
let USER: User | null = null;

/**
 * Create the Zustand store for party management
 */
const usePartyStore = create<PartyStore>((set, get) => {
  // Internal reference to the Y.Array currently being observed
  let yChatDoc: Y.Array<PartyChatMessage> | null = null;

  /**
   * Handler invoked whenever the observed chat array changes
   * Sorts messages by timestamp and updates React state
   */
  const onChatsUpdate = () => {
    if (!yChatDoc) return;
    const msgs = yChatDoc.toArray();
    msgs.sort((a, b) => a.timestamp - b.timestamp);
    set({ chats: msgs });
  };

  return {
    /**
     * Yjs document reference (global parties)
     */
    yDoc: null,
    /**
     * Websocket provider for the global parties map
     */
    provider: null,
    /**
     * Awareness instance for membership tracking
     */
    awareness: null,

    /**
     * Called once after login to initialize Yjs + websocket
     */
    initPartyConnection: (user: User) => {
      const { provider } = get();
      // If already initialized, do nothing
      if (provider) return;

      // Store user globally for later message metadata
      USER = user;

      // Create a new Y.Doc and connect via WebsocketProvider
      const yDoc = new Y.Doc();
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const url = `${protocol}://${window.location.host}/yjs`;
      const websocketProvider = new WebsocketProvider(url, 'partyHub', yDoc);
      const awareness = websocketProvider.awareness;

      // Save to store
      set({ provider: websocketProvider, yDoc, awareness });

      // 1) Grab the shared "parties" map
      const partiesMap = yDoc.getMap<Party>('parties');

      // 2) Observe changes only once for the lifetime of the app
      partiesMap.observe(() => {
        const updated = Array.from(partiesMap.values());
        set({ parties: updated });

        // If our currentParty was removed or changed, sync it
        const { currentParty } = get();
        if (currentParty) {
          const stillThere = updated.find((p) => p.ownerId === currentParty.ownerId);
          get().setCurrentParty(stillThere || null);
        }
      });

      // 3) On initial sync, seed state and auto-join your party if it exists
      websocketProvider.on('sync', () => {
        const currentParties = Array.from(partiesMap.values());
        set({ parties: currentParties });

        // Auto-join if user already owns a party
        const mine = currentParties.find((p) => p.ownerId === user._id);
        if (mine) get().setCurrentParty(mine);
        else set({ currentParty: null });
      });

      // 4) Track awareness updates (who is in which party)
      awareness.on('change', () => {
        const states = Array.from(awareness.getStates().values());
        set({ partyMembers: states as PartyMember[] });
      });
    },

    /**
     * Local React state list of parties
     */
    parties: [],
    setParties: (parties) => set({ parties }),

    /**
     * The party the user is currently in
     */
    currentParty: null,
    setCurrentParty: (party) => {
      const { awareness, setChats } = get();
      if (!awareness) return;

      if (party) {
        // Join: update awareness so others see you
        awareness.setLocalState({ userId: USER!._id, party: party.ownerId });
        set({ currentParty: party });
        // Load and observe this party's chats
        setChats(party);
      } else {
        // Leave: clear awareness & chats
        awareness.setLocalState({ userId: USER!._id, party: null });
        set({ currentParty: null });
        setChats(null);
      }
    },

    /**
     * Update the board/room metadata for the current party
     */
    setPartyBoard: (boardId, roomId) => {
      const { currentParty, yDoc } = get();
      if (!currentParty || !yDoc) return;
      const partiesMap = yDoc.getMap<Party>('parties');
      const existing = partiesMap.get(currentParty.ownerId) || currentParty;
      const updated: Party = {
        ...existing,
        board: boardId && roomId ? { boardId, roomId } : undefined,
      };
      partiesMap.set(currentParty.ownerId, updated);
    },

    /**
     * List of members in the current party (kept in sync via awareness)
     */
    partyMembers: [],

    /**
     * Sorted chat messages for the current party
     */
    chats: [],

    /**
     * Switch chat observation to the given party (or clear if null)
     */
    setChats: (party) => {
      const { yDoc } = get();
      if (!yDoc) return;

      // 1) Unsubscribe previous chat observer
      if (yChatDoc) {
        yChatDoc.unobserve(onChatsUpdate);
        yChatDoc = null;
      }

      // 2) If no party selected, clear messages
      if (!party) {
        set({ chats: [] });
        return;
      }

      // 3) Subscribe to new party's chat array
      const arr = yDoc.getArray<PartyChatMessage>(party.ownerId);
      yChatDoc = arr;

      // Load initial messages & sort
      const initial = arr.toArray();
      initial.sort((a, b) => a.timestamp - b.timestamp);
      set({ chats: initial });

      // Observe subsequent updates
      arr.observe(onChatsUpdate);
    },

    /**
     * Add a chat message to the current party
     */
    async addChat(message) {
      const { currentParty, yDoc } = get();
      if (!currentParty || !yDoc) return;
      const arr = yDoc.getArray<PartyChatMessage>(currentParty.ownerId);
      const { epoch } = await serverTime();
      const chat: PartyChatMessage = {
        id: genId(),
        text: message,
        senderId: USER!._id,
        timestamp: epoch,
      };
      arr.push([chat]);
    },

    /**
     * Remove all chat messages for the specified party
     */
    clearChat: (party) => {
      const { yDoc } = get();
      if (!yDoc) return;
      const arr = yDoc.getArray<PartyChatMessage>(party.ownerId);
      arr.delete(0, arr.length);
    },

    // Aliases for joining/leaving
    joinParty: (party) => get().setCurrentParty(party),
    leaveParty: () => get().setCurrentParty(null),

    /**
     * Create a new party owned by the current user and join it
     */
    createParty: () => {
      const { provider, setCurrentParty } = get();
      const party: Party = { ownerId: USER!._id };
      provider?.doc.getMap<Party>('parties').set(USER!._id, party);
      setCurrentParty(party);
    },

    /**
     * Disband the user's owned party and leave
     */
    disbandParty: () => {
      if (!USER) return;
      const { provider, clearChat, leaveParty } = get();
      provider?.doc.getMap<Party>('parties').delete(USER._id);
      clearChat({ ownerId: USER._id } as Party);
      leaveParty();
    },

    /**
     * Toggle the 'private' flag on the current party
     */
    togglePartyPrivate: () => {
      const { currentParty, yDoc } = get();
      if (!currentParty || !yDoc) return;
      const partiesMap = yDoc.getMap<Party>('parties');
      const existing = partiesMap.get(currentParty.ownerId) || currentParty;
      partiesMap.set(currentParty.ownerId, { ...existing, private: !existing.private });
    },
  };
});

export { usePartyStore };
