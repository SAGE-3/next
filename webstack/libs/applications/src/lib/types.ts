import { CounterState, CounterName } from './CounterApp';
import { ImageState, ImageName } from './ImageApp';
import { LinkerState, LinkerName } from './LinkerApp';
import { NoteState, NoteName } from './NoteApp';
import { SliderState, SliderName } from './SliderApp';

export type AppStates =
  CounterState |
  ImageState |
  LinkerState |
  NoteState |
  SliderState;

export type AppTypes =
  typeof CounterName |
  typeof ImageName |
  typeof LinkerName |
  typeof NoteName |
  typeof SliderName;

export type AppSchema = {
  id: string,
  name: string,
  description: string,
  roomId: string,
  boardId: string,
  ownerId: string,
  type: AppTypes,
  state: AppStates
}
