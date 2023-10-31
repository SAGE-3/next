/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// Adapted from https://github.com/streamich/react-use

import { useEffect, useState } from 'react';

export interface INetworkInformation extends EventTarget {
  readonly downlink: number;
  readonly downlinkMax: number;
  readonly effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
  readonly rtt: number;
  readonly type: 'bluetooth' | 'cellular' | 'ethernet' | 'none' | 'wifi' | 'wimax' | 'other' | 'unknown';
  onChange: (event: Event) => void;
}

export interface IUseNetworkState {
  /**
   * @desc Whether browser connected to the network or not.
   */
  online: boolean | undefined;
  /**
   * @desc Previous value of `online` property. Helps to identify if browser
   * just connected or lost connection.
   */
  previous: boolean | undefined;
  /**
   * @desc The {Date} object pointing to the moment when state change occurred.
   */
  since: Date | undefined;
  /**
   * @desc Effective bandwidth estimate in megabits per second, rounded to the
   * nearest multiple of 25 kilobits per seconds.
   */
  downlink: INetworkInformation['downlink'] | undefined;
  /**
   * @desc Maximum downlink speed, in megabits per second (Mbps), for the
   * underlying connection technology
   */
  downlinkMax: INetworkInformation['downlinkMax'] | undefined;
  /**
   * @desc Effective type of the connection meaning one of 'slow-2g', '2g', '3g', or '4g'.
   * This value is determined using a combination of recently observed round-trip time
   * and downlink values.
   */
  effectiveType: INetworkInformation['effectiveType'] | undefined;
  /**
   * @desc Estimated effective round-trip time of the current connection, rounded
   * to the nearest multiple of 25 milliseconds
   */
  rtt: INetworkInformation['rtt'] | undefined;

  /**
   * @desc The type of connection a device is using to communicate with the network.
   * It will be one of the following values:
   *  - bluetooth, cellular, ethernet, none, wifi, wimax, other, unknown
   */
  type: INetworkInformation['type'] | undefined;
}

const nav: Navigator & Partial<Record<'connection', INetworkInformation>> = navigator;
const conn = nav.connection;

function getConnectionState(previousState?: IUseNetworkState): IUseNetworkState {
  const online = navigator.onLine;
  const previousOnline = previousState?.online;

  return {
    online,
    previous: previousOnline,
    since: online !== previousOnline ? new Date() : previousState?.since,
    downlink: conn?.downlink,
    downlinkMax: conn?.downlinkMax,
    effectiveType: conn?.effectiveType,
    rtt: conn?.rtt,
    type: conn?.type,
  };
}

export function useNetworkState(): IUseNetworkState {
  const [state, setState] = useState(getConnectionState);

  useEffect(() => {
    const handleStateChange = () => {
      setState(getConnectionState);
    };

    window.addEventListener('online', handleStateChange, { passive: true });
    window.addEventListener('offline', handleStateChange, { passive: true });

    if (conn) {
      conn.addEventListener('change', handleStateChange, { passive: true });
    }

    return () => {
      window.removeEventListener('online', handleStateChange);
      window.removeEventListener('offline', handleStateChange);

      if (conn) {
        conn.removeEventListener('change', handleStateChange);
      }
    };
  }, []);

  return state;
}
