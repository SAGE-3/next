import { useMemo, useEffect, useRef } from 'react';
import { useAppStore } from '@sage3/frontend';
import { AppState } from '../../../types';
import { Box, Button, Select } from '@chakra-ui/react';

// web worker
import { createWebWorker } from '../worker/webWorker';
import worker from '../worker/script';
import { useWebWorker } from '../worker/useWebWorker';

import { QUERY_FIELDS } from '../data/queryfields';

export type ControlPanelProps = {
  s: AppState;
  id: string;
};

function ControlPanel({ s, id }: ControlPanelProps): JSX.Element {
  // used for multiapp state update
  // const { updateStateBatch } = useAppStore((state) => state);

  // web worker
  const workerInstance = useMemo(() => createWebWorker(worker), []);
  const { startProcessing } = useWebWorker(workerInstance);

  const interval = useRef<NodeJS.Timeout | undefined>();

  const fetchData = (arr: string[], metric: { SAGE_NODE: string; MESONET: string }) => {
    console.log('s.metric', s.metric);
    startProcessing({
      apps: arr,
      metric: metric,
      sageNode: {
        start: '-24h',
        filter: {
          name: metric.SAGE_NODE,
          sensor: 'bme680',
          vsn: 'W097',
        },
      },
      mesonet: {
        metric: metric.MESONET,
      },
    });
    // console.log('rerendered');
  };

  useEffect(() => {
    if (s.children.length > 0) {
      // Fetch data on initial render
      fetchData(s.children.concat([id]), s.metric);
      // set interval to fetch data every 10 seconds
      if (s.liveData) {
        interval.current = setInterval(() => {
          console.log('interval triggered');
          fetchData(s.children.concat([id]), s.metric);
        }, 10000);
      }
    }
    // clear interval on unmount
    return () => clearInterval(interval.current);
  }, [s.children.length]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // get data from form
    const form = new FormData(event.currentTarget);
    const selection = form.get('selection');
    const selectionParsed = JSON.parse(selection as string);

    // initialize web worker
    const arr = s.children.concat([id]);
    // clear existing interval
    clearInterval(interval.current);
    // fetch data
    fetchData(arr, selectionParsed);
    // set interval to fetch data every 10 seconds
    interval.current = setInterval(() => {
      console.log('interval triggered here');
      fetchData(arr, selectionParsed);
    }, 10000);
  }

  return (
    <>
      {s && (
        <Box padding="5">
          <h1>Control Panel</h1>
          <div>current metric: {s.metric.NAME}</div>
          <div>Last Updated: {s.lastUpdated}</div>
          <Box marginTop="4">Filter</Box>
          <form onSubmit={handleSubmit}>
            <Select name="selection" placeholder="Select Metric" paddingY="3">
              <option value={JSON.stringify(QUERY_FIELDS.TEMPERATURE)}>{QUERY_FIELDS.TEMPERATURE.NAME}</option>
              <option value={JSON.stringify(QUERY_FIELDS.RELATIVE_HUMIDITY)}>{QUERY_FIELDS.RELATIVE_HUMIDITY.NAME}</option>
              <option value={JSON.stringify(QUERY_FIELDS.PRESSURE)}>{QUERY_FIELDS.PRESSURE.NAME}</option>
            </Select>
            <Box display="flex" justifyContent="end">
              <Button type="submit">Submit</Button>
            </Box>
          </form>
        </Box>
      )}
    </>
  );
}

export default ControlPanel;
