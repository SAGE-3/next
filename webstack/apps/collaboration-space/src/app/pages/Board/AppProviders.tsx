/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React from 'react';
import { usePermissions, PermissionContext } from '@sage3/frontend/services';

export function PermissionProvider(props: { children: React.ReactNode }): JSX.Element {
  const [permissions] = usePermissions();

  return <PermissionContext.Provider value={permissions}>{props.children}</PermissionContext.Provider>;
}
