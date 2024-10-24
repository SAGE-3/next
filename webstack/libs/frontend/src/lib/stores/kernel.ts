/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// Zustand
import { create } from 'zustand';

// Dev Tools
import { mountStoreDevtool } from 'simple-zustand-devtools';

import { KernelInfo, ExecOutput } from '@sage3/shared/types';

import { Kernels } from '../api';

type KernelStoreState = {
  kernels: KernelInfo[];
  apiStatus: boolean;
  kernelTypes: string[];
  keepChecking: () => void;
  stopChecking: () => void;
  fetchKernels: () => Promise<KernelInfo[]>;
  fetchKernelTypes: () => Promise<string[]>;
  createKernel: (kernelInfo: KernelInfo) => Promise<boolean>;
  deleteKernel: (kernelId: string) => Promise<boolean>;
  interruptKernel: (kernelId: string) => Promise<boolean>;
  restartKernel: (kernelId: string) => Promise<boolean>;
  executeCode: (code: string, kernelId: string, userId: string) => Promise<{ ok: boolean; msg_id: string }>;
  fetchResults: (msgId: string) => Promise<{ ok: boolean; execOutput: ExecOutput }>;
};

/**
 * The Kernel Store
 */
export const useKernelStore = create<KernelStoreState>()((set, get) => {
  // Heartbeat check for status of the API
  const checkKernelsStatus = async () => {
    const online = await Kernels.checkStatus();
    set({ apiStatus: online });
  };

  // Get Kernel Types
  const fetchKernelTypes = async () => {
    const kernelTypes = await Kernels.fetchKernelTypes();
    set({ kernelTypes });
    return kernelTypes;
  };

  // Fetch kernels
  const fetchKernels = async () => {
    const kernels = await Kernels.fetchKernels();
    set({ kernels });
    return kernels;
  };

  // Create a kernel
  const createKernel = async (kernelInfo: KernelInfo): Promise<boolean> => {
    const response = await Kernels.createKernel(kernelInfo);
    fetchKernels();
    return response;
  };

  // Delete a kernel
  const deleteKernel = async (kernelId: string): Promise<boolean> => {
    const response = await Kernels.deleteKernel(kernelId);
    fetchKernels();
    return response;
  };

  // Interrupt a kernel
  const interruptKernel = async (kernelId: string): Promise<boolean> => {
    const response = await Kernels.interruptKernel(kernelId);
    return response;
  };

  // Restart a kernel
  const restartKernel = async (kernelId: string): Promise<boolean> => {
    const response = await Kernels.restartKernel(kernelId);
    return response;
  };

  // Execute code on a kernel
  const executeCode = async (code: string, kernelId: string, userId: string): Promise<{ ok: boolean; msg_id: string }> => {
    const response = await Kernels.executeCode(code, kernelId, userId);
    return response;
  };

  const fetchResults = async (msgId: string): Promise<{ ok: boolean; execOutput: ExecOutput }> => {
    const response = await Kernels.fetchResults(msgId);
    return response;
  };

  let timerAPI: number | null = null;
  let timerTypes: number | null = null;
  let timerKernels: number | null = null;

  const keepChecking = () => {
    // 5 second interval
    timerAPI = window.setInterval(checkKernelsStatus, 5000);

    // 30 Second interval
    timerTypes = window.setInterval(fetchKernelTypes, 30000);

    // 5 second interval
    timerKernels = window.setInterval(fetchKernels, 5000);
  };

  const stopChecking = () => {
    // Clear the timers
    if (timerAPI) window.clearInterval(timerAPI);
    if (timerTypes) window.clearInterval(timerTypes);
    if (timerKernels) window.clearInterval(timerKernels);
  };

  // First checks
  checkKernelsStatus();
  fetchKernelTypes();
  fetchKernels();

  return {
    kernels: [],
    apiStatus: false,
    kernelTypes: [],
    fetchKernels: fetchKernels,
    fetchKernelTypes: fetchKernelTypes,
    createKernel: createKernel,
    deleteKernel: deleteKernel,
    interruptKernel: interruptKernel,
    restartKernel: restartKernel,
    executeCode: executeCode,
    fetchResults: fetchResults,
    keepChecking: keepChecking,
    stopChecking: stopChecking,
  };
});

// Add Dev tools
if (process.env.NODE_ENV === 'development') mountStoreDevtool('KernelStore', useKernelStore);
