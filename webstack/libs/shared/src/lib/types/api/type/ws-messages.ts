/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { SBDocumentMessage, SBJSON } from '@sage3/sagebase';

export type APIWSRequest = {
  msgId: string;
  type: 'get' | 'post' | 'del' | 'sub' | 'unsub';
  route: string;
  body: {
    [prop: string]: any;
  };
}

export type APIWSResponse = {
  msgId: string,
  type: 'get' | 'post' | 'del' | 'sub' | 'unsub';
  route: string;
  body: {
    [prop: string]: any;
  };
}

export type APIWSMessage = APIWSRequest | APIWSResponse;

export type APIWSEvent<T extends SBJSON> = {
  msgId: string;
  type: 'event'
  event: SBDocumentMessage<T>
}