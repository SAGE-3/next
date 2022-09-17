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
    console.log('touchstart');
    this.contextMenuPossible = true;
    this.callback(e.type, e);
    this.longPressCountdown = window.setTimeout(() => {
      this.contextMenuPossible = false;
      this.callback("contextmenu", e);
    }, longPressDuration);
  };

  onTouchMove = (_e: any) => {
    console.log('touchmove');
    window.clearTimeout(this.longPressCountdown);
  };

  onTouchCancel = (_e: any) => {
    console.log('touchcancel');
    this.contextMenuPossible = false;
    window.clearTimeout(this.longPressCountdown);
  };

  onTouchEnd = (e: any) => {
    console.log('touchend');
    this.contextMenuPossible = false;
    window.clearTimeout(this.longPressCountdown);
    this.callback(e.type, e);
  };

  onContextMenu = (e: any) => {
    console.log('contextmenu');
    this.contextMenuPossible = false;
    window.clearTimeout(this.longPressCountdown);
    this.callback("contextmenu", e);
    e.preventDefault();
  };
}
