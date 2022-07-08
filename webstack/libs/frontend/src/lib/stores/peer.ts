/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

// The React version of Zustand
import create from 'zustand';

// WebRTC module
import Peer from 'peer-lite';

// Typescript interface defining the store
interface PeerState {
  peer: Peer;
  destroy: () => void;
}

/**
 * The PeerStore is a singleton that manages the Peer connection.
 */
export const usePeerStore = create<PeerState>((set, get) => ({
  peer: new Peer({ enableDataChannels: true, channelLabel: 'messages' }),
  destroy: () => {
    get().peer.destroy();
  },
}));
