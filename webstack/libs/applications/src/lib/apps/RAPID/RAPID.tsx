/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useAppStore } from '@sage3/frontend';
import { App, AppGroup } from '../../schema';

import { state as AppState } from './index';
import { AppWindow } from '../../components';
import { useState, useEffect } from 'react';
import ComponentSelector from './components/ComponentSelector';
import StationEditorModal from './components/station-editor/StationEditorModal';

import { SelectedSensor } from './components/station-editor/StationEditorModal';
import { DateRange } from './components/station-editor/StationEditorModal';

// Styling
import './styling.css';
import { Box, Button, Select } from '@chakra-ui/react';
import MetricSelector from './components/station-editor/components/MetricSelector';
import DateRangeSelector from './components/station-editor/components/DateRangeSelector';

/* App component for RAPID */
function AppComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);
  const createApp = useAppStore((state) => state.create);

  // used to get userId
  // const { user } = useUser();

  // Create RAPID charts
  // async function createRAPIDCharts() {
  //   try {
  //     const positionX = props.data.position.x;
  //     const positionY = props.data.position.y;
  //     const width = props.data.size.width;
  //     const height = props.data.size.height;
  //     const max = 4;

  //     const promises = [];

  //     for (const category in CATEGORIES) {
  //       console.log('category', category);
  //       // ignore creation of Control Panel
  //       const name = CATEGORIES[`${category}` as keyof typeof CATEGORIES].name;
  //       const order = CATEGORIES[`${category}` as keyof typeof CATEGORIES].order;

  //       if (name === 'Control Panel') continue;

  //       promises.push(
  //         createApp({
  //           title: 'RAPID',
  //           roomId: props.data.roomId!,
  //           boardId: props.data.boardId!,
  //           position: {
  //             x: (order % max) * width + positionX,
  //             y: Math.floor(order / max) * height + positionY,
  //             z: 0,
  //           },
  //           size: {
  //             width: props.data.size.width,
  //             height: props.data.size.height,
  //             depth: 0,
  //           },
  //           type: 'RAPID',
  //           rotation: { x: 0, y: 0, z: 0 },
  //           state: {
  //             parent: props._id,
  //             category: name,
  //           },
  //           raised: true,
  //           dragging: false,
  //           pinned: false,
  //         })
  //       );
  //     }

  //     const resolution = await Promise.all(promises);

  //     updateState(props._id, {
  //       children: [...s.children, ...resolution.map((res) => res.data._id)],
  //     });
  //   } catch (e) {
  //     console.log('ERROR in RAPID:', e);
  //   }
  // }

  return (
    <AppWindow app={props}>
      <Box height="100%" width="100%" minHeight="400px" minWidth="650px" overflow="auto">
        <ComponentSelector props={props as App} />
      </Box>
    </AppWindow>
  );
}

/* App toolbar component for the app RAPID */
function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  const [selectedMetric, setSelectedMetric] = useState<string | null>(JSON.stringify(s.metric));
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: new Date(s.startTime as Date), endDate: new Date(s.endTime as Date) });

  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'edit' | 'create'>('create');

  useEffect(() => {
    setDateRange({ 
      startDate: new Date(s.startTime as Date), 
      endDate: new Date(s.endTime as Date) 
    });
    setSelectedMetric(JSON.stringify(s.metric));
    console.log("rerendering toolbar");
  }, [s.startTime, s.endTime, s.metric]);

  const onClose = () => setIsOpen(false);
  const onOpenCreate = () => {
    setMode('create');
    setIsOpen(true);
  };
  const onOpenEdit = () => {
    setMode('edit');
    setIsOpen(true);
  };

  const selectedSensors: SelectedSensor[] = [
    ...s.sensors.waggle.map((s) => ({ id: s, type: 'Waggle' as const })),
    ...s.sensors.mesonet.map((s) => ({ id: s, type: 'Mesonet' as const })),
  ];

  const handleDateRangeChange = (newDateRange: DateRange) => {
    setDateRange(newDateRange);
  };

  return (
    <>
      <Box display="flex" gap="2" alignItems="center">
        <Button size="xs" onClick={onOpenCreate}>
          +
        </Button>
        <Button size="xs" padding="1em" onClick={onOpenEdit}>
          Edit
        </Button>
        <MetricSelector
          selectedSensors={selectedSensors}
          setSelectedMetric={setSelectedMetric}
          initialMetric={selectedMetric}
          showLabel={false}
          size="xs"
        />
        <DateRangeSelector size="xs" showLabel={false} dateRange={dateRange} onDateRangeChange={handleDateRangeChange} />
      </Box>
      <StationEditorModal mode={mode} isOpen={isOpen} onClose={onClose} app={props} />
    </>
  );
}

/**
 * Grouped App toolbar component, this component will display when a group of apps are selected
 * @returns JSX.Element | null
 */
const GroupedToolbarComponent = (props: { apps: AppGroup }) => {
  return null;
};

export default { AppComponent, ToolbarComponent, GroupedToolbarComponent };
