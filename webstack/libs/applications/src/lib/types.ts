/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { state as CounterState, name as CounterName } from './CounterApp';
import { state as ImageState, name as ImageName } from './ImageApp';
import { state as LinkerState, name as LinkerName } from './LinkerApp';
import { state as NoteState, name as NoteName } from './NoteApp';
import { state as SliderState, name as SliderName } from './SliderApp';

export type AppState = CounterState | ImageState | LinkerState | NoteState | SliderState;

export type AppName = typeof CounterName | typeof ImageName | typeof LinkerName | typeof NoteName | typeof SliderName;
