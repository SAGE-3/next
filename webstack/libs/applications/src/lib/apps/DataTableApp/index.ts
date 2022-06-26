// export { DataTableApp as App } from './DataTableApp';

// import {SBPrimitive} from "../../../../../sagebase/src/lib/modules";

export type state = {
    data: any;
};

export const init: Partial<state> = {
    data: [],
};

export const name = "DataTable";