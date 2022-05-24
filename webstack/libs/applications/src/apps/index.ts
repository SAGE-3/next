
import * as counter from './CounterApp';
import * as note from './NoteApp';
import * as image from './ImageApp';
import * as slider from './SliderApp';
import * as linker from './LinkerApp';

export type AppTypes =
  typeof counter.name |
  typeof note.name |
  typeof image.name |
  typeof slider.name |
  typeof linker.name;

export type AppStates =
  counter.State |
  note.State |
  image.State |
  slider.State |
  linker.State;

export const Applications = {
  [counter.name]: counter.App,
  [note.name]: note.App,
  [image.name]: image.App,
  [slider.name]: slider.App,
  [linker.name]: linker.App
}

export type AppSchema = {
  id: string,
  name: string,
  description: string,
  roomId: string,
  boardId: string,
  ownerId: string,
  type: AppTypes
  state: AppStates
}

