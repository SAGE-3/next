/**
 * Copyright (c) SAGE3 Development Team 2025. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// Yjs imports
import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import { WebsocketProvider } from 'y-websocket';

// Zustand store import
import { create } from 'zustand';

// Local imports
import { genId } from '@sage3/shared';
import { User } from '@sage3/shared/types';
import { serverTime } from '@sage3/frontend';
import { Party, PartyChatMessage, PartyMember } from './types';

// The Zustand store for the party
type PartyStore = {
  // Yjs and Websocket provider
  yDoc: Y.Doc | null;
  provider: WebsocketProvider | null;
  awareness: Awareness | null;

  // Initialize the Yjs provider and awareness
  initPartyConnection: (user: User) => void;

  // All avaialble parties
  parties: Party[];
  setParties: (parties: Party[]) => void;

  // The current party the user is in
  currentParty: Party | null;
  setCurrentParty: (party: Party | null) => void;
  setPartyBoard: (boardId?: string, roomId?: string) => void;

  // The current party members
  partyMembers: PartyMember[];

  // The current chat messages
  chats: PartyChatMessage[];
  setChats: (party: Party | null) => void;
  addChat: (message: string) => Promise<void>;
  clearChat: (party: Party) => void;

  // Party management functions
  joinParty: (party: Party) => void;
  leaveParty: () => void;
  createParty: () => void;
  disbandParty: () => void;
  togglePartyPrivate: () => void;
};

// Global USER variable to store the current user
// React hooks in the store are not allowed, so we need to use a global variable
let USER: User | null = null;

// Create the Zustand store
const usePartyStore = create<PartyStore>((set, get) => {
  // Initialize the Yjs provider and awareness
  function initPartyConnection(user: User) {
    // Check to see if the provider is already initialized
    const { provider } = get();
    if (provider) {
      // If the provider is already initialized we need to do nothing
      console.log('Party Provider already initialized');
      return;
    }

    // Set the user for the store to use
    USER = user;

    // Create the Yjs document and WebSocket provider
    const yDoc = new Y.Doc();
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${protocol}://${window.location.host}/yjs`;
    const websocketProvider = new WebsocketProvider(url, 'partyHub', yDoc);
    const awareness = websocketProvider.awareness;
    set({ provider: websocketProvider, yDoc, awareness });

    // Once the connection is established, set the user ID in the awareness
    websocketProvider.on('sync', () => {
      // Set the currently available parties
      const currentParties = Array.from(yDoc.getMap<Party>('parties').values());
      set({ parties: currentParties });

      // If you have a party already created, set it as the current party
      const partyAlreadyCreated = currentParties.find((party) => party.ownerId === user._id);
      if (partyAlreadyCreated) {
        get().setCurrentParty(partyAlreadyCreated);
      } else {
        set({ currentParty: null });
      }

      // Observe the parties map for changes
      yDoc.getMap<Party>('parties').observe(() => {
        // Get the current parties from the Yjs document
        const currentParties = Array.from(yDoc.getMap<Party>('parties').values());
        // Set the current parties in the store
        set({ parties: currentParties });

        // If you are in a party and that party has been removed, leave the party
        const { currentParty } = get();
        if (currentParty) {
          const party = currentParties.find((party) => party.ownerId === currentParty.ownerId);
          if (!party) {
            get().setCurrentParty(null);
          } else {
            get().setCurrentParty(party);
          }
        }
      });
    });

    // Set the awareness state for the user
    awareness.on('change', () => {
      const userData = Array.from(awareness.getStates().values());
      const usersMaped = userData.map((el) => {
        return el as PartyMember;
      });
      set({ partyMembers: usersMaped });
    });
  }

  return {
    yDoc: null,
    provider: null,
    awareness: null,
    initPartyConnection,

    parties: [],
    setParties: (parties) => set({ parties }),

    currentParty: null,
    setCurrentParty: (party) => {
      const { awareness, setChats } = get();
      if (party) {
        if (!awareness) return;
        awareness.setLocalState({ userId: USER!._id, party: party.ownerId });
        set({ currentParty: party });
        setChats(party);
      } else {
        set({ currentParty: null });
        setChats(null);
        const { awareness } = get();
        if (!awareness) return;
        awareness.setLocalState({ userId: USER!._id, party: null });
      }
    },
    setPartyBoard: (boardId?: string, roomId?: string) => {
      const { currentParty } = get();
      if (!currentParty) return;
      const { yDoc } = get();
      if (!yDoc) return;
      const party = yDoc.getMap<Party>('parties').get(currentParty.ownerId);
      if (party) {
        if (!boardId || !roomId) {
          const newParty = { ownerId: currentParty.ownerId };
          yDoc.getMap<Party>('parties').set(currentParty.ownerId, newParty);
        } else {
          const newParty = { ownerId: currentParty.ownerId, board: { boardId, roomId } };
          yDoc.getMap<Party>('parties').set(currentParty.ownerId, newParty);
        }
      }
    },

    partyMembers: [],

    chats: [],
    setChats: (party: Party | null) => {
      const { yDoc } = get();
      if (!yDoc) return;
      if (!party) {
        set({ chats: [] });
        return;
      } else {
        const chats = yDoc.getArray<PartyChatMessage>(party.ownerId).toArray();
        set({ chats });
        yDoc.getArray<PartyChatMessage>(party.ownerId).observe((event) => {
          const chats = yDoc.getArray<PartyChatMessage>(party.ownerId).toArray();
          // Sort in descending order
          chats.sort((a, b) => a.timestamp - b.timestamp);
          // Set the chats in the store
          set({ chats });
        });
      }
    },
    async addChat(message: string) {
      const { currentParty } = get();
      if (!currentParty) return;
      const { yDoc } = get();
      if (!yDoc) return;
      const chats = yDoc.getArray<PartyChatMessage>(currentParty.ownerId);
      const timestamp = await serverTime();
      const chat: PartyChatMessage = {
        id: genId(),
        text: message,
        senderId: USER!._id,
        timestamp: timestamp.epoch,
      };
      chats.push([chat]);
    },
    clearChat: (party: Party) => {
      const { yDoc } = get();
      if (!yDoc) return;
      const chats = yDoc.getArray<PartyChatMessage>(party.ownerId);
      chats.delete(0, chats.length);
    },

    joinParty: (party) => get().setCurrentParty(party),
    leaveParty: () => {
      const { awareness } = get();
      if (!awareness) return;
      awareness.setLocalState({ userId: USER!._id, party: null });
      set({ currentParty: null, chats: [] });
    },
    createParty: () => {
      const { provider, setCurrentParty } = get();
      const party: Party = { ownerId: USER!._id };
      provider?.doc.getMap('parties').set(USER!._id, party);
      setCurrentParty(party);
    },
    disbandParty: () => {
      if (!USER) return;
      const { provider, leaveParty } = get();
      provider?.doc.getMap('parties').delete(USER._id);
      set({ currentParty: null });
      get().clearChat({ ownerId: USER._id });
      leaveParty();
    },
    togglePartyPrivate: () => {
      const { currentParty } = get();
      if (!currentParty) return;
      const { yDoc } = get();
      if (!yDoc) return;
      const party = yDoc.getMap<Party>('parties').get(currentParty.ownerId);
      if (party) {
        const isPrivate = party.private ? true : false;
        const newParty = { ownerId: currentParty.ownerId, board: currentParty.board, private: !isPrivate } as Party;
        yDoc.getMap<Party>('parties').set(currentParty.ownerId, newParty);
      }
    },
  };
});

export { usePartyStore };
