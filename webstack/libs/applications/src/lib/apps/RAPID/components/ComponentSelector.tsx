import React from 'react';
import LineGraph from './LineGraph';
import { CATEGORIES } from '../constants';
import Overview from './Overview';
import { App, AppState } from '@sage3/applications/schema';
import ControlPanel from './ControlPanel';

export type ComponentSelectorProps = {
  propsData: App;
};

export type RAPIDState = {
  s: AppState;
}

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

  return <div>ERROR: Category Not Found</div>;
}

export default ComponentSelector;
