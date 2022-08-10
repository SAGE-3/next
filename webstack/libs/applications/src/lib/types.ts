// SAGE3 Generated from apps.json file

import { state as CounterState, name as CounterName } from './apps/Counter';
import { state as LinkerAppState, name as LinkerAppName } from './apps/LinkerApp';
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
import { state as RTCChatState, name as RTCChatName } from './apps/RTCChat';
import { state as TwilioScreenshareState, name as TwilioScreenshareName } from './apps/TwilioScreenshare';
import { state as ClockState, name as ClockName } from './apps/Clock';
import { state as JupyterLabState, name as JupyterLabName } from './apps/JupyterLab';
import { state as VegaLiteViewerState, name as VegaLiteViewerName } from './apps/VegaLiteViewer';
import { state as VegaLiteState, name as VegaLiteName } from './apps/VegaLite';

export type AppState =
  | CounterState
  | LinkerAppState
  | StickieState
  | PDFViewerState
  | CodeCellState
  | ImageViewerState
  | LeafLetState
  | ScreenshareState
  | VideoViewerState
  | WebviewState
  | DataTableAppState
  | CSVViewerState
  | RTCChatState
  | VegaLiteState
  | VegaLiteViewerState
  | ClockState
  | JupyterLabState
  | TwilioScreenshareState;

export type AppName =
  | typeof CounterName
  | typeof LinkerAppName
  | typeof StickieName
  | typeof PDFViewerName
  | typeof CodeCellName
  | typeof ImageViewerName
  | typeof LeafLetName
  | typeof ScreenshareName
  | typeof VideoViewerName
  | typeof WebviewName
  | typeof DataTableAppName
  | typeof CSVViewerName
  | typeof RTCChatName
  | typeof ClockName
  | typeof JupyterLabName
  | typeof VegaLiteViewerName
  | typeof VegaLiteName
  | typeof TwilioScreenshareName;