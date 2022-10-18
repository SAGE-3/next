/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { z } from 'zod';

/**
 * SAGE3 application: KernelDashboard
 * created by: SAGE3 Team
 */


// const sample_data = {
//   kernels: [
//     { id: '1', name: 'kernel1', last_activity: '2021-05-01', execution_state: 'idle', connections: true },
//     { id: '2', name: 'kernel2', last_activity: '2021-05-02', execution_state: 'busy', connections: false },
//   ],
//   sessions: [
//     { id: '1', path: 'path1', name: 'session1', type: 'notebook', kernel: { id: '1', name: 'kernel1', last_activity: '2021-05-01', execution_state: 'idle', connections: true }, notebook: { id: '1', name: 'notebook1' } },
//     { id: '2', path: 'path2', name: 'session2', type: 'console', kernel: { id: '2', name: 'kernel2', last_activity: '2021-05-02', execution_state: 'busy', connections: false }, notebook: { id: '2', name: 'notebook2' } },    
//   ],
//   kernelSpecs: {
//     default: 'python3',
//     kernelspecs: {
//       python3: {
//         name: 'python3',
//         spec: {
//           argv: ['python3', '-m', 'ipykernel_launcher', '-f', '{connection_file}'],
//           env: {},
//           display_name: 'Python 3',
//           language: 'python',
//           interrupt_mode: 'signal',
//           metadata: {},
//         },
//         resources: {},
//       },
//     },
//   }
// }


// Types
export type Kernel = {
  id: string;
  name?: string;
  last_activity?: string;
  execution_state?: string;
  connections?: boolean;
};

export type Notebook = {
  id: string;
  name: string;
};

export type Session = {
  id: string;
  path: string;
  name: string;
  type: string;
  kernel: Kernel;
  notebook: Notebook;
};

// export type KernelSpecs = {
//   default: string;
//   kernelspecs: {
//     [key: string]: {
//       name: string;
//       spec: {
//         argv: string[];
//         env: {
//           [key: string]: string;
//         };
//         display_name: string;
//         language: string;
//         interrupt_mode: string;
//         metadata: {
//           [key: string]: string;
//         };
//       };
//       resources: {
//         [key: string]: string;
//       };
//     };
//   };
// };

export type KernelSpec = {
  name: string;
  spec: {
    argv: string[];
    env: {
      [key: string]: string;
    };
    display_name: string;
    language: string;
    interrupt_mode: string;
    metadata: {
      [key: string]: string;
    };
  };
  resources: {
    [key: string]: string;
  };
};

export type KernelSpecs = [KernelSpec];  

export const schema = z.object({
  kernels: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      last_activity: z.string(),
      execution_state: z.string(),
      connections: z.boolean(),
    })
  ),
  sessions: z.array(
    z.object({
      id: z.string(),
      path: z.string(),
      name: z.string(),
      type: z.string(),
      kernel: z.object({
        id: z.string(),
        name: z.string(),
        last_activity: z.string(),
        execution_state: z.string(),
        connections: z.boolean(),
      }),
      notebook: z.object({
        id: z.string(),
        name: z.string(),
      }),
    })
  ),
  defaultKernel: z.string(),
  kernelSpecs: z.array(
    z.object({
      name: z.string(),
      spec: z.object({
        argv: z.array(z.string()),
        env: z.record(z.string(), z.string()),
        display_name: z.string(),
        language: z.string(),
        interrupt_mode: z.string(),
        metadata: z.record(z.string(), z.string()),
      }),
      resources: z.record(z.string(), z.string()),
    })
  ),
  availableKernels: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
    })
  ),
  // kernelSpecs: z.string(),
  // });
  // kernelSpecs: z.array(
  //   z.object({
  //     default: z.string(),
  //     kernelspecs: z.record(z.string(), z.object({
  //       name: z.string(),
  //       spec: z.object({
  //         argv: z.array(z.string()),
  //         env: z.record(z.string(), z.string()),
  //         display_name: z.string(),
  //         language: z.string(),
  //         interrupt_mode: z.string(),
  //         metadata: z.record(z.string(), z.string()),
  //       }),
  //       resources: z.record(z.string(), z.string()),
  //     })),
  //   })
  // ),

  // kernelSpecs: z.object({
  //   default: z.string(),
  //   kernelspecs: z.record(z.string(), z.object({
  //     name: z.string(),
  //     spec: z.object({
  //       argv: z.array(z.string()),
  //       env: z.record(z.string(), z.string()),
  //       display_name: z.string(),
  //       language: z.string(),
  //       interrupt_mode: z.string(),
  //       metadata: z.record(z.string(), z.string()),
  //     }),
  //     resources: z.record(z.string(), z.string()),
  //   })),
  // }),
  executeInfo: z.object({
    executeFunc: z.string(),
    params: z.record(z.any()),
  }),
});


export type state = z.infer<typeof schema>;


export const init: Partial<state> = {
  kernels: [],
  sessions: [],
  defaultKernel: '',
  kernelSpecs: [],
  availableKernels: [],
  executeInfo: { executeFunc: '', params: {} },
};

export const name = 'KernelDashboard';