import { CounterState, CounterName } from './counter';
import { ImageState, ImageName } from './image';
import { LinkerState, LinkerName } from './linker';
import { NoteState, NoteName } from './note';
import { SliderState, SliderName } from './slider';

export { CounterState, ImageState, LinkerState, NoteState, SliderState }

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
