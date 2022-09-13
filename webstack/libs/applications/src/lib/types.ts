// SAGE3 Generated from apps.json file

import { state as AIPaneState, name as AIPaneName } from './apps/AIPane';
import { state as CounterState, name as CounterName } from './apps/Counter';
import { state as LinkerState, name as LinkerName } from './apps/Linker';
import { state as StickieState, name as StickieName } from './apps/Stickie';
import { state as PDFViewerState, name as PDFViewerName } from './apps/PDFViewer';
import { state as CodeCellState, name as CodeCellName } from './apps/CodeCell';
import { state as ImageViewerState, name as ImageViewerName } from './apps/ImageViewer';
import { state as LeafLetState, name as LeafLetName } from './apps/LeafLet';
import { state as VideoViewerState, name as VideoViewerName } from './apps/VideoViewer';
import { state as WebviewState, name as WebviewName } from './apps/Webview';
import { state as DataTableState, name as DataTableName } from './apps/DataTable';
import { state as CSVViewerState, name as CSVViewerName } from './apps/CSVViewer';
import { state as RTCChatState, name as RTCChatName } from './apps/RTCChat';
import { state as ScreenshareState, name as ScreenshareName } from './apps/TwilioScreenshare';
import { state as ClockState, name as ClockName } from './apps/Clock';
import { state as JupyterLabState, name as JupyterLabName } from './apps/JupyterLab';
import { state as CobrowseState, name as CobrowseName } from './apps/Cobrowse';
import { state as VegaLiteViewerState, name as VegaLiteViewerName } from './apps/VegaLiteViewer';
import { state as VegaLiteState, name as VegaLiteName } from './apps/VegaLite';
import { state as DeepZoomImageState, name as DeepZoomImageName } from './apps/DeepZoomImage';

export type AppState =
  | AIPaneState
  | CounterState
  | LinkerState
  | StickieState
  | PDFViewerState
  | CodeCellState
  | ImageViewerState
  | LeafLetState
  | VideoViewerState
  | WebviewState
  | DataTableState
  | CSVViewerState
  | RTCChatState
  | ScreenshareState
  | ClockState
  | CobrowseState
  | JupyterLabState
  | VegaLiteViewerState
  | VegaLiteState
  | DeepZoomImageState;

export type AppName =
  | typeof AIPaneName
  | typeof CounterName
  | typeof LinkerName
  | typeof StickieName
  | typeof PDFViewerName
  | typeof CodeCellName
  | typeof ImageViewerName
  | typeof LeafLetName
  | typeof VideoViewerName
  | typeof WebviewName
  | typeof DataTableName
  | typeof CSVViewerName
  | typeof RTCChatName
  | typeof ScreenshareName
  | typeof ClockName
  | typeof CobrowseName
  | typeof JupyterLabName
  | typeof VegaLiteViewerName
  | typeof VegaLiteName
  | typeof DeepZoomImageName;
