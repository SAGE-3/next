/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { createContext, useContext, useState, useEffect } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { useParams } from 'react-router';

// Enum Yjs Rooms
export enum YjsRooms {
  APPS = 'apps',
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
};

const YjsContext = createContext<YjsContextType>({
  connections: {},
});

/**
 * Hook to utilize Yjs
 */
export function useYjs() {
  return useContext(YjsContext);
}

let global_connections = {} as YjsConnections;

export function YjsProvider(props: React.PropsWithChildren<Record<string, unknown>>) {
  const [connections, setConnections] = useState<YjsConnections>({}); // YjsConnections
  const { boardId } = useParams();

  const connectAll = () => {
    // Connect to Yjs
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${protocol}://${window.location.host}/yjs`;

    const newConnections = { ...connections };
    YjsRoomsArray.forEach((yroom) => {
      if (!newConnections[yroom]) {
        const doc = new Y.Doc();
        const provider = new WebsocketProvider(url, `${boardId}-${yroom}`, doc);
        newConnections[yroom] = { doc, provider };
      }
    });
    global_connections = newConnections;
    setConnections(newConnections);
  };

  const disconnectAll = () => {
    // Destroy all Yjs connections
    Object.values(global_connections).forEach((connection) => {
      connection.provider.disconnect();
      connection.provider.destroy();
    });
    setConnections({});
  };

  // On Mount and Unmount
  useEffect(() => {
    connectAll();
    return () => {
      disconnectAll();
    };
  }, []);

  return <YjsContext.Provider value={{ connections }}>{props.children}</YjsContext.Provider>;
}
