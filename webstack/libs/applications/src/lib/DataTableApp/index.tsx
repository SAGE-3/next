// export { DataTableApp as App } from './DataTableApp';

export type state = {
    rows: any;
    filler: any;
    filled: any;
    filly: any;
}

export const init: Partial<state> = {
    rows: [],
    filler: '',
    filled: '',
    filly: ','
};

export const name = "DataTable";