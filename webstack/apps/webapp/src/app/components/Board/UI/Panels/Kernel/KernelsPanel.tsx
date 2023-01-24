/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { Panel } from '../Panel';

export function KernelsPanel() {
  return (
    <Panel title={'Kernel'} name="kernel" width={0} showClose={false} zIndex={100}>
      <div>Kernel Time</div>
    </Panel>
  );
}
