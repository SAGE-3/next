/**
 * Copyright (c) SAGE3 Development Team 2026. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { MessageSchema } from '@sage3/shared/types';
import { SAGE3Collection, sageRouter } from '@sage3/backend';

type UploadMessageOptions = {
  uploadId?: string;
  fileId?: string;
  roomId?: string;
  assetId?: string;
  filename?: string;
  phase?: MessageSchema['phase'];
  progress?: MessageSchema['progress'];
  close?: boolean;
};

class SAGE3MessageCollection extends SAGE3Collection<MessageSchema> {
  constructor() {
    super('MESSAGE', { type: '' });
    const router = sageRouter<MessageSchema>(this);
    this.httpRouter = router;
  }
}

export const MessageCollection = new SAGE3MessageCollection();

export async function addUploadMessage(userId: string, payload: string, options: UploadMessageOptions = {}) {
  return MessageCollection.add(
    {
      type: 'upload',
      payload,
      close: options.close || false,
      uploadId: options.uploadId,
      fileId: options.fileId,
      roomId: options.roomId,
      assetId: options.assetId,
      filename: options.filename,
      phase: options.phase,
      progress: options.progress,
    },
    userId,
  );
}
