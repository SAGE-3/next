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

// Styling
import './styling.css';
import { Box, Button, Grid, Link, Tooltip, GridItem } from '@chakra-ui/react';
import { FaDownload } from 'react-icons/fa';
import LineGraph from './components/LineGraph';

import LocationMap from './components/LocationMap';
import Overview from './components/Overview';
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
    workerInstance.postMessage(query);
  }, [workerInstance]);

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
          metric: s.metric,
          metricData: event.data.result,
          time: s.time,
        });
      }
    });
  }, [workerInstance]);

  return (
    <AppWindow app={props}>
      <Grid width="100%" height="100%" templateColumns="repeat(3, 1fr)" autoRows="400px" autoColumns="650px">
        <GridItem>
          <LineGraph s={s} />
        </GridItem>
        <GridItem>
          <LocationMap {...props} />
        </GridItem>
        <GridItem>
          <div>hey</div>
        </GridItem>
        <GridItem>
          <Overview s={s} />
        </GridItem>
      </Grid>
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

  return (
    <Box display="flex" gap="2" alignItems="center">
      <Link href={jsonBlob()} download={`SageNode_Mesonet_${Date.now()}.json`}>
        <Tooltip label="Download Data" aria-label="Download Current Data">
          <div>
            <FaDownload />
          </div>
        </Tooltip>
      </Link>
      <Button
        size="xs"
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
