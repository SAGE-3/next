/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// Zustand
import { create } from 'zustand';

import ZoomVideo from '@zoom/videosdk';

import { mountStoreDevtool } from 'simple-zustand-devtools';

async function fetchToken(userId: string, roomName: string) {
  const reponse = await fetch(`/zoom/token?identity=${userId}&room=${roomName}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });
  const { token } = await reponse.json();
  console.log('Zoom> Token: ', token);
  return token;
}

// Typescript interface defining the store
interface ZoomState {
  client: any | undefined;
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
export const useZoomStore = create<ZoomState>()((set, get) => ({
  client: undefined,
  setStopStream: (streamId: string) => set((state) => ({ ...state, stopStreamId: streamId })),
  joinRoom: async (userId: string, accessId: string, roomId: string) => {
    // console.log('Twilio> Joining room');

    if (get().client) {
      console.log('Zoom> Already connected: ', roomId);
      return true;
    }
    // Get the token from the SAGE3 server
    const token = await fetchToken(`${userId}`, roomId);

    // Reset the state of the store
    get().leaveRoom();

    try {
      const zoomVideo = ZoomVideo.createClient();
      set({ client: zoomVideo });

      await zoomVideo.init('en-US', 'Global', { patchJsMedia: true });
      await zoomVideo.join(roomId, token, userId);

      const zoomSession = zoomVideo.getMediaStream();
      console.log('Zoom> Zoom Session: ', zoomSession);
    } catch (error) {
      console.error(error);
      return false;
    }
    return true;
  },
  leaveRoom: () => {
    console.log('Zoom> Leaving room');
    const client = get().client;
    if (client) {
      client.leave();
      ZoomVideo.destroyClient();
    }
    set({ client: undefined });
  },
}));

// Add Dev tools
if (process.env.NODE_ENV === 'development') mountStoreDevtool('Twilio', useZoomStore);
