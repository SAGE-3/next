/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { useParams } from 'react-router';
import { useUser } from './useUser';
import { User } from '@sage3/shared/types';

// Enum Yjs Rooms
export enum YjsRooms {
  APPS = 'apps',
  ANNOTATIONS = 'annotations',
}
// Put all Values of YjsRooms into an array
export const YjsRoomsArray = Object.values(YjsRooms);

type YjsRoomConnection = {
  doc: Y.Doc;
  provider: WebsocketProvider;
};

type YjsConnection = {
  [roomname: string]: YjsRoomConnection;
};

type YjsConnections = {
  [boardId: string]: YjsConnection;
};

type YjsContextType = {
  connection: YjsConnection | null;
};

const YjsContext = createContext<YjsContextType>({
  connection: {},
});

/**
 * Hook to utilize Yjs
 */
export function useYjs() {
  return useContext(YjsContext);
}

async function connectToRoom(room: string, user: User): Promise<YjsRoomConnection> {
  // Wrap this in a promise to wait for the connection to be established
  return new Promise((resolve) => {
    console.log('connecting to room:', room);
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${protocol}://${window.location.host}/yjs`;

    const doc = new Y.Doc();
    const provider = new WebsocketProvider(url, `${room}`, doc);
    provider.awareness.setLocalStateField('user', {
      name: user?.data.name || 'Anonymous',
      color: user?.data.color || '#000000',
    });
    provider.on('status', (event: any) => {
      console.log('status:', event.status, room);
      if (event.status === 'connected') {
        console.log('connected to room:', room);
        resolve({ doc, provider });
      }
    });
  });
}

let yConnections = {} as YjsConnections;

export function YjsProvider(props: React.PropsWithChildren<Record<string, unknown>>) {
  const [connection, setConnection] = useState<YjsConnection | null>(null); // YjsConnections
  const { boardId } = useParams();
  const { user } = useUser();

  const disconnectAll = useCallback(() => {
    setConnection(null);
    Object.keys(yConnections).forEach((boardId) => {
      Object.keys(yConnections[boardId]).forEach((room) => {
        yConnections[boardId][room].provider.disconnect();
        yConnections[boardId][room].doc.destroy();
      });
    });
    // Delete all elements in yConnections
    yConnections = {};
  }, []);

  async function connect(boardId: string): Promise<YjsConnection> {
    // Connect to Yjs
    const connections = YjsRoomsArray.map(async (roomname) => {
      const room = `${roomname}-${boardId}`;
      return connectToRoom(room, user!); // Add null assertion operator (!) to indicate that user will not be null or undefined
    });
    // Wait for all connections to be established
    console.log('waiting for connections');
    const connectionsResolved = await Promise.all(connections);
    const newConnection = {} as YjsConnection;
    YjsRoomsArray.forEach((roomname, index) => {
      newConnection[roomname] = connectionsResolved[index];
    });
    return newConnection;
  }

  useEffect(() => {
    async function init(boardId: string) {
      console.log('init');
      const connection = await connect(boardId);
      yConnections[boardId] = connection;
      setConnection(connection);
      console.log('finished init');
    }

    if (boardId) {
      init(boardId);
    }
    return () => {
      disconnectAll();
    };
  }, [boardId, disconnectAll]);

  return <YjsContext.Provider value={{ connection }}>{props.children}</YjsContext.Provider>;
}
