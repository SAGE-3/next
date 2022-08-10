// SAGE3 Generated from apps.json file

import { name as CounterAppName, init as defaultCounterApp } from './apps/Counter';
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
import { name as TwilioScreenshareName, init as defaultTwilioScreenshare } from './apps/TwilioScreenshare';
import { name as VegaLiteViewerName, init as defaultVegaLiteViewer } from './apps/VegaLiteViewer';
import { name as VegaLiteName, init as defaultVegaLiteApp } from './apps/VegaLite';
import { name as ClockName, init as defaultClock } from './apps/Clock';
import { name as JupyterLabName, init as defaultJupyterLab } from './apps/JupyterLab';

import Counter from './apps/Counter/Counter';
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
import TwilioScreenshare from './apps/TwilioScreenshare/TwilioScreenshare';
import VegaLiteViewer from './apps/VegaLiteViewer/VegaLiteViewer';
import VegaLite from './apps/VegaLite/VegaLite';
import Clock from './apps/Clock/Clock';
import JupyterLab from './apps/JupyterLab/JupyterLab';

export const Applications = {
  [CounterAppName]: Counter,
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
  [TwilioScreenshareName]: TwilioScreenshare,
  [ClockName]: Clock,
  [JupyterLabName]: JupyterLab,
  [VegaLiteViewerName]: VegaLiteViewer,
  [VegaLiteName]: VegaLite,
} as unknown as Record<string, { AppComponent: () => JSX.Element; ToolbarComponent: () => JSX.Element }>;

export const initialValues = {
  [CounterAppName]: defaultCounterApp,
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
  [TwilioScreenshareName]: defaultTwilioScreenshare,
  [VegaLiteViewerName]: defaultVegaLiteViewer,
  [VegaLiteName]: defaultVegaLiteApp,
  [ClockName]: defaultClock,
  [JupyterLabName]: defaultJupyterLab,
};

export * from './components';
