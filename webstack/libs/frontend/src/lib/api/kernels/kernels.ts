/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { KernelInfo, ExecOutput } from '@sage3/shared/types';
import { apiUrls } from '../../config';

/**
 * Get all the kernels
 * @returns An array of all the kernels
 */
async function fetchKernels(): Promise<KernelInfo[]> {
  const response = await fetch(apiUrls.kernels.getKernels, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    return [];
  }
  const kernels = await response.json();
  return kernels;
}

/**
 * Get the kernel with the given id
 * @param kernelId a kernel id
 * @returns
 */
async function fetchKernel(kernelId: string): Promise<KernelInfo | undefined> {
  const response = await fetch(apiUrls.kernels.getKernels, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    return undefined;
  }
  const kernels = await response.json();
  const kernel = kernels.find((kernel: KernelInfo) => kernel.kernel_id === kernelId);
  return kernel;
}

/**
 * Check if the SAGE Kernels server is online
 * @returns true if the SAGE Kernels server is online, false otherwise
 */
async function checkStatus(): Promise<boolean> {
  let online = true;
  try {
    const response = await fetch(apiUrls.kernels.heartbeat, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    online = response.ok;
  } catch (error) {
    if (error instanceof DOMException) {
      console.log('Aborted');
    }
    if (error instanceof Error) {
      console.log('Error');
    }
    if (error instanceof TypeError) {
      console.log('The SAGE Kernel server appears to be offline.');
    }
    return false;
  }
  return online;
}

/**
 * Create a new kernel with the given information
 * @param kernelInfo Information about the kernel to create
 * @returns
 */
async function createKernel(kernelInfo: KernelInfo): Promise<boolean> {
  try {
    const response = await fetch(apiUrls.kernels.createKernel(kernelInfo.name), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...kernelInfo }),
    });
    return response.ok;
  } catch (error) {
    if (error instanceof DOMException) {
      console.log('Aborted');
    }
    if (error instanceof Error) {
      console.log('Error');
    }
    if (error instanceof TypeError) {
      console.log('The SAGE Kernel server appears to be offline.');
    }
    return false;
  }
}

/**
 * Delete a kernel with the given id
 * @param kernelId the id of the kernel to delete
 * @returns
 */
async function deleteKernel(kernelId: string): Promise<boolean> {
  const response = await fetch(apiUrls.kernels.deleteKernel(kernelId), {
    method: 'DELETE',
  });
  return response.ok;
}

/**
 * restart the kernel with the given id
 * @param kernelId the id of the kernel to restart
 * @returns
 */
async function restartKernel(kernelId: string): Promise<boolean> {
  const response = await fetch(apiUrls.kernels.restartKernel(kernelId), {
    method: 'POST',
  });
  return response.ok;
}

/**
 * Execute the given code on the kernel with the given id
 * @param code The code to execute
 * @param kernelId The id the kernel to execute the code on
 * @param userId the id of the user executing the code
 * @returns
 */
async function executeCode(code: string, kernelId: string, userId: string): Promise<{ ok: boolean; msg_id: string }> {
  const response = await fetch(apiUrls.kernels.executeKernel(kernelId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      session: userId,
    }),
  });
  const ok = response.ok;
  if (!ok) {
    return { ok, msg_id: '' };
  } else {
    const data = await response.json();
    return { ok, msg_id: data.msg_id };
  }
}

/**
 * Interrupt the kernel with the given id
 * @param kernelId The id of the kernel to interrupt
 * @returns
 */
async function interruptKernel(kernelId: string): Promise<any> {
  const response = await fetch(apiUrls.kernels.interruptKernel(kernelId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await response.json();
  return data;
}

/**
 * Get the kernel specs
 *
 */
async function fetchKernelTypes(): Promise<string[]> {
  const response = await fetch(apiUrls.kernels.getKernelsSpecs, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await response.json();
  const kernelTypes = [];
  for (const key in data) {
    kernelTypes.push(key);
  }
  return kernelTypes;
}

/**
 * This function will fetch the results of executed code from the kernel
 * @param msgId
 * @returns
 */
async function fetchResults(msgId: string): Promise<{ ok: boolean; execOutput: ExecOutput }> {
  const response = await fetch(apiUrls.kernels.statusKernel(msgId), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    return {
      ok: false,
      execOutput: {
        completed: true,
        session_id: '',
        start_time: '',
        end_time: '',
        msg_type: '',
        content: [{ ename: 'Error', evalue: 'Failed to fetch results.' }],
        last_update_time: '',
        execution_count: 0,
      },
    };
  } else {
    const data = await response.json();
    return { ok: true, execOutput: data };
  }
}

function startServerSentEventsStream(
  msgId: string,
  messageCallback: (event: MessageEvent<unknown>) => void
  // errorCallback: (error: MessageEvent<unknown>) => void
): EventSource {
  const eventSource = new EventSource(apiUrls.kernels.getMessageStream(msgId));
  eventSource.addEventListener('new_message', messageCallback);
  // eventSource.addEventListener('error', errorCallback);
  return eventSource;
}

export const Kernels = {
  interruptKernel,
  executeCode,
  createKernel,
  fetchKernel,
  fetchKernels,
  checkStatus,
  deleteKernel,
  restartKernel,
  fetchKernelTypes,
  fetchResults,
  startServerSentEventsStream,
};
