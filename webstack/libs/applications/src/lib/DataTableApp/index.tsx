export { DataTable as App } from './DataTable';

export type state = {
  data: any;
}

export const init: Partial<state> = {
    data: null,
};

export const name = "DataTable";