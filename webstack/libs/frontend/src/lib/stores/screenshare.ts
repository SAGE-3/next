/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// Zustand
import { create } from 'zustand';

import { ConnectionState, RemoteTrack, Room, RoomEvent, Track } from 'livekit-client';

import { mountStoreDevtool } from 'simple-zustand-devtools';

// Where this deployment serves its LiveKit SFU, relative to the page's own origin.
// The SFU is always the one that came with the server, so there is no url to configure
// and no way to be pointed at somebody else's.
const SFU_PATH = '/sfu';

function sfuUrl(): string {
  const scheme = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${scheme}//${window.location.host}${SFU_PATH}`;
}

async function fetchToken(accessId: string, roomName: string) {
  const response = await fetch(`/livekit/token?accessId=${accessId}&room=${roomName}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error(`Screenshare token request failed: ${response.status}`);
  }
  const { token, shareTimeLimit } = await response.json();
  return { token, url: sfuUrl(), shareTimeLimit } as { token: string; url: string; shareTimeLimit: number };
}

// A remote track with the name it was published under (screenshare app id)
export type NamedRemoteTrack = { name: string; track: RemoteTrack };

// Connection state of the room, surfaced so the UI can show interruptions
export type ScreenshareConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

// Typescript interface defining the store
interface ScreenshareState {
  room: Room | undefined;
  connectionState: ScreenshareConnectionState;
  tracks: NamedRemoteTrack[];
  // Captured screen streams owned by THIS browser session, keyed by screenshare app id.
  // Ownership never leaves the session: a page reload cannot resurrect a share.
  localStreams: Record<string, MediaStream>;
  // Screenshare time limit (ms), provided by the server with the token
  shareTimeLimit: number;
  joinRoom: (accessId: string, roomName: string) => Promise<boolean>;
  leaveRoom: () => void;
  // Publish a captured screen stream for the given screenshare app (publishes when the room connects)
  shareStream: (appId: string, stream: MediaStream) => void;
  // Unpublish and stop the capture for the given screenshare app
  stopShare: (appId: string) => void;
}

// Single beforeunload handler so repeated joins do not stack up listeners
const onBeforeUnload = () => useScreenshareStore.getState().leaveRoom();

// Publish a captured stream to the room, named after its app id
async function publishStream(room: Room, appId: string, stream: MediaStream) {
  const mediaTrack = stream.getVideoTracks()[0];
  if (!mediaTrack) return;
  // Already published? (flushing pending streams can race with shareStream)
  const published = Array.from(room.localParticipant.trackPublications.values()).find((el) => el.trackName === appId);
  if (published) return;
  // Screen content: favor sharpness over frame rate
  mediaTrack.contentHint = 'detail';
  await room.localParticipant.publishTrack(mediaTrack, {
    name: appId,
    source: Track.Source.ScreenShare,
    simulcast: true,
  });
}

/**
 * The Screenshare Store.
 * Handles the connection to the self-hosted LiveKit SFU.
 * Joins one LiveKit room per board and manages remote tracks and local captures.
 */
export const useScreenshareStore = create<ScreenshareState>()((set, get) => ({
  room: undefined,
  connectionState: 'disconnected',
  tracks: [],
  localStreams: {},
  shareTimeLimit: 3600 * 6 * 1000,
  joinRoom: async (accessId: string, roomName: string) => {
    // Already connected to this room, or a join is already in flight?
    if (get().room?.name === roomName && get().room?.state === ConnectionState.Connected) {
      return true;
    }
    if (get().connectionState === 'connecting') {
      return true;
    }
    set((state) => ({ ...state, connectionState: 'connecting' }));

    try {
      // Get the token, server url and share time limit from the SAGE3 server
      const { token, url, shareTimeLimit } = await fetchToken(accessId, roomName);

      // Reset any previous room state. Local captures are NOT touched: a capture can
      // exist before the room connects (capture happens on click, join follows the app).
      const previousRoom = get().room;
      if (previousRoom) {
        previousRoom.disconnect();
      }
      set((state) => ({ ...state, room: undefined, tracks: [] }));
      // adaptiveStream: subscribers receive the simulcast layer matching their video element size.
      // dynacast: simulcast layers nobody subscribes to are paused at the publisher.
      const room = new Room({ adaptiveStream: true, dynacast: true });

      // A new remote track arrived (existing tracks also fire this on join)
      room.on(RoomEvent.TrackSubscribed, (track, publication) => {
        if (track.kind === Track.Kind.Video) {
          set((state) => ({ ...state, tracks: [...state.tracks, { name: publication.trackName, track }] }));
        }
      });

      // A remote track went away
      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        set((state) => ({ ...state, tracks: state.tracks.filter((t) => t.track !== track) }));
      });

      // Surface connection interruptions
      room.on(RoomEvent.Reconnecting, () => set((state) => ({ ...state, connectionState: 'reconnecting' })));
      room.on(RoomEvent.Reconnected, () => set((state) => ({ ...state, connectionState: 'connected' })));
      room.on(RoomEvent.Disconnected, () => set((state) => ({ ...state, connectionState: 'disconnected' })));

      // Connect to the LiveKit server
      set((state) => ({ ...state, connectionState: 'connecting' }));
      await room.connect(url, token);
      set((state) => ({ ...state, room, shareTimeLimit, connectionState: 'connected' }));

      // If user closes the browser or tab, remove them from the room
      window.addEventListener('beforeunload', onBeforeUnload);

      // Publish any captures made before the room finished connecting
      Object.entries(get().localStreams).forEach(([appId, stream]) => publishStream(room, appId, stream));
    } catch (error) {
      console.error('Screenshare>', error);
      set((state) => ({ ...state, connectionState: 'disconnected' }));
      return false;
    }
    return true;
  },
  leaveRoom: () => {
    const { room, localStreams } = get();
    // Stop all local captures; the server webhook deletes their apps once the tracks disappear
    Object.values(localStreams).forEach((stream) => stream.getTracks().forEach((track) => track.stop()));
    if (room) {
      room.disconnect();
    }
    window.removeEventListener('beforeunload', onBeforeUnload);
    set({ room: undefined, tracks: [], localStreams: {}, connectionState: 'disconnected' });
  },
  shareStream: (appId: string, stream: MediaStream) => {
    // If the user ends the capture from the browser's own UI ("Stop sharing" bar), clean up
    const mediaTrack = stream.getVideoTracks()[0];
    if (mediaTrack) {
      mediaTrack.addEventListener('ended', () => get().stopShare(appId));
    }
    set((state) => ({ ...state, localStreams: { ...state.localStreams, [appId]: stream } }));
    const room = get().room;
    if (room && room.state === ConnectionState.Connected) {
      publishStream(room, appId, stream);
    }
  },
  stopShare: (appId: string) => {
    const { room, localStreams } = get();
    if (room) {
      const publication = Array.from(room.localParticipant.trackPublications.values()).find((el) => el.trackName === appId);
      if (publication?.track) {
        room.localParticipant.unpublishTrack(publication.track, true);
      }
    }
    const stream = localStreams[appId];
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    set((state) => {
      const next = { ...state.localStreams };
      delete next[appId];
      return { ...state, localStreams: next };
    });
  },
}));

// Add Dev tools
if (process.env.NODE_ENV === 'development') mountStoreDevtool('Screenshare', useScreenshareStore);
