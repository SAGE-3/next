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
import { set } from 'date-fns';

// Enum Yjs Rooms
export enum YjsRooms {
  APPS = 'apps',
  ANNOTATIONS = 'annotations',
}
// Put all Values of YjsRooms into an array
export const YjsRoomsArray = Object.values(YjsRooms);

type YjsConnections = {
  [key: string]: {
    doc: Y.Doc;
    provider: WebsocketProvider;
  };
};

type YjsContextType = {
  connections: YjsConnections;
  connected: boolean;
};

const YjsContext = createContext<YjsContextType>({
  connections: {},
  connected: false,
});

/**
 * Hook to utilize Yjs
 */
export function useYjs() {
  return useContext(YjsContext);
}

export function YjsProvider(props: React.PropsWithChildren<Record<string, unknown>>) {
  const [connections, setConnections] = useState<YjsConnections>({}); // YjsConnections
  const [connected, setConnected] = useState<boolean>(false); // Boolean
  const { boardId } = useParams();

  const disconnect = useCallback(() => {
    Object.values(connections).forEach((connection) => {
      connection.provider.disconnect();
      connection.provider.destroy();
    });
  }, [connections]);

  const connect = useCallback((boardId: string) => {
    // Connect to Yjs
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${protocol}://${window.location.host}/yjs`;
    const newConnections = {} as YjsConnections;
    YjsRoomsArray.forEach((roomname) => {
      const room = `${roomname}-${boardId}`;
      if (!newConnections[room]) {
        const doc = new Y.Doc();
        const provider = new WebsocketProvider(url, `${room}`, doc);
        newConnections[roomname] = { doc, provider };
      }
    });
    return newConnections;
  }, []);

  useEffect(() => {
    if (boardId) {
      setConnections(connect(boardId));
    }
    return () => {
      disconnect();
    };
  }, [boardId, connect, disconnect]);

  return <YjsContext.Provider value={{ connections, connected }}>{props.children}</YjsContext.Provider>;
}
