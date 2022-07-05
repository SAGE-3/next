export { PlotsApp as App } from './PlotsApp';

export type state = {
  x: number[];
  y: number[];
}

export const init: Partial<state> = {
    x: [1,2,3,4,5],
    y: [2,4,8,16,32]
};

export const name = "Plots";