/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { name as CounterName, init as defaultCounter } from './apps/CounterApp';
import { name as ImageName, init as defaultImage } from './apps/ImageApp';
import { name as LinkerName, init as defaultLinker } from './apps/LinkerApp';
import { name as NoteName, init as defaultNote } from './apps/NoteApp';
import { name as SliderName, init as defaultSlider } from './apps/SliderApp';
import { name as StickieName, init as defaultStickie } from './apps/Stickie';

import CounterApp from './apps/CounterApp/CounterApp';
import ImageApp from './apps/ImageApp/ImageApp';
import LinkerApp from './apps/LinkerApp/LinkerApp';
import NoteApp from './apps/NoteApp/NoteApp';
import SliderApp from './apps/SliderApp/SliderApp';
import Stickie from './apps/Stickie/Stickie';

export const Applications = {
  [CounterName]: CounterApp,
  [ImageName]: ImageApp,
  [LinkerName]: LinkerApp,
  [NoteName]: NoteApp,
  [SliderName]: SliderApp,
  [StickieName]: Stickie,
} as unknown as Record<string, () => JSX.Element>;

export const initialValues = {
  [CounterName]: defaultCounter,
  [ImageName]: defaultImage,
  [LinkerName]: defaultLinker,
  [NoteName]: defaultNote,
  [SliderName]: defaultSlider,
  [StickieName]: defaultStickie,
};
