/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 * Adapted from https://github.com/thumbsu/react-y-monaco/blob/main/src/hooks/useYjs.ts
 */
import * as Y from 'yjs';

import { useCallback, useEffect, useState } from 'react';
import { WebsocketProvider } from 'y-websocket';

export interface IUseYjsProps {
  appId: string;
}

export function useYjs({ appId }: IUseYjsProps) {
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null);
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [yText, setYText] = useState<Y.Text | null>(null);

  const createProviderInstance = useCallback(() => {
    if (ydoc === null || provider !== null) return;
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    setProvider(new WebsocketProvider(`${protocol}://${window.location.host}/yjs`, appId, ydoc));
  }, [ydoc, provider, appId]);

  const createYMap = useCallback(() => {
    if (ydoc === null || yText !== null) return;
    setYText(ydoc.getText(appId));
  }, [ydoc, yText, appId]);

  useEffect(() => {
    if (ydoc === null) setYdoc(new Y.Doc());
    else if (ydoc !== null && provider === null) createProviderInstance();
    if (ydoc !== null && yText === null) createYMap();
  }, [ydoc, provider, yText, createProviderInstance, createYMap]);

  return { yText, provider };
}
