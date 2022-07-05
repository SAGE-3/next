// SAGE3 Generated from apps.json file

import { state as CounterAppState, name as CounterAppName } from './apps/CounterApp';
import { state as ImageAppState, name as ImageAppName } from './apps/ImageApp';
import { state as LinkerAppState, name as LinkerAppName } from './apps/LinkerApp';
import { state as NoteAppState, name as NoteAppName } from './apps/NoteApp';
import { state as SliderAppState, name as SliderAppName } from './apps/SliderApp';
import { state as StickieState, name as StickieName } from './apps/Stickie';
import { state as PDFViewerState, name as PDFViewerName } from './apps/PDFViewer';
import { state as CodeCellState, name as CodeCellName } from './apps/CodeCell';
import { state as ImageViewerState, name as ImageViewerName } from './apps/ImageViewer';
import { state as LeafLetState, name as LeafLetName } from './apps/LeafLet';
import { state as ScreenshareState, name as ScreenshareName } from './apps/Screenshare';
import { state as VideoViewerState, name as VideoViewerName } from './apps/VideoViewer';
import { state as WebviewState, name as WebviewName } from './apps/Webview';
import { state as DataTableAppState, name as DataTableAppName } from './apps/DataTableApp';
import { state as CSVViewerState, name as CSVViewerName } from './apps/CSVViewer';

export type AppState =
  | CounterAppState
  | ImageAppState
  | LinkerAppState
  | NoteAppState
  | SliderAppState
  | StickieState
  | PDFViewerState
  | CodeCellState
  | ImageViewerState
  | LeafLetState
  | ScreenshareState
  | VideoViewerState
  | WebviewState
  | DataTableAppState
  | CSVViewerState;

export type AppName =
  | typeof CounterAppName
  | typeof ImageAppName
  | typeof LinkerAppName
  | typeof NoteAppName
  | typeof SliderAppName
  | typeof StickieName
  | typeof PDFViewerName
  | typeof CodeCellName
  | typeof ImageViewerName
  | typeof LeafLetName
  | typeof ScreenshareName
  | typeof VideoViewerName
  | typeof WebviewName
  | typeof DataTableAppName
  | typeof CSVViewerName;
