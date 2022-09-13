/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { ExtraImageType, ExtraPDFType } from '@sage3/shared/types';

export type FileEntry = {
  id: string;
  filename: string;
  originalfilename: string;
  owner: string;
  ownerName: string;
  date: number;
  dateAdded: number;
  room: string;
  size: number;
  type: string;
  selected: boolean;
  metadata?: string;
  derived?: ExtraImageType | ExtraPDFType;
};
