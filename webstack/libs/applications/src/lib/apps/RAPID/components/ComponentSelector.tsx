import { App, AppState } from '@sage3/applications/schema';
// Components
import LineGraph from './LineGraph';
import Overview from './Overview';
import ControlPanel from './ControlPanel';
import LocationMap from './Map';
import SageStats from './SageStats';
import { CATEGORIES } from '../data/constants';

export type ComponentSelectorProps = {
  propsData: App;
};

export type RAPIDState = {
  s: AppState;
};

/**
 * Selects the correct component to render based on the category
 */
function ComponentSelector({ propsData }: ComponentSelectorProps): JSX.Element {
  const s = propsData.data.state as AppState;

  if (s.category === CATEGORIES.CONTROL_PANEL.name) {
    return <ControlPanel id={propsData._id} s={s} />;
  }

  if (s.category === CATEGORIES.GRAPH.name) {
    return <LineGraph s={s} />;
  }

  if (s.category === CATEGORIES.OVERVIEW.name) {
    return <Overview s={s} />;
  }

  if (s.category === CATEGORIES.MAP.name) {
    return <LocationMap {...propsData} />;
  }

  if (s.category === CATEGORIES.SAGE_STATS.name) {
    return <SageStats {...propsData} />;
  }

  return <div>ERROR: Category Not Found</div>;
}

export default ComponentSelector;
