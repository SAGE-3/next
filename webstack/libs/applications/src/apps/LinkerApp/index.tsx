export { LinkerApp as App } from './LinkerApp';

export type State = {
  toAppId: string;
  toAppField: string;
  fromAppId: string;
  fromAppField: string;
}

export const name = "Linker";