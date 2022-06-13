/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { AssetSB } from '@sage3/shared/types';

/**
 * One row per file
 */
export type FileEntry = {
  id: string;
  filename: string;
  originalfilename: string;
  owner: string;
  date: number;
  dateAdded: number;
  boardId: string;
  size: number;
  type: string;
  exif: any;
  selected: boolean;
};

export type RowFileProps = {
  file: FileEntry;
  // clickCB: (p: FileEntry) => void;
  // dbclickCB: (p: FileEntry) => void;
  style: React.CSSProperties;
};

export interface AssetModalProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export interface ExifViewerProps {
  colorMode: string;
  file: FileEntry;
}

export interface FileManagerProps {
  files: FileEntry[];
  // isOpen: boolean;
  // onOpen: () => void;
  // onClose: () => void;
}
