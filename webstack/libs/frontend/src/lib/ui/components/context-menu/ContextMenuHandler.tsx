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
    // console.log("onTouchStart");
    this.contextMenuPossible = true;
    this.callback(e.type, e);
    // const touch = e.touches[0];
    this.longPressCountdown = window.setTimeout(() => {
      this.contextMenuPossible = false;
      this.callback("contextmenu", e);
    }, longPressDuration);
  };

  onTouchMove = (_e: any) => {
    // console.log("onTouchMove");
    window.clearTimeout(this.longPressCountdown);
  };

  onTouchCancel = (_e: any) => {
    // console.log("onTouchCancel");
    this.contextMenuPossible = false;
    window.clearTimeout(this.longPressCountdown);
  };

  onTouchEnd = (e: any) => {
    // console.log("onTouchEnd");
    this.contextMenuPossible = false;
    window.clearTimeout(this.longPressCountdown);
    this.callback(e.type, e);
  };

  onContextMenu = (e: any) => {
    // console.log("onContextMenu");
    this.contextMenuPossible = false;
    window.clearTimeout(this.longPressCountdown);
    this.callback("contextmenu", e);
    e.preventDefault();
  };
}
