/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

export function getHTTPBoardUrl(roomId: string, boardId: string): string {
  return `${window.location.origin}/#/enter/${roomId}/${boardId}`;
}

export function getSAGE3BoardUrl(roomId: string, boardId: string): string {
  return `${window.location.protocol}//${window.location.host}/#/enter/${roomId}/${boardId}`;
  // return `sage3://${window.location.host}/#/enter/${roomId}/${boardId}`;
}

export function copyBoardUrlToClipboard(roomId: string, boardId: string): void {
  const link = getSAGE3BoardUrl(roomId, boardId);
  if (navigator.clipboard) navigator.clipboard.writeText(link);
}
