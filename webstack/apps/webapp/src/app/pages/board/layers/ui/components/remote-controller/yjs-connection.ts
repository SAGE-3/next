import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

export function createYjsDoc(boardId: string, userId: string) {
  // Check if the protocol is https or http
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  // Create the url to connect to the Yjs server
  const url = `${protocol}://${window.location.host}/yjs`;
  console.log('Connecting to Yjs server at:', url);
  // Create a new Yjs document
  const ydoc = new Y.Doc();
  // Create a new Yjs websocket provider
  const provider = new WebsocketProvider(url, `remote-control-${boardId}-${userId}`, ydoc, { connect: true });
  provider.on('status', (e: any) => console.log('Yjs status:', e.status));
  const eventsMap = ydoc.getMap<any>('remoteEvents');
  return { ydoc, eventsMap, provider };
}
