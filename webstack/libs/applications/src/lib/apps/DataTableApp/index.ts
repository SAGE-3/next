// import {SBPrimitive} from "../../../../../sagebase/src/lib/modules";

type exec = {
    executeFunc: string;
    params: { [key: string]: any };
}

export type state = {
    viewData: any;


    messages: string;
    items: any;
    loaded: boolean;
    headers: string[];
    clicked: boolean;
    selected: any[];
    checkedItems: string[];
    dataUrl: string;
    executeInfo: exec;

    // data: {key: any, value: any};
};


export const init: Partial<state> = {

    loaded: false,
    clicked: false,
    checkedItems: [],

    executeInfo: {"executeFunc": "", "params": {}},


    // items: [],
    // headers: [],
    // selected is some dict with column true
    // selected: {"email": false},
    // selected: [],
};


export const name = "DataTable";
