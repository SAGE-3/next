// ControllerSide.tsx
import React, { useEffect } from 'react';
import { createYjsDoc } from './yjs-connection';

const { ydoc, eventsMap } = createYjsDoc('123', 'user-456'); // Example boardId and userId
let eventCounter = 0;

export function RemoteControl() {
  const ref = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    function nextKey() {
      return `evt-${Date.now()}-${eventCounter++}`;
    }

    function publishEvent(payload: any) {
      ydoc.transact(() => {
        console.log('Publishing event:', payload);
        eventsMap.set(nextKey(), payload);
      });
    }

    function onMouseMove(e: MouseEvent) {
      publishEvent({
        type: 'mouse_move',
        x: e.clientX,
        y: e.clientY,
        buttons: e.buttons,
      });
    }
    function onMouseDown(e: MouseEvent) {
      publishEvent({ type: 'mouse_down', x: e.clientX, y: e.clientY, button: e.button });
    }
    function onMouseUp(e: MouseEvent) {
      publishEvent({ type: 'mouse_up', x: e.clientX, y: e.clientY, button: e.button });
    }
    function onKeyDown(e: KeyboardEvent) {
      publishEvent({
        type: 'key_down',
        key: e.key,
        code: e.code,
        modifiers: {
          shift: e.shiftKey,
          ctrl: e.ctrlKey,
          alt: e.altKey,
          meta: e.metaKey,
        },
      });
      e.preventDefault();
      e.stopPropagation();
    }
    function onKeyUp(e: KeyboardEvent) {
      publishEvent({
        type: 'key_up',
        key: e.key,
        code: e.code,
        modifiers: {
          shift: e.shiftKey,
          ctrl: e.ctrlKey,
          alt: e.altKey,
          meta: e.metaKey,
        },
      });
      e.preventDefault();
      e.stopPropagation();
    }

    if (!ref.current) {
      console.error('Remote control ref is not set');
      return;
    }
    const element = ref.current;
    element.addEventListener('mousemove', onMouseMove);
    element.addEventListener('mousedown', onMouseDown);
    element.addEventListener('mouseup', onMouseUp);
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);

    // document.body.style.cursor = 'none';

    console.log('Remote control enabled');

    return () => {
      element.removeEventListener('mousemove', onMouseMove);
      element.removeEventListener('mousedown', onMouseDown);
      element.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
    };
  }, [ref]);

  return (
    <div
      style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'red', opacity: 0.5 }}
      // innerborder style
      // tabIndex={0}
      ref={ref}
    ></div>
  );
}
