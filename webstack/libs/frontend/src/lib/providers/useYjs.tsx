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
import { Box, Button, CircularProgress } from '@chakra-ui/react';
import { useHexColor, useRouteNav } from '@sage3/frontend';

// Enum Yjs Rooms
export enum YjsRooms {
  APPS = 'apps',
  ANNOTATIONS = 'annotations',
}
// Put all Values of YjsRooms into an array
export const YjsRoomsArray = Object.values(YjsRooms);

export type YjsRoomConnection = {
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
  yAnnotations: YjsRoomConnection | null;
  yApps: YjsRoomConnection | null;
};

const YjsContext = createContext<YjsContextType>({
  yAnnotations: null,
  yApps: null,
});

/**
 * Hook to utilize Yjs
 */
export function useYjs() {
  return useContext(YjsContext);
}

// Make a Yjs Websocket connection to a room (Yjs Room, not not sage3 room)
async function connectToRoom(room: string, user: User): Promise<YjsRoomConnection> {
  // Wrap this in a promise to wait for the connection to be established
  return new Promise((resolve) => {
    // Check if the protocol is https or http
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    // Create the url to connect to the Yjs server
    const url = `${protocol}://${window.location.host}/yjs`;

    // Create a new Yjs document
    const doc = new Y.Doc();
    // Create a new Yjs websocket provider
    const provider = new WebsocketProvider(url, `${room}`, doc, { connect: false });

    // Set the user's name and color
    // We do this to make sure the awareness is set before the connection is established
    provider.awareness.setLocalStateField('user', {
      name: user?.data.name || 'Anonymous',
      color: user?.data.color || '#000000',
    });
    // Establish the connection
    provider.connect();

    // Listen for the status of the connection
    // Once connected resolve the promise
    provider.on('status', (event: any) => {
      if (event.status === 'connected') {
        resolve({ doc, provider });
      }
    });
  });
}

let yConnections = {} as YjsConnections;

export function YjsProvider(props: React.PropsWithChildren<Record<string, unknown>>) {
  const [yAnnotations, setAnnotationRoom] = useState<YjsRoomConnection | null>(null);
  const [yApps, setAppRoom] = useState<YjsRoomConnection | null>(null);
  const { boardId } = useParams();
  const { user } = useUser();

  const nullConnections = () => {
    setAnnotationRoom(null);
    setAppRoom(null);
  };

  const disconnectAll = useCallback(() => {
    nullConnections();
    Object.keys(yConnections).forEach((boardId) => {
      Object.keys(yConnections[boardId]).forEach((room) => {
        yConnections[boardId][room].provider.disconnect();
        yConnections[boardId][room].doc.destroy();
      });
    });
    // Delete all elements in yConnections
    yConnections = {};
  }, []);

  // Establish connection to all rooms ('apps', 'annotations')
  // @boardId: string The board to connect to
  async function connect(boardId: string): Promise<YjsConnection> {
    // Create an array of promise to connecto all the rooms ('apps', 'annotations')
    const connections = YjsRoomsArray.map(async (roomname) => {
      const room = `${roomname}-${boardId}`;
      return connectToRoom(room, user!); // Add null assertion operator (!) to indicate that user will not be null or undefined
    });
    // Wait for all connections to be established
    const connectionsResolved = await Promise.all(connections);
    const newConnection = {} as YjsConnection;
    YjsRoomsArray.forEach((roomname, index) => {
      newConnection[roomname] = connectionsResolved[index];
    });
    return newConnection;
  }

  useEffect(() => {
    // Initialize Yjs connection
    // In a async function, we can use await to wait for the connection to be established
    async function init(boardId: string) {
      disconnectAll();
      const connection = await connect(boardId);
      yConnections[boardId] = connection;
      setAnnotationRoom(connection.annotations);
      setAppRoom(connection.apps);
    }

    if (boardId) {
      init(boardId);
    }
    return () => {
      disconnectAll();
    };
  }, [boardId, disconnectAll]);

  return (
    <YjsContext.Provider value={{ yAnnotations, yApps }}>
      {yApps && yAnnotations ? props.children : <LoadingYjsComponent />}
    </YjsContext.Provider>
  );
}

function LoadingYjsComponent() {
  const teal = useHexColor('teal');

  const { boardId, roomId } = useParams();
  const { toHome, toBoard } = useRouteNav();

  const [tries, setTries] = useState(3);

  const retry = () => {
    if (boardId && roomId && tries > 0) {
      toBoard(boardId, roomId);
      setTries(tries - 1);
    } else {
      toHome(roomId);
    }
  };

  return (
    <Box width="100vw" height="100vh" display="flex" justifyContent={'center'} alignItems={'center'}>
      <CircularProgress isIndeterminate size={'xl'} color={teal} />
      <Button onClick={retry} colorScheme="teal" variant="outline" position="absolute" left="2" bottom="2">
        {tries ? ` Retry ${tries}` : 'Go Home'}
      </Button>
    </Box>
  );
}
