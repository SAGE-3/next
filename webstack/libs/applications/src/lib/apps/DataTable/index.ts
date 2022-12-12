// import {SBPrimitive} from "../../../../../sagebase/src/lib/modules";

type exec = {
  executeFunc: string;
  params: { [key: string]: any };
};

//TODO, Replace any datatypes
export type state = {
  // Python
  executeInfo: exec;
  viewData: any;
  dataUrl: string;
  // filterInput: string;

  totalRows: number;
  rowsPerPage: number;
  currentPage: number;
  pageNumbers: number[];
  indexOfFirstRow: number;
  indexOfLastRow: number;
  selectedCols: string[];
  selectedCol: string;
  selectedRows: string[];
  selectedRow: string;
  messages: string;
  timestamp: number;
};

export const init: Partial<state> = {
  executeInfo: { executeFunc: '', params: {} },

  viewData: {},

  totalRows: 0,
  rowsPerPage: 5,
  currentPage: 1,
  pageNumbers: [],
  indexOfFirstRow: 0,
  indexOfLastRow: 0,

  selectedCols: [],
  selectedCol: '',

  selectedRows: [],
  selectedRow: '',

  timestamp: 0.0,
};

export const name = 'DataTable';
