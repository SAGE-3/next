/* eslint-disable @typescript-eslint/no-explicit-any */
import { AppState } from '@sage3/applications/schema';
import { useAppStore } from '@sage3/frontend';
import { useCallback, useEffect, useRef, useState } from 'react';

export type ResultDataPoint = {
  time: string;
  'Sage Node': number;
  Mesonet: number;
};

export type Result = {
  data: ResultDataPoint[];
};

export type IBaseWorkerResponse<Result> = {
  result: Result;
  error?: any;
};

export const useWebWorker = <Result, TWorkerPayload>(worker: Worker) => {
  const { updateStateBatch } = useAppStore((state) => state);

  const [running, setRunning] = useState(false);
  const [error, setError] = useState<any>();
  const [result, setResult] = useState<Result>();

  // using useRef to keep track of ids and metric independently of state, might not be best practice
  const ids = useRef<string[]>([]);
  const metric = useRef<string>('');
  const time = useRef<{ SAGE_NODE: string; MESONET: string }>();

  // initialize web worker
  const startProcessing = useCallback(
    (data: TWorkerPayload) => {
      // console.log('data from start process', data);
      setRunning(true);
      ids.current = (data as any).apps;
      metric.current = (data as any).metric;
      time.current = (data as any).time;
      // console.log('metric', metric.current);
      // console.log("idsRef.current", idsRef.current);
      worker.postMessage(data);
    },
    [worker]
  );

  // update state of all of the apps (control panel, line chart, etc.) associated with RAPID
  const updateRAPIDData = (result: Result) => {
    const ps: Array<{ id: string; updates: Partial<AppState> }> = [];
    // console.log('ids', ids);
    // console.log('result', result);

    ids.current.forEach((id) => {
      ps.push({
        id,
        updates: {
          lastUpdated: new Date().toLocaleString(),
          metric: metric.current,
          metricData: result,
          time: time.current,
        },
      });
    });
    updateStateBatch(ps);
  };

  useEffect(() => {
    const onMessage = (event: MessageEvent<IBaseWorkerResponse<Result>>) => {
      //console.log(event);
      setRunning(false);
      setError(event.data.error);
      setResult(event.data.result);

      updateRAPIDData(event.data.result);
      // console.log('EVENT DATA', event.data.result);
    };

    worker.addEventListener('message', onMessage);
    // cleanup
    return () => worker.removeEventListener('message', onMessage);
  }, [worker]);

  return {
    startProcessing,
    running,
    error,
    result,
  };
};
