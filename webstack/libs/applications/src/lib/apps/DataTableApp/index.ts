// import {SBPrimitive} from "../../../../../sagebase/src/lib/modules";

type exec = {
    executeFunc: string;
    params: { [key: string]: any };
}

//TODO, Replace any datatypes
export type state = {
    viewData: any;
    menuAction: string;
    tableMenuAction: string;
    timestamp: number;
    currentPage: number;
    postsPerPage: number;
    currentPosts: any[];
    totalPosts: number;

    messages: string;
    items: any[];
    loaded: boolean;
    headers: string[];
    selectedCols: string[];
    checkedItems: string[];
    dataUrl: string;
    executeInfo: exec;
};


export const init: Partial<state> = {

    loaded: false,
    selectedCols: [],
    items: [],
    headers: [],
    menuAction: "",
    tableMenuAction: "",
    timestamp: 0,
    currentPage: 1,
    postsPerPage: 3,

    executeInfo: {"executeFunc": "", "params": {}},
};


export const name = "DataTable";
