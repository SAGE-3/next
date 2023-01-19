/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { App } from '@sage3/applications/schema';
import { AppError, Applications, AppWindow } from '@sage3/applications/apps';
import { useAppStore, useCursorBoardPosition, useHotkeys, useUIStore } from '@sage3/frontend';

// Renders all the apps
export function Apps() {
  // Apps Store
  const apps = useAppStore((state) => state.apps);
  const deleteApp = useAppStore((state) => state.delete);
  const setSelectedApp = useUIStore((state) => state.setSelectedApp);
  const resetZIndex = useUIStore((state) => state.resetZIndex);
  const setBoardPosition = useUIStore((state) => state.setBoardPosition);
  const setScale = useUIStore((state) => state.setScale);

  const { position } = useCursorBoardPosition();

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

  function moveToApp(app: App) {
    if (app) {
      // Scale
      const aW = app.data.size.width + 60; // Border Buffer
      const aH = app.data.size.height + 100; // Border Buffer
      const wW = window.innerWidth;
      const wH = window.innerHeight;
      const sX = wW / aW;
      const sY = wH / aH;
      const zoom = Math.min(sX, sY);

      // Position
      let aX = -app.data.position.x + 20;
      let aY = -app.data.position.y + 20;
      const w = app.data.size.width;
      const h = app.data.size.height;
      if (sX >= sY) {
        aX = aX - w / 2 + wW / 2 / zoom;
      } else {
        aY = aY - h / 2 + wH / 2 / zoom;
      }
      const x = aX;
      const y = aY;

      setBoardPosition({ x, y });
      setScale(zoom);
    }
  }

  // Zoom to app when pressing z over an app
  useHotkeys('z', () => {
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
            moveToApp(el);
          }
        });
    }
  },
    { dependencies: [position.x, position.y, JSON.stringify(apps)] }
  );


  return (
    <>
      {/* Apps */}
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
