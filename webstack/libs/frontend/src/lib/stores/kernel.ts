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
  keepChecking: () => () => void;
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
  let typesRequest: Promise<string[]> | undefined;
  const fetchKernelTypes = () => {
    typesRequest ??= Kernels.fetchKernelTypes()
      .then((kernelTypes) => {
        if (JSON.stringify(kernelTypes) !== JSON.stringify(get().kernelTypes)) set({ kernelTypes });
        return kernelTypes;
      })
      .finally(() => {
        typesRequest = undefined;
      });
    return typesRequest;
  };
  let kernelsRequest: Promise<KernelInfo[]> | undefined;
  const fetchKernels = () => {
    kernelsRequest ??= Kernels.fetchKernels()
      .then((kernels) => {
        if (JSON.stringify(kernels) !== JSON.stringify(get().kernels)) set({ kernels });
        return kernels;
      })
      .finally(() => {
        kernelsRequest = undefined;
      });
    return kernelsRequest;
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

  let timer: ReturnType<typeof setTimeout> | undefined;
  const owners = new Set<symbol>();
  let inFlight = false;
  let failures = 0;
  let lastTypes = 0;
  const poll = async () => {
    if (!owners.size || inFlight) return;
    inFlight = true;
    try {
      if (document.visibilityState !== 'hidden') {
        const online = await Kernels.checkStatus();
        if (online !== get().apiStatus) set({ apiStatus: online });
        failures = online ? 0 : Math.min(failures + 1, 5);
        if (online && owners.size) {
          await fetchKernels();
          if (Date.now() - lastTypes >= 30_000) {
            await fetchKernelTypes();
            lastTypes = Date.now();
          }
        }
      }
    } catch (error) {
      console.warn('Kernel status refresh failed:', error);
      failures = Math.min(failures + 1, 5);
    } finally {
      inFlight = false;
      if (owners.size) timer = setTimeout(poll, Math.min(10_000 * 2 ** failures, 300_000));
    }
  };
  const keepChecking = () => {
    const owner = Symbol();
    owners.add(owner);
    if (owners.size === 1) {
      failures = 0;
      void poll();
    }
    return () => {
      owners.delete(owner);
      if (!owners.size && timer) {
        clearTimeout(timer);
        timer = undefined;
      }
    };
  };
  // Compatibility with callers that explicitly stop all polling.
  const stopChecking = () => {
    owners.clear();
    if (timer) clearTimeout(timer);
    timer = undefined;
  };

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
