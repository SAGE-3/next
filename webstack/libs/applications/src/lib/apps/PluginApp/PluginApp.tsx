/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */
import { Text } from '@chakra-ui/react';
import { PluginFrame, isPluginEnabled, usePluginStore } from '@sage3/frontend';
import { PluginAppApp } from './index';
import { AppWindow } from '../../components';

// Styling
import './styling.css';
import { HiPuzzle } from 'react-icons/hi';

/* App component for PluginApp */
function AppComponent(props: PluginAppApp): JSX.Element {
  const state = props.data.state;
  const plugin = usePluginStore((store) => store.plugins.find((candidate) => candidate._id === state.pluginId));
  const enabledPlugin = plugin && isPluginEnabled(plugin, props.data.boardId) ? plugin : undefined;
  const appView = enabledPlugin?.data.package.manifest.views?.find(
    (view) => view.id === state.viewId && view.kind === 'app',
  );

  return (
    <AppWindow app={props} hideBackgroundIcon={HiPuzzle}>
      {enabledPlugin && appView ? (
        <PluginFrame
          key={`${enabledPlugin._id}:${enabledPlugin.data.package.digest}`}
          plugin={enabledPlugin}
          boardId={props.data.boardId}
          roomId={props.data.roomId}
          appId={props._id}
          viewId={appView.id}
          entry={appView.entry}
        />
      ) : (
        <Text padding={4}>This extension is unavailable or disabled. Its saved data has been preserved.</Text>
      )}
    </AppWindow>
  );
}

/* App toolbar component for the app PluginApp */
function ToolbarComponent() {
  return null;
}

/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = () => {
  return null;
};

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
