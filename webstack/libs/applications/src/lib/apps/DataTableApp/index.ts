// export { DataTableApp as App } from './DataTableApp';

// import {SBPrimitive} from "../../../../../sagebase/src/lib/modules";

import {useState} from "react";

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
};

export const init: Partial<state> = {
    data: [],
    tags: [],
    messages: '',
    inputVal: '',
    items: [],
    loaded: false,
    headers: [],
    clicked: false,
    check: false,
};

export const name = "DataTable";
