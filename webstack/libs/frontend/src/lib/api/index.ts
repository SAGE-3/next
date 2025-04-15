/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { App } from '@sage3/applications/schema';
import { Asset, Board, Message, Plugin, Presence, Room, User, Insight, RoomMembers, Annotation } from '@sage3/shared/types';

export * from './http/index';
export * from './ws/api-socket';
export * from './kernels/kernels';
export * from './ai';
export * from './vms/vms';

export type CollectionDocs = App | Asset | Board | Message | Plugin | Presence | Room | User | Insight | RoomMembers | Annotation;
