import { useRef, useEffect } from 'react';
import { KernelInfo } from '../KernelDashboard';
import { useAppStore } from '@sage3/frontend';

const baseURL = 'http://localhost:81';

export function haveSameKernelIds(arr1: KernelInfo[], arr2: KernelInfo[]) {
  if (arr1.length !== arr2.length) return false;

  const ids1 = new Set(arr1.map((kernel) => kernel.kernel_id));
  const ids2 = new Set(arr2.map((kernel) => kernel.kernel_id));

  for (const id of ids1) {
    if (!ids2.has(id)) return false;
  }
  return true;
}

export async function fetchKernels(): Promise<KernelInfo[]> {
  const response = await fetch(`${baseURL}/collection`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const kernels = await response.json();
  return kernels;
}

export async function fetchKernel(kernelId: string): Promise<KernelInfo> {
  const response = await fetch(`${baseURL}/collection`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const kernels = await response.json();
  const kernel = kernels.find((kernel: KernelInfo) => kernel.kernel_id === kernelId);
  return kernel;
}

export async function pingServer(): Promise<boolean> {
  let online = true;
  try {
    const response = await fetch(`${baseURL}/heartbeat`, {
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
  }
  return online;
}

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

export async function createKernel(kernelInfo: KernelInfo): Promise<boolean> {
  try {
    const response = await fetch(`${baseURL}/kernels/${kernelInfo.name}`, {
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
