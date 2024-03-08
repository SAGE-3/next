/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { apiUrls, useAppStore } from '@sage3/frontend';
import { App, AppGroup } from '../../schema';

import { state as AppState } from './index';
import { AppWindow } from '../../components';
import { useCallback, useEffect, useState } from 'react';
import { useMemo } from 'react';
import { useRef } from 'react';
import { createWebWorker } from './worker/webWorker';
import worker from './worker/script';
import { QUERY_FIELDS } from './data/constants';

// Styling
import './styling.css';
import { Box, Button, Flex, Link, Tooltip, GridItem, Grid, Select } from '@chakra-ui/react';
import { FaDownload } from 'react-icons/fa';
import LineGraph from './components/LineGraph';

import LocationMap from './components/LocationMap';
import Overview from './components/Overview';
import Panel from './components/Panel';
import SageStats from './components/SageStats';
/* App component for RAPID */

function AppComponent(props: App): JSX.Element {
  // Constant
  const TEN_MINUTES = 600000;

  // App state
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  // Interval for fetching data
  const interval = useRef<NodeJS.Timeout | undefined>();

  // Web worker functions
  const workerInstance = useMemo(() => createWebWorker(worker), []);
  const fetchDataViaWorker = useCallback(() => {
    const query = {
      sageNode: {
        start: s.time.SAGE_NODE,
        filter: {
          name: s.metric.SAGE_NODE,
          sensor: 'bme680',
          vsn: 'W097',
        },
      },
      mesonet: {
        metric: s.metric.MESONET,
        time: s.time.MESONET,
      },
    };
    console.log("query", query)
    workerInstance.postMessage(query);
  }, [workerInstance]);

  useEffect(() => {
    console.log("updating")
  }, [s.metric])

  // Post message to web worker
  useEffect(() => {
    if (workerInstance) {
      fetchDataViaWorker();
      // check if live data is enabled
      if (s.liveData) {
        interval.current = setInterval(() => {
          console.log('interval triggered');
          fetchDataViaWorker();
        }, TEN_MINUTES);
      }
    }
    // cleanup on unmount
    return () => {
      clearInterval(interval.current);
    };
  }, [workerInstance]);

  // Listen to result from web worker
  useEffect(() => {
    workerInstance.addEventListener('message', (event) => {
      if (event.data.error) {
        console.error('Error fetching data', event.data.error);
      } else {
        updateState(props._id, {
          lastUpdated: new Date().toLocaleString(),
          metricData: event.data.result,
        });
      }
    });
  }, [workerInstance]);

  return (
    <AppWindow app={props}>
      <Box overflow="auto" height="100%" width="100%">
        <Grid minHeight="100%" minWidth="100%" gridTemplateColumns="repeat(3, 1fr)" gridAutoRows="1fr">
          <Panel>
            <LineGraph s={s} />
          </Panel>
          <Panel>
            <Overview s={s} />
          </Panel>
          <Panel>
            <LocationMap {...props} />
          </Panel>
          <Panel>
            <SageStats />
          </Panel>
          <Panel>
            <div>hey</div>
          </Panel>
        </Grid>
      </Box>
    </AppWindow>
  );
}

/* App toolbar component for the app RAPID */
function ToolbarComponent(props: App): JSX.Element {
  const s = props.data.state as AppState;
  const updateState = useAppStore((state) => state.updateState);

  const jsonBlob = useCallback(() => {
    const data = new Blob([JSON.stringify(s.metricData)], { type: 'application/json' });
    const url = URL.createObjectURL(data);
    return url;
  }, [s.metricData]);

  const handleDateSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value) {
      console.log(e.target.value);
    }
  };

  const handleMetricSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value) {
      console.log("e.target.value", e.target.value)
      await updateState(props._id, { metric: JSON.parse(e.target.value)})
    }
  }

  return (
    <Box display="flex" gap="2" alignItems="center" width="fit-content">
      <Select
        placeholder="Select Date"
        name="date_selection"
        size="xs"
        onChange={handleDateSelect}
      >
        <option value={JSON.stringify(QUERY_FIELDS.TIME['24HR'])}>Last 24 Hours</option>
        <option value={JSON.stringify(QUERY_FIELDS.TIME['7D'])}>Last 7 days</option>
        <option value={JSON.stringify(QUERY_FIELDS.TIME['30D'])}>Last 30 Days</option>
      </Select>
      <Select
        name="metric"
        placeholder="Select Metric"
        size="xs"
        onChange={handleMetricSelect}
      >
        <option value={JSON.stringify(QUERY_FIELDS.TEMPERATURE)}>{QUERY_FIELDS.TEMPERATURE.NAME}</option>
        <option value={JSON.stringify(QUERY_FIELDS.RELATIVE_HUMIDITY)}>{QUERY_FIELDS.RELATIVE_HUMIDITY.NAME}</option>
        <option value={JSON.stringify(QUERY_FIELDS.PRESSURE)}>{QUERY_FIELDS.PRESSURE.NAME}</option>
      </Select>
      <Link href={jsonBlob()} download={`SageNode_Mesonet_${Date.now()}.json`}>
        <Tooltip label="Download Data" aria-label="Download Current Data">
          <div>
            <FaDownload />
          </div>
        </Tooltip>
      </Link>
      <Button
        size="xs"
        width="300px"
        onClick={() => {
          try {
            console.log('uploading');
            const fd = new FormData();
            fd.append(
              'files',
              new File([new Blob([JSON.stringify(s.metricData)], { type: 'application/json' })], `SageNode_Mesonet_${Date.now()}.json`)
            );
            fd.append('room', props.data.roomId!);

            fetch(apiUrls.assets.upload, {
              method: 'POST',
              body: fd,
            });
          } catch (error) {
            console.log('Upload> Error: ', error);
          }
        }}
      >
        Add to Assets Folder
      </Button>
    </Box>
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
