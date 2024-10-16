import { App, AppState } from '@sage3/applications/schema';
// Components
import LineGraph from './LineGraph';
import Overview from './Overview';
// import ControlPanel from './ControlPanel';
import LocationMap from './Map';
// import SageStats from './SageStats';
import { CATEGORIES } from '../data/constants';

export type ComponentSelectorProps = {
  props: App;
};

export type RAPIDState = {
  s: AppState;
};

const components = {
  [CATEGORIES.GRAPH]: (props: App) => <LineGraph.AppComponent {...props} />,
  [CATEGORIES.OVERVIEW]: (props: App) => <Overview.AppComponent {...props} />,
  [CATEGORIES.MAP]: (props: App) => <LocationMap.AppComponent {...props} />,
};

/**
 * Selects the correct component to render based on the category
 */
function ComponentSelector({ props }: ComponentSelectorProps): JSX.Element {
  const s = props.data.state as AppState;

  if (components[s.category]) {
    return components[s.category](props);
  }

  return <div>ERROR: Category Not Found</div>;
}

export default ComponentSelector;
