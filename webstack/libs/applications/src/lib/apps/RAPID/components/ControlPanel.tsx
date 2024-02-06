import { useMemo, useEffect } from 'react';
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
  const { updateStateBatch } = useAppStore((state) => state);

  // web worker
  const workerInstance = useMemo(() => createWebWorker(worker), []);
  const { startProcessing } = useWebWorker(workerInstance);

  // initial render
  useEffect(() => {
    if (s.children.length > 0) {
      const arr = s.children.concat([id]);
      // console.log('arr', arr);
      // console.log('children', s.children);
      console.log('metric', s.metric);
      startProcessing({
        apps: arr,
        metric: s.metric,
        sageNode: {
          start: '-24h',
          filter: {
            name: s.metric.SAGE_NODE,
            vsn: 'W097',
          },
        },
        mesonet: {
          metric: s.metric.MESONET,
        },
      });
      // console.log('rerendered');
    }
  }, [startProcessing, s.children.length]);

  // Testing multiapp update
  const handleIncreaseCounter = () => {
    console.log('clicked');
    const ps: Array<{ id: string; updates: Partial<AppState> }> = [];

    ps.push({ id: id, updates: { counter: s.counter + 1 } });

    s.children.forEach((id: string) => {
      ps.push({ id: id, updates: { counter: s.counter + 1 } });
    });

    updateStateBatch(ps);
  };

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // get data from form
    const form = new FormData(event.currentTarget);
    const selection = form.get('selection');
    const selectionParsed = JSON.parse(selection as string);

    // initialize web worker
    const arr = s.children.concat([id]);
    startProcessing({
      apps: arr,
      metric: selectionParsed,
      sageNode: {
        start: '-24h',
        filter: {
          name: selectionParsed.SAGE_NODE,
          vsn: 'W097',
        },
      },
      mesonet: {
        metric: selectionParsed.MESONET,
      },
    });
  }

  return (
    <>
      {s && (
        <Box padding="5">
          <h1>Control Panel</h1>
          <div>current metric: {s.metric.NAME}</div>
          <div>Counter: {s.counter}</div>
          <Button onClick={handleIncreaseCounter}>Increase Count</Button>
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
