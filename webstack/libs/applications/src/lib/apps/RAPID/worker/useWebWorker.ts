/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from "react";

export type Result = {
  data: any[];
}

export interface IBaseWorkerResponse<Result> {
  result: Result;
  error?: any;
}

export const useWebWorker = <Result, TWorkerPayload>(worker: Worker) => {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<any>();
  const [result, setResult] = useState<Result>();

  const startProcessing = useCallback(
    (data: TWorkerPayload) => {
      setRunning(true);
      worker.postMessage(data);
    },
    [worker]
  );

  useEffect(() => {
    const onMessage = (event: MessageEvent<IBaseWorkerResponse<Result>>) => {
      //console.log(event);
      setRunning(false);
      setError(event.data.error);
      setResult(event.data.result);
    };
    worker.addEventListener("message", onMessage);
    return () => worker.removeEventListener("message", onMessage);
  }, [worker]);

  return {
    startProcessing,
    running,
    error,
    result,
  };
};
