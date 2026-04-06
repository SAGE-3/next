/**
 * Copyright (c) SAGE3 Development Team 2023. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

/**
 * All the routes for the frontend
 */
export const apiUrls = {
  config: {
    getConfig: '/api/configuration',
  },
  apps: {
    preview: '/api/apps/preview',
  },
  assets: {
    getAssets: '/api/assets',
    getAssetById: (id: string) => `/api/assets/static/${id}`,
    getPublicURL: (id: string, token: string) => `/api/files/${id}/${token}`,
    getDownloadURL: (url: string) => `/api/files/download/${encodeURIComponent(url)}`,
    getNotebookByName: (name: string) => `/api/contents/notebooks/${name}`,
    upload: '/api/assets/upload',
  },
  kernels: {
    heartbeat: `/api/kernels/heartbeat`,
    getKernels: `/api/kernels/collection`,
    getKernelsSpecs: `/api/kernels/kernelspecs`,
    getMessageStream: (msgId: string) => `/api/kernels/status/${msgId}/stream`,
    createKernel: (name: string) => `/api/kernels/kernels/${name}`,
    deleteKernel: (id: string) => `/api/kernels/kernels/${id}`,
    restartKernel: (id: string) => `/api/kernels/restart/${id}`,
    executeKernel: (id: string) => `/api/kernels/execute/${id}`,
    statusKernel: (id: string) => `/api/kernels/status/${id}`,
    interruptKernel: (id: string) => `/api/kernels/interrupt/${id}`,
  },
  plugins: {
    upload: '/api/plugins/upload',
  },
  boards: {
    getBoards: () => `/api/boards`,
    getBoard: (id: string) => `/api/boards/${id}`,
  },
  misc: {
    getTime: '/api/time',
    getInfo: '/api/info',
    nlp: '/api/nlp',
  },
  ai: {
    agents: {
      base: '/api/agents',
      status: '/api/agents/status',
      ask: '/api/agents/ask',
      summary: '/api/agents/summary',
    },
  },
};
