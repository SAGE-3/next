// SAGE3 Generated from apps.json file

import { name as CounterName, init as defaultCounter } from './apps/Counter';
import { name as GrouperName, init as defaultGrouper } from './apps/Grouper';
import { name as LinkerName, init as defaultLinker } from './apps/Linker';
import { name as StickieName, init as defaultStickie } from './apps/Stickie';
import { name as PDFViewerName, init as defaultPDFViewer } from './apps/PDFViewer';
import { name as CodeCellName, init as defaultCodeCell } from './apps/CodeCell';
import { name as ImageViewerName, init as defaultImageViewer } from './apps/ImageViewer';
import { name as LeafLetName, init as defaultLeafLet } from './apps/LeafLet';
import { name as VideoViewerName, init as defaultVideoViewer } from './apps/VideoViewer';
import { name as WebviewName, init as defaultWebview } from './apps/Webview';
import { name as DataTableAppName, init as defaultDataTableApp } from './apps/DataTableApp';
import { name as CSVViewerName, init as defaultCSVViewer } from './apps/CSVViewer';
import { name as RTCChatName, init as defaultRTCChat } from './apps/RTCChat';
import { name as ScreenshareName, init as defaultScreenshare } from './apps/TwilioScreenshare';
import { name as ClockName, init as defaultClock } from './apps/Clock';
import { name as CobrowseName, init as defaultCobrowse } from './apps/Cobrowse';
import { name as JupyterLabName, init as defaultJupyterLab } from './apps/JupyterLab';
import { name as VegaLiteViewerName, init as defaultVegaLiteViewer } from './apps/VegaLiteViewer';
import { name as VegaLiteName, init as defaultVegaLite } from './apps/VegaLite';
import { name as ZoomName, init as defaultZoom } from './apps/Zoom';

import Counter from './apps/Counter/Counter';
import Grouper from './apps/Grouper/Grouper';
import Linker from './apps/Linker/Linker';
import Stickie from './apps/Stickie/Stickie';
import PDFViewer from './apps/PDFViewer/PDFViewer';
import CodeCell from './apps/CodeCell/CodeCell';
import ImageViewer from './apps/ImageViewer/ImageViewer';
import LeafLet from './apps/LeafLet/LeafLet';
import VideoViewer from './apps/VideoViewer/VideoViewer';
import Webview from './apps/Webview/Webview';
import DataTableApp from './apps/DataTableApp/DataTableApp';
import CSVViewer from './apps/CSVViewer/CSVViewer';
import RTCChat from './apps/RTCChat/RTCChat';
import Screenshare from './apps/TwilioScreenshare/TwilioScreenshare';
import Clock from './apps/Clock/Clock';
import Cobrowse from './apps/Cobrowse/Cobrowse';
import JupyterLab from './apps/JupyterLab/JupyterLab';
import VegaLiteViewer from './apps/VegaLiteViewer/VegaLiteViewer';
import VegaLite from './apps/VegaLite/VegaLite';
import Zoom from './apps/Zoom/Zoom';

export const Applications = {
  [GrouperName]: Grouper,
  [CounterName]: Counter,
  [LinkerName]: Linker,
  [StickieName]: Stickie,
  [PDFViewerName]: PDFViewer,
  [CodeCellName]: CodeCell,
  [ImageViewerName]: ImageViewer,
  [LeafLetName]: LeafLet,
  [VideoViewerName]: VideoViewer,
  [WebviewName]: Webview,
  [DataTableAppName]: DataTableApp,
  [CSVViewerName]: CSVViewer,
  [RTCChatName]: RTCChat,
  [ScreenshareName]: Screenshare,
  [ClockName]: Clock,
  [CobrowseName]: Cobrowse,
  [JupyterLabName]: JupyterLab,
  [VegaLiteViewerName]: VegaLiteViewer,
  [VegaLiteName]: VegaLite,
  [ZoomName]: Zoom,
} as unknown as Record<string, { AppComponent: () => JSX.Element; ToolbarComponent: () => JSX.Element }>;

export const initialValues = {
  [GrouperName]: defaultGrouper,
  [CounterName]: defaultCounter,
  [LinkerName]: defaultLinker,
  [StickieName]: defaultStickie,
  [PDFViewerName]: defaultPDFViewer,
  [CodeCellName]: defaultCodeCell,
  [ImageViewerName]: defaultImageViewer,
  [LeafLetName]: defaultLeafLet,
  [VideoViewerName]: defaultVideoViewer,
  [WebviewName]: defaultWebview,
  [DataTableAppName]: defaultDataTableApp,
  [CSVViewerName]: defaultCSVViewer,
  [RTCChatName]: defaultRTCChat,
  [ScreenshareName]: defaultScreenshare,
  [ClockName]: defaultClock,
  [CobrowseName]: defaultCobrowse,
  [JupyterLabName]: defaultJupyterLab,
  [VegaLiteViewerName]: defaultVegaLiteViewer,
  [VegaLiteName]: defaultVegaLite,
  [ZoomName]: defaultZoom,
};

export * from './components';
