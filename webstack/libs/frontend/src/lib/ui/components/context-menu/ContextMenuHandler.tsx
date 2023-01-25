/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

const longPressDuration = 610;

export default class ContextMenuHandler {
  longPressCountdown: number | undefined;
  callback: (t: string, e: any) => void;
  contextMenuPossible: boolean;

  constructor(callback: any) {
    this.callback = callback;
    this.longPressCountdown = undefined;
    this.contextMenuPossible = false;
  }

  onTouchStart = (e: any) => {
    // console.log('touchstart');
    this.contextMenuPossible = true;
    this.callback(e.type, e);
    this.longPressCountdown = window.setTimeout(() => {
      this.contextMenuPossible = false;
      this.callback("contextmenu", e);
    }, longPressDuration);
  };

  onTouchMove = (_e: any) => {
    // console.log('touchmove');
    window.clearTimeout(this.longPressCountdown);
  };

  onTouchCancel = (_e: any) => {
    // console.log('touchcancel');
    this.contextMenuPossible = false;
    window.clearTimeout(this.longPressCountdown);
  };

  onTouchEnd = (e: any) => {
    // console.log('touchend');
    this.contextMenuPossible = false;
    window.clearTimeout(this.longPressCountdown);
    this.callback(e.type, e);
  };

  onContextMenu = (e: any) => {
    // console.log('contextmenu');
    this.contextMenuPossible = false;
    window.clearTimeout(this.longPressCountdown);
    this.callback("contextmenu", e);
    e.preventDefault();
  };
}
