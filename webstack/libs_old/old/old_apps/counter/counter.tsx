/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Button } from '@chakra-ui/button';
import { useSageStateAtom, useSageStateReducer } from '@sage3/frontend/smart-data/hooks';
import React from 'react';


import { CounterProps } from './metadata';
import { counterReducer, CounterState } from './state-reducers';

export const CounterApp = (props: CounterProps): JSX.Element => {
  const { data: data1, dispatch: dispatch1 } = useSageStateReducer(props.state.counter1State, counterReducer);
  const { data: data2, dispatch: dispatch2 } = useSageStateReducer(props.state.counter2State, counterReducer);
  const data3 = useSageStateAtom<CounterState>(props.state.counterAtomState);
  return (
    <div>
      <p>Counter 1: {data1.count}</p>
      <Button onClick={() => dispatch1({ type: "increase" })}>Increase</Button>
      <Button onClick={() => dispatch1({ type: "decrease" })}>Decrease</Button>
      <hr />
      <p>Counter 2: {data2.count}</p>
      <Button onClick={() => dispatch2({ type: "increase" })}>Increase</Button>
      <Button onClick={() => dispatch2({ type: "decrease" })}>Decrease</Button>
      <p>Counter 2: {data3.data.count}</p>
      <Button onClick={() => data3.setData({ count: data3.data.count + 3 })}>Increase</Button>
      <Button onClick={() => data3.setData({ count: data3.data.count - 1 })}>Decrease</Button>
    </div>
  )
};

export default CounterApp;
