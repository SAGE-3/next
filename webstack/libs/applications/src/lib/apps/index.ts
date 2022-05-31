/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { AppTypes } from '../types';

import { CounterApp } from './CounterApp/CounterApp';
import { ImageApp } from './ImageApp/ImageApp';
import { LinkerApp } from './LinkerApp/LinkerApp';
import { NoteApp } from './NoteApp/NoteApp';
import { SliderApp } from './SliderApp/SliderApp';

export const Applications = {
  'Counter': CounterApp,
  'Image': ImageApp,
  'Linker': LinkerApp,
  'Note': NoteApp,
  'Slider': SliderApp

} as Record<AppTypes, () => JSX.Element>


