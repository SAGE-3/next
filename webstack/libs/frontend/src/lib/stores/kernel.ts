/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

// The React version of Zustand
import create from 'zustand';

// Dev Tools
import { mountStoreDevtool } from 'simple-zustand-devtools';

import { KernelInfo } from '@sage3/shared/types';

import { FastAPI } from '../api';

type KernelStoreState = {
  kernels: KernelInfo[];
  refreshKernels: () => void;
  apiStatus: boolean;
  create: (kernelInfo: KernelInfo) => Promise<boolean>;
};

/**
 * The Kernel Store
 */
export const useKernelStore = create<KernelStoreState>((set, get) => {
  // Heartbeat check for status of the API
  const checkFastAPIStatus = async () => {
    const online = await FastAPI.checkStatus();
    set({ apiStatus: online });
  };
  // 5 second interval
  setInterval(checkFastAPIStatus, 5000);

  // Fetch kernels
  const fetchKernels = async () => {
    const kernels = await FastAPI.fetchKernels();
    set({ kernels });
  };
  // 5 second interval
  setInterval(fetchKernels, 5000);

  // Create a kernel
  const createKernel = async (kernelInfo: KernelInfo): Promise<boolean> => {
    const response = await FastAPI.createKernel(kernelInfo);
    fetchKernels();
    return response;
  };

  return {
    kernels: [],
    refreshKernels: fetchKernels,
    apiStatus: false,
    create: createKernel,
  };
});

// Add Dev tools
if (process.env.NODE_ENV === 'development') mountStoreDevtool('KernelStore', useKernelStore);
