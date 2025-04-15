/**
 * Copyright (c) SAGE3 Development Team 2025. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { apiUrls } from '../../config';

/**
 * Multipurpose api call
 * Will create new container if uuid does not match, then return websocket and uuid
 * Will return websocket and uuid if container already deployed
* @param vmId the id of vm, appId (props._id) is typically used as vmId
 * @param vm the name of the vm container
 * @param environment the environment variables for the container
 * @returns websocket as url and uid in json if success, else details containing error
 */
async function initalize(vmId: string = 'allocate', vm: string = 'vnc-x11-firefox', environment: any = {}): Promise<any>{
  const response = await fetch(apiUrls.vms.init(vmId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vm: vm,
      env: environment,
    }),
  });
  if (!response.ok) {
    return {details: ""};
  }
  const data = await response.json();
  return data
}

/**
 * Gets returns websocket or empty if no container exists
 * @param vmId the id of vm, appId (props._id) is typically used as vmId
 * @returns websocket as url in json if success, else details containing error
 */
async function getVmIfExists(vmId: string): Promise<any> {
  const response = await fetch(apiUrls.vms.get(vmId), {
    method: 'GET',
  });
  if (!response.ok) {
    return {details: ""};
  }
  const data = await response.json();
  return data
}

export const VmsAPI = {
  initalize,
  getVmIfExists,
};
