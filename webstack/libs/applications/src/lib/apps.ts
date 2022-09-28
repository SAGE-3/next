// SAGE3 Generated from apps.json file

import { name as CSVViewerName } from './apps/CSVViewer';
import { name as ClockName } from './apps/Clock';
import { name as CobrowseName } from './apps/Cobrowse';
import { name as CodeCellName } from './apps/CodeCell';
import { name as CounterName } from './apps/Counter';
import { name as DataTableAppName } from './apps/DataTableApp';
import { name as DeepZoomImageName } from './apps/DeepZoomImage';
import { name as ImageViewerName } from './apps/ImageViewer';
import { name as JupyterLabName } from './apps/JupyterLab';
import { name as KernelsName } from './apps/Kernels';
import { name as LeafLetName } from './apps/LeafLet';
import { name as LinkerName } from './apps/Linker';
import { name as NotepadName } from './apps/Notepad';
import { name as PDFViewerName } from './apps/PDFViewer';
import { name as RTCChatName } from './apps/RTCChat';
import { name as ScreenshareName } from './apps/TwilioScreenshare';
import { name as StickieName } from './apps/Stickie';
import { name as VegaLiteName } from './apps/VegaLite';
import { name as VegaLiteViewerName } from './apps/VegaLiteViewer';
import { name as VideoViewerName } from './apps/VideoViewer';
import { name as WebviewName } from './apps/Webview';

import CSVViewer from './apps/CSVViewer/CSVViewer';
import Clock from './apps/Clock/Clock';
import Cobrowse from './apps/Cobrowse/Cobrowse';
import CodeCell from './apps/CodeCell/CodeCell';
import Counter from './apps/Counter/Counter';
import DataTableApp from './apps/DataTableApp/DataTableApp';
import DeepZoomImage from './apps/DeepZoomImage/DeepZoomImage';
import ImageViewer from './apps/ImageViewer/ImageViewer';
import JupyterLab from './apps/JupyterLab/JupyterLab';
import Kernels from './apps/Kernels/Kernels';
import LeafLet from './apps/LeafLet/LeafLet';
import Linker from './apps/Linker/Linker';
import Notepad from './apps/Notepad/Notepad';
import PDFViewer from './apps/PDFViewer/PDFViewer';
import RTCChat from './apps/RTCChat/RTCChat';
import Screenshare from './apps/TwilioScreenshare/TwilioScreenshare';
import Stickie from './apps/Stickie/Stickie';
import VegaLite from './apps/VegaLite/VegaLite';
import VegaLiteViewer from './apps/VegaLiteViewer/VegaLiteViewer';
import VideoViewer from './apps/VideoViewer/VideoViewer';
import Webview from './apps/Webview/Webview';

export const Applications = {
  [CSVViewerName]: CSVViewer,
  [ClockName]: Clock,
  [CobrowseName]: Cobrowse,
  [CodeCellName]: CodeCell,
  [CounterName]: Counter,
  [DataTableAppName]: DataTableApp,
  [DeepZoomImageName]: DeepZoomImage,
  [ImageViewerName]: ImageViewer,
  [JupyterLabName]: JupyterLab,
  [KernelsName]: Kernels,
  [LeafLetName]: LeafLet,
  [LinkerName]: Linker,
  [NotepadName]: Notepad,
  [PDFViewerName]: PDFViewer,
  [RTCChatName]: RTCChat,
  [ScreenshareName]: Screenshare,
  [StickieName]: Stickie,
  [VegaLiteName]: VegaLite,
  [VegaLiteViewerName]: VegaLiteViewer,
  [VideoViewerName]: VideoViewer,
  [WebviewName]: Webview,
} as unknown as Record<string, { AppComponent: () => JSX.Element; ToolbarComponent: () => JSX.Element }>;

export * from './components';
