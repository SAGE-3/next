import React from 'react';
import { App, AppState } from '@sage3/applications/schema';
// Components
import LineGraph from './LineGraph';
import Overview from './Overview';
// import ControlPanel from './ControlPanel';
import LocationMap from './Map';
// import SageStats from './SageStats';
import { CATEGORIES } from '../data/constants';

export type ToolbarSelectorProps = {
  props: App;
};

export type RAPIDState = {
  s: AppState;
};

const components = {
  [CATEGORIES.GRAPH]: (props: App) => <LineGraph.ToolbarComponent {...props} />,
  [CATEGORIES.OVERVIEW]: (props: App) => <Overview.ToolbarComponent {...props} />,
  [CATEGORIES.MAP]: (props: App) => <LocationMap.ToolbarComponent {...props} />,
};

/**
 * Selects the correct component to render based on the category
 */
function ToolbarSelector({ props }: ToolbarSelectorProps): JSX.Element {
  const s = props.data.state as AppState;

  if (components[s.category]) {
    return components[s.category](props);
  }

  return <div>ERROR: Category Not Found</div>;
}

export default ToolbarSelector;
