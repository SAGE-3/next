import React from 'react';
import { App, AppState } from '@sage3/applications/schema';

// Components
import LineGraph from './LineGraph';
import Overview from './Overview';
import ControlPanel from './ControlPanel';
import Map from './Map';

export const CATEGORIES = {
  CONTROL_PANEL: {
    name: 'Control Panel',
    order: 0,
  },
  GRAPH: {
    name: 'Graph',
    order: 1,
  },
  OVERVIEW: {
    name: 'Overview',
    order: 2,
  },
  MAP: {
    name: 'Map',
    order: 3,
  },
};


export type ComponentSelectorProps = {
  propsData: App;
};

export type RAPIDState = {
  s: AppState;
}

/** 
 * Selects the correct component to render based on the category
 */
function ComponentSelector({ propsData }: ComponentSelectorProps): JSX.Element {
  const s = propsData.data.state as AppState;

  if (propsData.data.state.category === CATEGORIES.CONTROL_PANEL.name) {
    return (
      <ControlPanel id={propsData._id} s={s} />
    );
  }

  if (s.category === CATEGORIES.GRAPH.name) {
    return <LineGraph s={s} />;
  }

  if (s.category === CATEGORIES.OVERVIEW.name) {
    return <Overview s={s} />;
  }

  if (s.category === CATEGORIES.MAP.name) {
    return <Map />;
  }

  return <div>ERROR: Category Not Found</div>;
}

export default ComponentSelector;
