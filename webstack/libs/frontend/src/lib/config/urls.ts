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
  assets: {
    getAssets: '/api/assets',
    getAssetById: (id: string) => `/api/assets/static/${id}`,
    getNotebookByName: (name: string) => `/api/contents/notebooks/${name}`,
    upload: '/api/assets/upload',
  },
  fastapi: {
    heartbeat: `/api/fastapi/heartbeat`,
    getKernels: `/api/fastapi/collection`,
    getKernelsSpecs: `/api/fastapi/kernelspecs`,
    getMessageStream: (msgId: string) => `/api/fastapi/status/${msgId}/stream`,
    createKernel: (name: string) => `/api/fastapi/kernels/${name}`,
    deleteKernel: (id: string) => `/api/fastapi/kernels/${id}`,
    restartKernel: (id: string) => `/api/fastapi/restart/${id}`,
    executeKernel: (id: string) => `/api/fastapi/execute/${id}`,
    statusKernel: (id: string) => `/api/fastapi/status/${id}`,
    interruptKernel: (id: string) => `/api/fastapi/interrupt/${id}`,
    nl2code: (id: string) => `/api/fastapi/nl2code/${id}`,
  },
  plugins: {
    upload: '/api/plugins/upload',
  },
  boards: {
    getBoard: (id: string) => `/api/boards/${id}`,
  },
  misc: {
    getTime: '/api/time',
    getInfo: '/api/info',
    nlp: '/api/nlp',
  },
};