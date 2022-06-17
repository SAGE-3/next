// SAGE3 Generated from apps.json file

import { state as CounterAppState, name as CounterAppName } from './apps/CounterApp';
import { state as ImageAppState, name as ImageAppName } from './apps/ImageApp';
import { state as LinkerAppState, name as LinkerAppName } from './apps/LinkerApp';
import { state as NoteAppState, name as NoteAppName } from './apps/NoteApp';
import { state as SliderAppState, name as SliderAppName } from './apps/SliderApp';
import { state as StickieState, name as StickieName } from './apps/Stickie';
import { state as PDFViewerState, name as PDFViewerName } from './apps/PDFViewer';


export type AppState = CounterAppState | ImageAppState | LinkerAppState | NoteAppState | SliderAppState | StickieState | PDFViewerState;

export type AppName = typeof CounterAppName | typeof ImageAppName | typeof LinkerAppName | typeof NoteAppName | typeof SliderAppName | typeof StickieName | typeof PDFViewerName;