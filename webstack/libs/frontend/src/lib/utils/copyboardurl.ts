/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

export function copyBoardUrlToClipboard(roomId: string, boardId: string): void {
  const link = `sage3://${window.location.host}/#/enter/${roomId}/${boardId}`;
  navigator.clipboard.writeText(link);
}

export function generateSaveBoardURL(roomId: string, boardId: string): string {
  const link = `http://${window.location.host}/#/enter/${roomId}/${boardId}`;
  return link;
}
