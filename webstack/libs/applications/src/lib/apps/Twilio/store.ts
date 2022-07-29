/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

// The React version of Zustand
import create from 'zustand';

import { Room, Participant, connect, ConnectOptions, RemoteVideoTrack } from 'twilio-video';

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
  participants: Participant[];
  tracks: RemoteVideoTrack[];
  joinRoom: (userId: string, roomName: string) => Promise<boolean>;
}

/**
 * The UIStore.
 */
export const useTwilioStore = create<TwilioState>((set, get) => ({
  room: undefined,
  participants: [],
  tracks: [],
  joinRoom: async (userId: string, roomName: string) => {
    if (get().room?.name === roomName) {
      console.log('Twilio> Already in room: ', roomName);
      return true;
    }
    const token = await fetchToken(userId, roomName);
    try {
      const room = await connect(token, { audio: false } as ConnectOptions);
      console.log("Twilio> Connected to room: ", room.name);
      const participants = [] as Participant[];

      // If user closes the browser or tab
      window.addEventListener('beforeunload', () => room.disconnect());

      // Add all current participants to the list
      room.participants.forEach((participant: Participant) => {
        console.log(`Participant "${participant.identity}" is connected to the Room`);
        participants.push(participant);

        participant.tracks.forEach((publication: any) => {
          if (publication.track) {
            set(state => ({ ...state, tracks: [...state.tracks, publication.track] }));
          }
        });

        participant.on('trackSubscribed', track => {
          set(state => ({ ...state, tracks: [...state.tracks, track] }));
        });

      });
      set(state => ({ ...state, room, participants }));

      // New Participant connected
      room.on('participantConnected', (participant: Participant) => {
        console.log(`Participant "${participant.identity}" has connected`);
        // Check if this participant is already in the list
        const idx = get().participants.findIndex((el) => el.identity === participant.identity);
        // If not, add them
        if (idx === -1) {
          set(state => ({ ...state, participants: [...state.participants, participant] }));
        }

        participant.tracks.forEach((publication: any) => {
          if (publication.track) {
            set(state => ({ ...state, tracks: [...state.tracks, publication.track] }));
          }
        });

        participant.on('trackSubscribed', track => {
          set(state => ({ ...state, tracks: [...state.tracks, track] }));
        });
      })

      // Participant disconnected
      // Log Participants as they disconnect from the Room
      room.once('participantDisconnected', (participant: Participant) => {
        console.log(`Participant "${participant.identity}" has disconnected`);

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
}));
