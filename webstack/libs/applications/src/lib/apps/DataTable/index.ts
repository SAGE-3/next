/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { z } from 'zod';

export const schema = z.object({

  // TODO Replace any datatype
  viewData: z.any(),
  dataUrl: z.string(),
  assetid: z.string(),
  // filterInput: z.string(),

  totalRows: z.number(),
  rowsPerPage: z.number(),
  currentPage: z.number(),

  // TODO Replace. Can't be an array???
  pageNumbers: z.array(z.number()),
  indexOfFirstRow: z.number(),
  indexOfLastRow: z.number(),

  selectedCols: z.array(z.string()),
  selectedCol: z.string(),

  selectedRows: z.array(z.string()),
  selectedRow: z.string(),

  messages: z.string(),
  timestamp: z.number(),

  executeInfo: z.object({
    executeFunc: z.string(),
    params: z.record(z.any()),
  }),
});

export type state = z.infer<typeof schema>;

export const init: Partial<state> = {
  executeInfo: { executeFunc: '', params: {} },
  viewData: {},
  assetid: "",
  totalRows: 0,
  rowsPerPage: 5,
  currentPage: 1,
  dataUrl: "",
  //TODO Replace arrays
  pageNumbers: [],
  indexOfFirstRow: 0,
  indexOfLastRow: 0,
  selectedCols: [],
  selectedCol: "",
  selectedRows: [],
  selectedRow: "",
  timestamp: 0.0,
};

// type exec = {
//   executeFunc: string;
//   params: { [key: string]: any };
// }
//
// export type state = {
//
//   // Python
//   executeInfo: exec;
//   viewData: any;
//   dataUrl: string;
//   // filterInput: string;
//
//   totalRows: number;
//   rowsPerPage: number;
//   currentPage: number;
//   pageNumbers: number[];
//   indexOfFirstRow: number;
//   indexOfLastRow: number;
//
//   selectedCols: string[];
//   selectedCol: string;
//
//   selectedRows: string[];
//   selectedRow: string;
//
//   messages: string;
//
//   timestamp: number;
// };


// export const init: Partial<state> = {
//   executeInfo: {"executeFunc": "", "params": {}},
//
//   viewData: {},
//
//   totalRows: 0,
//   rowsPerPage: 5,
//   currentPage: 1,
//   pageNumbers: [],
//   indexOfFirstRow: 0,
//   indexOfLastRow: 0,
//
//   selectedCols: [],
//   selectedCol: "",
//
//   selectedRows: [],
//   selectedRow: "",
//
//   timestamp: 0.0,
// };


export const name = "DataTable";
