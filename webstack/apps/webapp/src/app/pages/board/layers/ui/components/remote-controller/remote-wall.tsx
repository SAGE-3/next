// ControlledSide.tsx
import React, { useEffect, useState } from 'react';
import { createYjsDoc } from './yjs-connection';
import * as Y from 'yjs';

const { ydoc, eventsMap } = createYjsDoc('123', 'user-456'); // Example boardId and userId
const processedKeys = new Set<string>();
export function RemoteWall() {
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    const observer = (mapEvent: Y.YMapEvent<any>) => {
      console.log('RemoteWall observer triggered:', mapEvent);
      for (const [key, payload] of eventsMap.entries()) {
        if (!processedKeys.has(key)) {
          processedKeys.add(key);
          handleRemoteEvent(payload);
          // Remove it so the map doesn’t blow up:
          ydoc.transact(() => {
            eventsMap.delete(key);
          });
        }
      }
    };

    eventsMap.observe(observer);

    function handleRemoteEvent(payload: any) {
      switch (payload.type) {
        case 'mouse_move': {
          const actualX = payload.x;
          const actualY = payload.y;
          setCursorPos({ x: actualX, y: actualY });
          break;
        }
        case 'mouse_down':
          const actualX = payload.x;
          const actualY = payload.y;
          const target = document.elementFromPoint(actualX, actualY) || window;
          const evtType = payload.type === 'mouse_down' ? 'mousedown' : 'mouseup';
          target.dispatchEvent(
            new MouseEvent(evtType, {
              clientX: actualX,
              clientY: actualY,
              button: payload.button,
              bubbles: true,
            })
          );
          break;
        case 'mouse_up': {
          const actualX = payload.x;
          const actualY = payload.y;
          const target = document.elementFromPoint(actualX, actualY) || window;
          const evtType = payload.type === 'mouse_down' ? 'mousedown' : 'mouseup';
          target.dispatchEvent(
            new MouseEvent(evtType, {
              clientX: actualX,
              clientY: actualY,
              button: payload.button,
              bubbles: true,
            })
          );
          target.dispatchEvent(
            new MouseEvent('click', {
              clientX: actualX,
              clientY: actualY,
              button: payload.button,
              bubbles: true,
              cancelable: true,
              view: window,
            })
          );
          break;
        }
        case 'key_down':
        case 'key_up': {
          if (!document.activeElement) document.body.focus();
          const active = document.activeElement || window;
          const evtType = payload.type === 'key_down' ? 'keydown' : 'keyup';
          active.dispatchEvent(
            new KeyboardEvent(evtType, {
              key: payload.key,
              code: payload.code,
              shiftKey: payload.modifiers.shift,
              ctrlKey: payload.modifiers.ctrl,
              altKey: payload.modifiers.alt,
              metaKey: payload.modifiers.meta,
              bubbles: true,
            })
          );
          break;
        }
      }
    }

    console.log('RemoteWall observer set up');

    return () => {
      eventsMap.unobserve(observer);
    };
  }, []);

  return (
    <>
      {/* … your normal SAGE3 UI … */}
      {/* Overlay a “remote cursor” */}
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', pointerEvents: 'none' }}>
        <div
          style={{
            position: 'absolute',
            top: cursorPos.y,
            left: cursorPos.x,
            width: 16,
            height: 24,
            background: 'white',
            border: '2px solid red',
            pointerEvents: 'none',
            transform: 'translate(-8px, -12px)',
            zIndex: 9999,
          }}
        />
      </div>
    </>
  );
}
