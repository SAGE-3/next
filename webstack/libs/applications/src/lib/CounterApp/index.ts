/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import * as React from 'react';

export type CounterState = {
  count: number,
}

export const CounterName = "Counter";

export const CounterApp = React.lazy(() => import('./CounterApp'));