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
  totalPages: number;
  currentPage: number;
  currentRows: any[];

  selectedCols: string[];
  messages: string;

  timestamp: number;


  // Client
  pageNumberArr: number[];

};


export const init: Partial<state> = {
  executeInfo: {"executeFunc": "", "params": {}},

  viewData: {},
  selectedCols: [],

  timestamp: 0.0,
  totalRows: 1,
  rowsPerPage: 3,
  currentPage: 1,

};


export const name = "DataTable";
