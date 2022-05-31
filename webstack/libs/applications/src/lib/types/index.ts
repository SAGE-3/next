import * as States from '../apps/types'

export type AppStates =
  States.CounterState |
  States.ImageState |
  States.LinkerState |
  States.NoteState |
  States.SliderState;

export type AppTypes =
  typeof States.CounterName |
  typeof States.ImageName |
  typeof States.LinkerName |
  typeof States.NoteName |
  typeof States.SliderName;
