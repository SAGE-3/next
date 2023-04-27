// SAGE3 Generated from apps.json file

import { state as AIPaneState, name as AIPaneName } from './apps/AIPane';
import { state as CSVViewerState, name as CSVViewerName } from './apps/CSVViewer';
import { state as ChartGeneratorState, name as ChartGeneratorName } from './apps/ChartGenerator';
import { state as ChartMakerState, name as ChartMakerName } from './apps/ChartMaker';
import { state as ClockState, name as ClockName } from './apps/Clock';
import { state as CobrowseState, name as CobrowseName } from './apps/Cobrowse';
import { state as CounterState, name as CounterName } from './apps/Counter';
import { state as DataTableState, name as DataTableName } from './apps/DataTable';
import { state as DeepZoomImageState, name as DeepZoomImageName } from './apps/DeepZoomImage';
import { state as GLTFViewerState, name as GLTFViewerName } from './apps/GLTFViewer';
import { state as HCDPState, name as HCDPName } from './apps/HCDP';
import { state as ImageViewerState, name as ImageViewerName } from './apps/ImageViewer';
import { state as JupyterLabState, name as JupyterLabName } from './apps/JupyterLab';
import { state as KernelsState, name as KernelsName } from './apps/Kernels';
import { state as LeafLetState, name as LeafLetName } from './apps/LeafLet';
import { state as LinkerState, name as LinkerName } from './apps/Linker';
import { state as NotepadState, name as NotepadName } from './apps/Notepad';
import { state as PDFResultState, name as PDFResultName } from './apps/PDFResult';
import { state as PDFViewerState, name as PDFViewerName } from './apps/PDFViewer';
import { state as PluginAppState, name as PluginAppName } from './apps/PluginApp';
import { state as RTCChatState, name as RTCChatName } from './apps/RTCChat';
import { state as SageCellState, name as SageCellName } from './apps/SageCell';
import { state as SeerState, name as SeerName } from './apps/Seer';
import { state as SensorOverviewState, name as SensorOverviewName } from './apps/SensorOverview';
import { state as StickieState, name as StickieName } from './apps/Stickie';
import { state as TwilioScreenshareState, name as TwilioScreenshareName } from './apps/TwilioScreenshare';
import { state as VegaLiteState, name as VegaLiteName } from './apps/VegaLite';
import { state as VegaLiteViewerState, name as VegaLiteViewerName } from './apps/VegaLiteViewer';
import { state as VideoViewerState, name as VideoViewerName } from './apps/VideoViewer';
import { state as WebviewState, name as WebviewName } from './apps/Webview';


export type AppState =
  | {}
  | AIPaneState
  | CSVViewerState
  | ChartGeneratorState
  | ChartMakerState
  | ClockState
  | CobrowseState
  | CounterState
  | DataTableState
  | DeepZoomImageState
  | GLTFViewerState
  | HCDPState
  | ImageViewerState
  | JupyterLabState
  | KernelsState
  | LeafLetState
  | LinkerState
  | NotepadState
  | PDFResultState
  | PDFViewerState
  | PluginAppState
  | RTCChatState
  | SageCellState
  | SeerState
  | SensorOverviewState
  | StickieState
  | TwilioScreenshareState
  | VegaLiteState
  | VegaLiteViewerState
  | VideoViewerState
  | WebviewState;


export type AppName = typeof AIPaneName | typeof CSVViewerName | typeof ChartGeneratorName | typeof ChartMakerName | typeof ClockName | typeof CobrowseName | typeof CounterName | typeof DataTableName | typeof DeepZoomImageName | typeof GLTFViewerName | typeof HCDPName | typeof ImageViewerName | typeof JupyterLabName | typeof KernelsName | typeof LeafLetName | typeof LinkerName | typeof NotepadName | typeof PDFResultName | typeof PDFViewerName | typeof PluginAppName | typeof RTCChatName | typeof SageCellName | typeof SeerName | typeof SensorOverviewName | typeof StickieName | typeof TwilioScreenshareName | typeof VegaLiteName | typeof VegaLiteViewerName | typeof VideoViewerName | typeof WebviewName;