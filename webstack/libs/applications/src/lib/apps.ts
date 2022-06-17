// SAGE3 Generated from apps.json file

import { name as CounterAppName, init as defaultCounterApp } from './apps/CounterApp';
import { name as ImageAppName, init as defaultImageApp } from './apps/ImageApp';
import { name as LinkerAppName, init as defaultLinkerApp } from './apps/LinkerApp';
import { name as NoteAppName, init as defaultNoteApp } from './apps/NoteApp';
import { name as SliderAppName, init as defaultSliderApp } from './apps/SliderApp';
import { name as StickieName, init as defaultStickie } from './apps/Stickie';
import { name as PDFViewerName, init as defaultPDFViewer } from './apps/PDFViewer';


import CounterApp from './apps/CounterApp/CounterApp';
import ImageApp from './apps/ImageApp/ImageApp';
import LinkerApp from './apps/LinkerApp/LinkerApp';
import NoteApp from './apps/NoteApp/NoteApp';
import SliderApp from './apps/SliderApp/SliderApp';
import Stickie from './apps/Stickie/Stickie';
import PDFViewer from './apps/PDFViewer/PDFViewer';


export const Applications = {
  [CounterAppName]: CounterApp,
  [ImageAppName]: ImageApp,
  [LinkerAppName]: LinkerApp,
  [NoteAppName]: NoteApp,
  [SliderAppName]: SliderApp,
  [StickieName]: Stickie,
  [PDFViewerName]: PDFViewer,
} as unknown as Record<string, () => JSX.Element>;


export const initialValues = {
  [CounterAppName]: defaultCounterApp,
  [ImageAppName]: defaultImageApp,
  [LinkerAppName]: defaultLinkerApp,
  [NoteAppName]: defaultNoteApp,
  [SliderAppName]: defaultSliderApp,
  [StickieName]: defaultStickie,
  [PDFViewerName]: defaultPDFViewer,
};
