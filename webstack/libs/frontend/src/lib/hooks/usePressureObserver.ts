/**
 * Copyright (c) SAGE3 Development Team 2024. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { useEffect, useState, useRef } from 'react';

////////////////////////////////////////
// FROM: https://w3c.github.io/compute-pressure/#dom-pressuresource

export enum PressureState {
  'nominal',
  'fair',
  'serious',
  'critical',
}

enum PressureSource {
  'thermals',
  'cpu',
}

interface PressureRecord {
  readonly source: PressureSource;
  readonly state: PressureState;
  readonly time: DOMHighResTimeStamp;
  toJSON: () => any;
}

function stateToValue(state: PressureState): number {
  switch (state) {
    case PressureState.nominal:
      return 1;
    case PressureState.fair:
      return 2;
    case PressureState.serious:
      return 3;
    case PressureState.critical:
      return 4;
    default:
      return 0;
  }
}
////////////////////////////////////////

export interface Pressure {
  source: string;
  state: PressureState;
  value: number;
  time: DOMHighResTimeStamp;
}

export function usePressureObserver(): Pressure {
  const [state, setState] = useState({ state: PressureState.nominal, value: 1, time: 0, source: PressureSource.cpu.toString() });
  const hasPressureObserver = useRef(false);

  useEffect(() => {
    if ('PressureObserver' in globalThis) {
      hasPressureObserver.current = true;
      console.log('PressureObserver> is supported');
    } else {
      console.log('PressureObserver> is not supported');
      return;
    }

    const handleStateChange = (records: PressureRecord[]) => {
      const lastRecord = records[records.length - 1];
      setState({
        state: lastRecord.state,
        value: stateToValue(lastRecord.state),
        time: lastRecord.time,
        source: lastRecord.source.toString(),
      });
    };

    // @ts-ignore
    const observer = new PressureObserver(handleStateChange);
    observer.observe('cpu', { sampleInterval: 2000 }); // every 2 seconds

    return () => {
      if (hasPressureObserver.current) {
        observer.unobserve('cpu');
        observer.disconnect();
      }
    };
  }, []);

  return state;
}
