/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { state as CounterState, name as CounterName } from './apps/CounterApp';
import { state as ImageState, name as ImageName } from './apps/ImageApp';
import { state as LinkerState, name as LinkerName } from './apps/LinkerApp';
import { state as NoteState, name as NoteName } from './apps/NoteApp';
import { state as SliderState, name as SliderName } from './apps/SliderApp';
import { state as StickieState, name as StickieName } from './apps/Stickie';

export type AppState = StickieState | CounterState | ImageState | LinkerState | NoteState | SliderState;

export type AppName = typeof StickieName | typeof CounterName | typeof ImageName | typeof LinkerName | typeof NoteName | typeof SliderName;
