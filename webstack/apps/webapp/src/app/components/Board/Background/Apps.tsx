/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { AppError, Applications, AppWindow } from '@sage3/applications/apps';
import { useAppStore, useHotkeys, useUIStore } from '@sage3/frontend';
import { useEffect } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

// Renders all the apps
export function Apps() {
  // Apps Store
  const apps = useAppStore((state) => state.apps);
  const setSelectedApp = useUIStore((state) => state.setSelectedApp);
  const resetZIndex = useUIStore((state) => state.resetZIndex);

  // Reset the global zIndex when no apps
  useEffect(() => {
    if (apps.length === 0) resetZIndex();
  }, [apps]);

  // Deselect all apps
  useHotkeys('esc', () => {
    setSelectedApp('');
  });

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
