// import {SBPrimitive} from "../../../../../sagebase/src/lib/modules";

type exec = {
    executeFunc: string;
    params: { [key: string]: any };
}

export type state = {
    executeInfo: exec;

    messages: string;
    inputVal: string;
    items: any;
    loaded: boolean;
    headers: string[];
    clicked: boolean;
    selected: any[];
    checkedItems: string[];
    // data: {key: any, value: any};
};


export const init: Partial<state> = {
    executeInfo: {"executeFunc": "", "params": {}},

    loaded: false,
    clicked: false,
    checkedItems: [],

    // items: [],
    // headers: [],
    // selected is some dict with column true
    // selected: {"email": false},
    // selected: [],
};


export const name = "DataTable";
