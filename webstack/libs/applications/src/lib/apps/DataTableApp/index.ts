// import {SBPrimitive} from "../../../../../sagebase/src/lib/modules";

type exec = {
    executeFunc: string;
    params: { [key: string]: any };
}

export type state = {
    viewData: any;
    menuAction: string;
    tableMenuAction: string;
    timestamp: number;

    messages: string;
    items: any;
    loaded: boolean;
    headers: string[];
    clicked: boolean;
    selected: string[];
    checkedItems: string[];
    dataUrl: string;
    executeInfo: exec;
};


export const init: Partial<state> = {

    loaded: false,
    // clicked: false,
    selected: [],
    items: [],
    headers: [],
    menuAction: "",
    tableMenuAction: "",
    timestamp: 0,

    executeInfo: {"executeFunc": "", "params": {}},
};


export const name = "DataTable";
