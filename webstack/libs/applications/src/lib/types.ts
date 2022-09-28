// SAGE3 Generated from apps.json file

import { state as CSVViewerState, name as CSVViewerName } from './apps/CSVViewer';
import { state as ClockState, name as ClockName } from './apps/Clock';
import { state as CobrowseState, name as CobrowseName } from './apps/Cobrowse';
import { state as CodeCellState, name as CodeCellName } from './apps/CodeCell';
import { state as CounterState, name as CounterName } from './apps/Counter';
import { state as DataTableAppState, name as DataTableAppName } from './apps/DataTableApp';
import { state as DeepZoomImageState, name as DeepZoomImageName } from './apps/DeepZoomImage';
import { state as ImageViewerState, name as ImageViewerName } from './apps/ImageViewer';
import { state as JupyterLabState, name as JupyterLabName } from './apps/JupyterLab';
import { state as KernelsState, name as KernelsName } from './apps/Kernels';
import { state as LeafLetState, name as LeafLetName } from './apps/LeafLet';
import { state as LinkerState, name as LinkerName } from './apps/Linker';
import { state as NotepadState, name as NotepadName } from './apps/Notepad';
import { state as PDFViewerState, name as PDFViewerName } from './apps/PDFViewer';
import { state as RTCChatState, name as RTCChatName } from './apps/RTCChat';
import { state as ScreenshareState, name as ScreenshareName } from './apps/Screenshare';
import { state as StickieState, name as StickieName } from './apps/Stickie';
import { state as VegaLiteState, name as VegaLiteName } from './apps/VegaLite';
import { state as VegaLiteViewerState, name as VegaLiteViewerName } from './apps/VegaLiteViewer';
import { state as VideoViewerState, name as VideoViewerName } from './apps/VideoViewer';
import { state as WebviewState, name as WebviewName } from './apps/Webview';


export type AppState = CSVViewerState | ClockState | CobrowseState | CodeCellState | CounterState | DataTableAppState | DeepZoomImageState | ImageViewerState | JupyterLabState | KernelsState | LeafLetState | LinkerState | NotepadState | PDFViewerState | RTCChatState | ScreenshareState | StickieState | VegaLiteState | VegaLiteViewerState | VideoViewerState | WebviewState;

export type AppName = typeof CSVViewerName | typeof ClockName | typeof CobrowseName | typeof CodeCellName | typeof CounterName | typeof DataTableAppName | typeof DeepZoomImageName | typeof ImageViewerName | typeof JupyterLabName | typeof KernelsName | typeof LeafLetName | typeof LinkerName | typeof NotepadName | typeof PDFViewerName | typeof RTCChatName | typeof ScreenshareName | typeof StickieName | typeof VegaLiteName | typeof VegaLiteViewerName | typeof VideoViewerName | typeof WebviewName;