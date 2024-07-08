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
import { VideoClient } from '@zoom/videosdk';

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
  zoomVideo: typeof VideoClient | undefined;
  joinRoom: (userId: string, roomName: string) => Promise<boolean>;
  leaveRoom: () => void;
}

/**
 * The Twilio Store.
 * Handles the Twilio Video SDK.
 * Can join a Twilio room and leave a room.
 * The store will manage all the participants and tracks.
 */
export const useZoomStore = create<ZoomState>()((set, get) => ({
  zoomVideo: undefined,
  joinRoom: async (userId: string, roomId: string) => {
    if (get().zoomVideo) {
      console.log('Zoom> Already connected: ', roomId);
      return true;
    }
    // Get the token from the SAGE3 server
    const token = await fetchToken(`${userId}`, roomId);

    // Reset the state of the store
    get().leaveRoom();

    try {
      const zoomVideo = ZoomVideo.createClient();

      await zoomVideo.init('en-US', 'Global', { patchJsMedia: true });
      await zoomVideo.join(roomId, token, userId);

      set({ zoomVideo: zoomVideo });
      console.log('Zoom> Joined Zoom Session: ', zoomVideo);
    } catch (error) {
      console.error(error);
      console.log('Zoom> Failed to join room: ', roomId);
      return false;
    }
    return true;
  },
  leaveRoom: () => {
    console.log('Zoom> Leaving room');
    const zoomVid = get().zoomVideo;
    if (zoomVid) {
      zoomVid.leave();
      ZoomVideo.destroyClient();
    }
    set({ zoomVideo: undefined });
  },
}));

// Add Dev tools
if (process.env.NODE_ENV === 'development') mountStoreDevtool('Twilio', useZoomStore);
