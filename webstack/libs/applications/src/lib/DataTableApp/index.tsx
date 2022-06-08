export { DataTableApp as App } from './DataTableApp';

export type state = {
  data: any;
}

export const init: Partial<state> = {
    data: null,
};

export const name = "DataTable";