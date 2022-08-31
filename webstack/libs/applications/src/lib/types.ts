// SAGE3 Generated from apps.json file

import { state as CounterState, name as CounterName } from './apps/Counter';
import { state as LinkerState, name as LinkerName } from './apps/Linker';
import { state as StickieState, name as StickieName } from './apps/Stickie';
import { state as PDFViewerState, name as PDFViewerName } from './apps/PDFViewer';
import { state as CodeCellState, name as CodeCellName } from './apps/CodeCell';
import { state as ImageViewerState, name as ImageViewerName } from './apps/ImageViewer';
import { state as LeafLetState, name as LeafLetName } from './apps/LeafLet';
import { state as VideoViewerState, name as VideoViewerName } from './apps/VideoViewer';
import { state as WebviewState, name as WebviewName } from './apps/Webview';
import { state as DataTableAppState, name as DataTableAppName } from './apps/DataTableApp';
import { state as CSVViewerState, name as CSVViewerName } from './apps/CSVViewer';
import { state as RTCChatState, name as RTCChatName } from './apps/RTCChat';
import { state as ScreenshareState, name as ScreenshareName } from './apps/Screenshare';
import { state as ClockState, name as ClockName } from './apps/Clock';
import { state as CoBrowseState, name as CoBrowseName } from './apps/CoBrowse';
import { state as JupyterLabState, name as JupyterLabName } from './apps/JupyterLab';
import { state as VegaLiteViewerState, name as VegaLiteViewerName } from './apps/VegaLiteViewer';
import { state as VegaLiteState, name as VegaLiteName } from './apps/VegaLite';
import { state as ZoomState, name as ZoomName } from './apps/Zoom';

export type AppState =
  | CounterState
  | LinkerState
  | StickieState
  | PDFViewerState
  | CodeCellState
  | ImageViewerState
  | LeafLetState
  | VideoViewerState
  | WebviewState
  | DataTableAppState
  | CSVViewerState
  | RTCChatState
  | ScreenshareState
  | ClockState
  | CoBrowseState
  | JupyterLabState
  | VegaLiteViewerState
  | VegaLiteState
  | ZoomState;

export type AppName =
  | typeof CounterName
  | typeof LinkerName
  | typeof StickieName
  | typeof PDFViewerName
  | typeof CodeCellName
  | typeof ImageViewerName
  | typeof LeafLetName
  | typeof VideoViewerName
  | typeof WebviewName
  | typeof DataTableAppName
  | typeof CSVViewerName
  | typeof RTCChatName
  | typeof ScreenshareName
  | typeof ClockName
  | typeof CoBrowseName
  | typeof JupyterLabName
  | typeof VegaLiteViewerName
  | typeof VegaLiteName
  | typeof ZoomName;
