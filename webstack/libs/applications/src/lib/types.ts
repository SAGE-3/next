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
import { state as PlotsState, name as PlotsName } from './PlotsApp';
import { state as DataTableState, name as DataTableName } from './DataTableApp';

export type AppState = CounterState | ImageState | LinkerState | NoteState | SliderState | PlotsState | DataTableState;

export type AppName = typeof CounterName | typeof ImageName | typeof LinkerName | typeof NoteName | typeof SliderName | typeof PlotsName | typeof DataTableName;
