// import {SBPrimitive} from "../../../../../sagebase/src/lib/modules";

export type state = {
    tags: any[];
    messages: any;
    inputVal: any;
    items: any;
    loaded: any;
    headers: any;
    clicked: any;
    data: any;
    check: any;
    style: any;
    value: any;
    selected: any;
    checkedItems: any;
};

export const init: Partial<state> = {
    data: [],
    tags: [],
    messages: '',
    // inputVal: '',
    items: [],
    loaded: false,
    headers: [],
    clicked: false,
    check: false,
    selected: [],
    checkedItems: []
};

export const name = "DataTable";
