/* eslint-disable @typescript-eslint/no-explicit-any */
import { AppState } from '@sage3/applications/schema';
import { useAppStore } from '@sage3/frontend';
import { useCallback, useEffect, useRef, useState } from 'react';

export type ResultDataPoint = {
  x: string;
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
  const idsRef = useRef<string[]>([]);

  const startProcessing = useCallback(
    (data: TWorkerPayload) => {
      console.log('data from start process', data);
      setRunning(true);
      idsRef.current = (data as any).apps;
      console.log("idsRef.current", idsRef.current);
      worker.postMessage(data);
    },
    [worker]
  );

  const updateRAPIDData = (result: Result) => {
    const ps: Array<{ id: string; updates: Partial<AppState> }> = [];
    // console.log('ids', ids);
    console.log('result', result); 

    idsRef.current.forEach((id) => {
      ps.push({
        id,
        updates: {
          metricData: result,
        },
      });
    });

    updateStateBatch(ps);
  }

  useEffect(() => {
    const onMessage = (event: MessageEvent<IBaseWorkerResponse<Result>>) => {
      //console.log(event);
      setRunning(false);
      setError(event.data.error);
      setResult(event.data.result);
      updateRAPIDData(event.data.result);
      console.log('EVENT DATA', event.data.result);
    };
    worker.addEventListener('message', onMessage);
    return () => worker.removeEventListener('message', onMessage);
  }, [worker]);

  // console.log("ids from control panel", ids)

  return {
    startProcessing,
    running,
    error,
    result,
  };
};
