// SAGE3 Generated from apps.json file

import { name as AIPaneName } from './apps/AIPane';
import { name as CSVViewerName } from './apps/CSVViewer';
import { name as ClockName } from './apps/Clock';
import { name as CobrowseName } from './apps/Cobrowse';
import { name as CodeCellName } from './apps/CodeCell';
import { name as CounterName } from './apps/Counter';
import { name as DataTableName } from './apps/DataTable';
import { name as DataTableAppName } from './apps/DataTableApp';
import { name as DeepZoomImageName } from './apps/DeepZoomImage';
import { name as GLTFViewerName } from './apps/GLTFViewer';
import { name as ImageViewerName } from './apps/ImageViewer';
import { name as JupyterLabName } from './apps/JupyterLab';
import { name as KernelsName } from './apps/Kernels';
import { name as LeafLetName } from './apps/LeafLet';
import { name as LinkerName } from './apps/Linker';
import { name as NotepadName } from './apps/Notepad';
import { name as PDFViewerName } from './apps/PDFViewer';
import { name as RTCChatName } from './apps/RTCChat';
import { name as ScreenshareName } from './apps/Screenshare';
import { name as StickieName } from './apps/Stickie';
import { name as TwilioScreenshareName } from './apps/TwilioScreenshare';
import { name as VegaLiteName } from './apps/VegaLite';
import { name as VegaLiteViewerName } from './apps/VegaLiteViewer';
import { name as VideoViewerName } from './apps/VideoViewer';
import { name as WebviewName } from './apps/Webview';


import AIPane from './apps/AIPane/AIPane';
import CSVViewer from './apps/CSVViewer/CSVViewer';
import Clock from './apps/Clock/Clock';
import Cobrowse from './apps/Cobrowse/Cobrowse';
import CodeCell from './apps/CodeCell/CodeCell';
import Counter from './apps/Counter/Counter';
import DataTable from './apps/DataTable/DataTable';
import DataTableApp from './apps/DataTableApp/DataTableApp';
import DeepZoomImage from './apps/DeepZoomImage/DeepZoomImage';
import GLTFViewer from './apps/GLTFViewer/GLTFViewer';
import ImageViewer from './apps/ImageViewer/ImageViewer';
import JupyterLab from './apps/JupyterLab/JupyterLab';
import Kernels from './apps/Kernels/Kernels';
import LeafLet from './apps/LeafLet/LeafLet';
import Linker from './apps/Linker/Linker';
import Notepad from './apps/Notepad/Notepad';
import PDFViewer from './apps/PDFViewer/PDFViewer';
import RTCChat from './apps/RTCChat/RTCChat';
import Screenshare from './apps/Screenshare/Screenshare';
import Stickie from './apps/Stickie/Stickie';
import TwilioScreenshare from './apps/TwilioScreenshare/TwilioScreenshare';
import VegaLite from './apps/VegaLite/VegaLite';
import VegaLiteViewer from './apps/VegaLiteViewer/VegaLiteViewer';
import VideoViewer from './apps/VideoViewer/VideoViewer';
import Webview from './apps/Webview/Webview';


export const Applications = {
  [AIPaneName]: AIPane,
  [CSVViewerName]: CSVViewer,
  [ClockName]: Clock,
  [CobrowseName]: Cobrowse,
  [CodeCellName]: CodeCell,
  [CounterName]: Counter,
  [DataTableName]: DataTable,
  [DataTableAppName]: DataTableApp,
  [DeepZoomImageName]: DeepZoomImage,
  [GLTFViewerName]: GLTFViewer,
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
  [TwilioScreenshareName]: TwilioScreenshare,
  [VegaLiteName]: VegaLite,
  [VegaLiteViewerName]: VegaLiteViewer,
  [VideoViewerName]: VideoViewer,
  [WebviewName]: Webview,
} as unknown as Record<string, { AppComponent: () => JSX.Element, ToolbarComponent: () => JSX.Element }>;

export * from './components';
