/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useRef, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { AppError, Applications, AppWindow } from '@sage3/applications/apps';
import { useAppStore, useCursorBoardPosition, useHotkeys, useUIStore } from '@sage3/frontend';
import { useParams } from 'react-router';

// Renders all the apps
export function Apps() {
  // Apps Store
  const apps = useAppStore((state) => state.apps);
  const deleteApp = useAppStore((state) => state.delete);
  const setSelectedApp = useUIStore((state) => state.setSelectedApp);
  const resetZIndex = useUIStore((state) => state.resetZIndex);
  const setBoardPosition = useUIStore((state) => state.setBoardPosition);
  const setScale = useUIStore((state) => state.setScale);
  // Save the previous location and scale when zoming to an application
  const scale = useUIStore((state) => state.scale);
  const boardPosition = useUIStore((state) => state.boardPosition);
  const [previousLocation, setPreviousLocation] = useState({ x: 0, y: 0, s: 1, set: false });

  const userCursor = useCursorBoardPosition();
  const cursorPositionRef = useRef(userCursor);
  const { roomId, boardId } = useParams();

  const { position } = useCursorBoardPosition();
  const createApp = useAppStore((state) => state.create);

  // Fitapps
  const fitApps = useUIStore((state) => state.fitApps);

  // Reset the global zIndex when no apps
  useEffect(() => {
    if (apps.length === 0) resetZIndex();
  }, [apps]);

  // Deselect all apps
  useHotkeys('esc', () => {
    setSelectedApp('');
  });

  // This still doesnt work properly
  // But a start
  useHotkeys(
    'ctrl+d',
    () => {
      if (position && apps.length > 0) {
        const cx = position.x;
        const cy = position.y;
        let found = false;
        // Sort the apps by the last time they were updated to order them correctly
        apps
          .slice()
          .sort((a, b) => b._updatedAt - a._updatedAt)
          .forEach((el) => {
            if (found) return;
            const x1 = el.data.position.x;
            const y1 = el.data.position.y;
            const x2 = x1 + el.data.size.width;
            const y2 = y1 + el.data.size.height;
            // If the cursor is inside the app, delete it. Only delete the top one
            if (cx >= x1 && cx <= x2 && cy >= y1 && cy <= y2) {
              found = true;
              deleteApp(el._id);
            }
          });
      }
    },
    { dependencies: [position.x, position.y, JSON.stringify(apps)] }
  );

  // Zoom to app when pressing z over an app
  useHotkeys(
    'z',
    () => {
      if (position && apps.length > 0) {
        const cx = position.x;
        const cy = position.y;
        let found = false;
        // Sort the apps by the last time they were updated to order them correctly
        apps
          .slice()
          .sort((a, b) => b._updatedAt - a._updatedAt)
          .forEach((el) => {
            if (found) return;
            if (el.data.dragging) return;
            const x1 = el.data.position.x;
            const y1 = el.data.position.y;
            const x2 = x1 + el.data.size.width;
            const y2 = y1 + el.data.size.height;
            // If the cursor is inside the app, delete it. Only delete the top one
            if (cx >= x1 && cx <= x2 && cy >= y1 && cy <= y2) {
              if (previousLocation.set) {
                setBoardPosition({ x: previousLocation.x, y: previousLocation.y });
                setScale(previousLocation.s);
                setPreviousLocation((prev) => ({ ...prev, set: false }));
              } else {
                setPreviousLocation((prev) => ({ x: boardPosition.x, y: boardPosition.y, s: scale, set: true }));
                found = true;
                fitApps([el]);
              }
            }
          });
        if (!found) {
          if (previousLocation.set) {
            setBoardPosition({ x: previousLocation.x, y: previousLocation.y });
            setScale(previousLocation.s);
            setPreviousLocation((prev) => ({ ...prev, set: false }));
          }
        }
      }
    },
    { dependencies: [previousLocation.set, position.x, position.y, scale, boardPosition.x, boardPosition.y, JSON.stringify(apps)] }
  );

  // Un-Zoom with shift+z
  useHotkeys(
    'shift+z',
    () => {
      if (previousLocation.set) {
        setBoardPosition({ x: previousLocation.x, y: previousLocation.y });
        setScale(previousLocation.s);
        setPreviousLocation((prev) => ({ ...prev, set: false }));
      }
    },
    { dependencies: [previousLocation.set] }
  );

  // Used for dragging individual stations from SensorOverview app
  useEffect(() => {
    // Handle the drop event
    const handleDrop = (event: any) => {
      event.preventDefault();
      const { x, y } = userCursor.uiToBoard(event.pageX, event.pageY);
      const state = JSON.parse(event.dataTransfer.getData('text'));

      // On drop, create new SensorOverview app with single station
      createApp({
        title: 'SensorOverview',
        roomId: roomId!,
        boardId: boardId!,
        position: { x: x, y: y, z: 0 },
        size: { width: 1000, height: 1000, depth: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        type: 'SensorOverview',
        state: state,
        raised: true,
        dragging: false,
      });
    };
    // Remove existing event listeners
    const cleanup = () => {
      document.removeEventListener('drop', handleDrop);
    };

    // Add event listener
    document.addEventListener('drop', handleDrop);

    // Cleanup function
    return cleanup;
  }, []);

  // Update the cursor position
  useEffect(() => {
    cursorPositionRef.current = userCursor;
  }, [userCursor]);

  return (
    <>
      {/* Apps array */}
      {apps.map((app) => {
        if (app.data.type in Applications) {
          const Component = Applications[app.data.type].AppComponent;
          return (
            // Wrap the components in an errorboundary to protect the board from individual app errors
            <ErrorBoundary
              key={app._id}
              fallbackRender={({ error, resetErrorBoundary }) => (
                <AppError error={error} resetErrorBoundary={resetErrorBoundary} app={app} />
              )}
            >
              <Component key={app._id} {...app}></Component>
            </ErrorBoundary>
          );
        } else {
          // App not found: happens if unkonw app in Database
          return (
            <AppWindow key={app._id} app={app}>
              <div>App not found</div>
            </AppWindow>
          );
        }
      })}
    </>
  );
}
