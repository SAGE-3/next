/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { ActionArg, ResourceArg, SAGE3Ability } from '@sage3/shared';
import { useEffect, useState } from 'react';

/**
 * React hook to check if the current user can perform an action on a resource
 * @param props
 * @returns
 */
export function useAbility(ability: ActionArg, resource: ResourceArg) {
  const [can, setCan] = useState(false);

  useEffect(() => {
    const can = SAGE3Ability.canCurrentUser(ability, resource);
    setCan(can);
  }, [ability, resource]);
  return can;
}
