/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useUser } from '@sage3/frontend';
import { Panel } from '../Panel';

export interface KernelsProps {
  roomId: string;
}

export function KernelsPanel(props: KernelsProps) {
  // User
  const { user } = useUser();

  return (
    <Panel title={'Kernels'} name="kernels" width={0} showClose={false}>
      <>
      </>
    </Panel>
  );
}