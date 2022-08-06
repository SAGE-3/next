/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { useState, useEffect } from 'react';
import { useAppStore } from '@sage3/frontend';

// Operator function
import { Operator } from './CounterApp'

/**
 * Hook to access the application operator
 * 
 * @export
 * @param {string} appId 
 * @param {OperatorFunc<AppState>} updateState 
 * @returns 
 */
export function useOperator(appId: string) {
  const [operator, setOperator] = useState<Operator>();
  const updateState = useAppStore((state) => state.updateState);
  useEffect(() => {
    setOperator(new Operator(appId, updateState));
  }, [appId]);
  return operator;
}
