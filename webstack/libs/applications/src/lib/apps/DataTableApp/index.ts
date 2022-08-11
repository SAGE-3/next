// import {SBPrimitive} from "../../../../../sagebase/src/lib/modules";

type exec = {
  executeFunc: string;
  params: { [key: string]: any };
}

//TODO, Replace any datatypes
export type state = {

  // Python
  executeInfo: exec;
  viewData: any;
  dataUrl: string;

  totalRows: number;
  rowsPerPage: number;
  currentPage: number;
  pageNumbers: number[];

  selectedCols: string[];
  selectedCol: string;

  selectedRows: string[];
  selectedRow: string;

  messages: string;

  timestamp: number;
};


export const init: Partial<state> = {
  executeInfo: {"executeFunc": "", "params": {}},

  viewData: {},

  totalRows: 1,
  rowsPerPage: 3,
  currentPage: 1,
  pageNumbers: [],

  selectedCols: [],
  selectedCol: "",

  selectedRows: [],
  selectedRow: "",

  timestamp: 0.0,
};


export const name = "DataTable";
