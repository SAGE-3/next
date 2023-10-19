/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useRef, useState } from 'react';
import { Box } from '@chakra-ui/react';

// Molstar library
import { PluginContext } from "molstar/lib/mol-plugin/context";
import { DefaultPluginSpec } from "molstar/lib/mol-plugin/spec";
import { resizeCanvas } from 'molstar/lib/mol-canvas3d/util';

// SAGE3
import { useAppStore } from '@sage3/frontend';
import { App, AppGroup } from '../../schema';
import { AppWindow } from '../../components';
import { state as AppState } from './index';

/**
 * Renders a Molstar application component.
 * @param props The component props.
 * @returns The rendered component.
 */
function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const update = useAppStore((state) => state.update);

  const parentRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const plugin = useRef<PluginContext>();
  const [initialized, setInitialized] = useState(false);

  const [pdbId, setPdbId] = useState('4KTC');
  // const [pdbId, setPdbId] = useState('1KFN');

  useEffect(() => {
    if (canvasRef.current && parentRef.current && !initialized) {
      plugin.current = new PluginContext(DefaultPluginSpec());
      plugin.current.initViewer(canvasRef.current, parentRef.current);
      plugin.current.init();
      loadStructure(pdbId, plugin.current);
      setInitialized(true);
      resizeCanvas(canvasRef.current, parentRef.current);
    }
  }, [canvasRef, parentRef]);

  const loadStructure = async (pdbId: string, plugin: PluginContext) => {
    if (plugin) {
      plugin.clear();
      const structureUrl = `https://files.rcsb.org/view/${pdbId}.cif`;
      const data = await plugin.builders.data.download(
        { url: structureUrl }, { state: { isGhost: true } }
      );
      const traj = await plugin.builders.structure.parseTrajectory(data, "mmcif");
      await plugin.builders.structure.hierarchy.applyPreset(traj, "default");
    }
  };

  useEffect(() => {
    if (canvasRef.current && parentRef.current && initialized) {
      if (plugin.current) {
        // resizeCanvas(canvasRef.current, parentRef.current);
        plugin.current.handleResize();
      }
    }
  }, [props.data.size.width, props.data.size.height, props.data.position.x, props.data.position.y]);

  // Once the pdb is changed, update the title
  useEffect(() => {
    update(props._id, { title: pdbId });
  }, [pdbId]);

  return (
    <AppWindow app={props}>
      <Box ref={parentRef} w="100%" h="100%" m={0} p={0}>
        <canvas
          ref={canvasRef}
          style={{ borderRadius: "9px", margin: 0, padding: 3, position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
      </Box>
    </AppWindow>
  );
}

/* App toolbar component for the app Molstar */
function ToolbarComponent(props: App) {
  return null;
}

/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = (props: { apps: AppGroup }) => {
  return null;
};

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
