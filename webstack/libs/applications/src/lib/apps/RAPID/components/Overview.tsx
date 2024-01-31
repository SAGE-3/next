import React from 'react';
import { RAPIDState } from './ComponentSelector';

function Overview({s}: RAPIDState ): JSX.Element {
  return (
    <div>
      <h1>Overview</h1>
      <div>Counter: {s.counter}</div>
    </div>
  );
}

export default Overview;
