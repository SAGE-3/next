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

// Enum Yjs Rooms
export enum YjsRooms {
  APPS = 'apps',
  ANNOTATIONS = 'annotations',
}
// Put all Values of YjsRooms into an array
export const YjsRoomsArray = Object.values(YjsRooms);

type YjsConnection = {
  [roomname: string]: {
    doc: Y.Doc;
    provider: WebsocketProvider;
  };
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

let yConnections = {} as YjsConnections;

export function YjsProvider(props: React.PropsWithChildren<Record<string, unknown>>) {
  const [connection, setConnection] = useState<YjsConnection | null>(null); // YjsConnections
  const { boardId } = useParams();

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

  const connect = useCallback((boardId: string) => {
    // Connect to Yjs
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${protocol}://${window.location.host}/yjs`;
    const newConnection = {} as YjsConnection;
    YjsRoomsArray.forEach((roomname) => {
      const room = `${roomname}-${boardId}`;
      if (!newConnection[room]) {
        const doc = new Y.Doc();
        const provider = new WebsocketProvider(url, `${room}`, doc);
        newConnection[roomname] = { doc, provider };
      }
    });
    return newConnection;
  }, []);

  useEffect(() => {
    if (boardId) {
      const connection = connect(boardId);
      yConnections[boardId] = connection;
      setConnection(connection);
    }
    return () => {
      disconnectAll();
    };
  }, [boardId, connect, disconnectAll]);

  return <YjsContext.Provider value={{ connection }}>{props.children}</YjsContext.Provider>;
}
