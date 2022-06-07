/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { CounterApp, CounterName } from './CounterApp';
import { ImageName } from './ImageApp';
import { LinkerName } from './LinkerApp';
import { NoteName } from './NoteApp';
import { SliderName } from './SliderApp';

import ImageApp from './ImageApp/ImageApp';
import LinkerApp from './LinkerApp/LinkerApp';
import NoteApp from './NoteApp/NoteApp';
import SliderApp from './SliderApp/SliderApp';

export const Applications = {
  [CounterName]: CounterApp,
  [ImageName]: ImageApp,
  [LinkerName]: LinkerApp,
  [NoteName]: NoteApp,
  [SliderName]: SliderApp
} as unknown as Record<string, () => JSX.Element>
