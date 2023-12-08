/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// Zustand
import { create } from 'zustand';

import { Room, Participant, connect, ConnectOptions, RemoteTrack, RemoteParticipant } from 'twilio-video';

import { mountStoreDevtool } from 'simple-zustand-devtools';

async function fetchToken(userId: string, roomName: string) {
  const reponse = await fetch(`/twilio/token?identity=${userId}&room=${roomName}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });
  const { token } = await reponse.json();
  return token;
}

// Typescript interface defining the store
interface TwilioState {
  room: Room | undefined;
  participants: RemoteParticipant[];
  tracks: RemoteTrack[];
  stopStreamId: string;
  joinRoom: (userId: string, accessId: string, roomName: string) => Promise<boolean>;
  leaveRoom: () => void;
  setStopStream: (streamId: string) => void;
}

/**
 * The Twilio Store.
 * Handles the Twilio Video SDK.
 * Can join a Twilio room and leave a room.
 * The store will manage all the participants and tracks.
 */
export const useTwilioStore = create<TwilioState>()((set, get) => ({
  room: undefined,
  participants: [],
  tracks: [],
  stopStreamId: '',
  setStopStream: (streamId: string) => set((state) => ({ ...state, stopStreamId: streamId })),
  joinRoom: async (userId: string, accessId: string, roomName: string) => {
    // console.log('Twilio> Joining room');

    if (get().room?.name === roomName) {
      // console.log('Twilio> Already in room: ', roomName);
      return true;
    }
    // Get the token from the SAGE3 server
    const token = await fetchToken(`${userId}--${accessId}`, roomName);

    // Reset the state of the store
    get().leaveRoom();

    try {
      // Connect to the room with the token
      const room = await connect(token, { audio: false, preferredVideoCodecs: [{ codec: 'VP8', simulcast: true }] } as ConnectOptions);
      set((state) => ({ ...state, room }));

      // console.log('Twilio> Connected to room: ', room.name);

      // If user closes the browser or tab, remove them from the room
      window.addEventListener('beforeunload', () => get().leaveRoom());

      // Start with an empty array of participants
      // const participants = [] as Participant[];

      // Add all current participants to the participants array
      room.participants.forEach((participant) => {
        // console.log(`Twilio> Participant "${participant.identity}" is connected to the Room`);

        // Add the participant to the array
        set((state) => ({ ...state, participants: [...state.participants, participant] }));

        // For each participant, add all their tracks to the tracks array
        participant.tracks.forEach((publication) => {
          const t = publication.track;
          if (t) {
            set((state) => ({ ...state, tracks: [...state.tracks, t] }));
          }
        });

        // If the participant starts a new stack add it to the tracks array
        participant.on('trackSubscribed', (track) => {
          set((state) => ({ ...state, tracks: [...state.tracks, track] }));
        });
      });

      // New Participant connected
      room.on('participantConnected', (participant) => {
        // console.log(`Twilio> Participant "${participant.identity}" has connected`);

        // Check if this participant is already in the list
        const idx = get().participants.findIndex((el) => el.identity === participant.identity);
        // If not, add them
        if (idx === -1) {
          set((state) => ({ ...state, participants: [...state.participants, participant] }));
        }

        // For the participant, add all their tracks to the tracks array
        participant.tracks.forEach((publication) => {
          const t = publication.track;
          if (t) {
            set((state) => ({ ...state, tracks: [...state.tracks, t] }));
          }
        });

        // If the participant starts a new stack add it to the tracks array
        participant.on('trackSubscribed', (track) => {
          set((state) => ({ ...state, tracks: [...state.tracks, track] }));
        });
      });

      // Participant disconnects
      room.on('participantDisconnected', (participant: Participant) => {
        // console.log(`Participant "${participant.identity}" has disconnected`);

        // Check if this participant is in the list
        const idx = get().participants.findIndex((el) => el.identity === participant.identity);
        // If so, remove them
        if (idx > -1) {
          const newList = get().participants.splice(idx, 1);
          set({ participants: newList });
        }
      });
    } catch (error) {
      console.error(error);
      return false;
    }
    return true;
  },
  leaveRoom: () => {
    // console.log('Twilio> Leaving room');
    const room = get().room;
    if (room) {
      room.disconnect();
    }
    set({ room: undefined, participants: [], tracks: [] });
  },
}));

// Add Dev tools
if (process.env.NODE_ENV === 'development') mountStoreDevtool('Twilio', useTwilioStore);
