import React from 'react';
import LineGraph from './LineGraph';

type ComponentSelectorProps = {
  category: string;
}

function ComponentSelector({ category }: ComponentSelectorProps) {
  if (category === 'Control Panel') {
    return (
      <div>Control Panel</div>
    )
  }

  if (category === 'Graph') {
    return (
      <LineGraph />
    )
  }

  return (
    <div>
      ERROR: Category Not Found
    </div>
  )
}

export default ComponentSelector;