/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { name as CounterName } from './apps/Counter';
import { name as LinkerName } from './apps/Linker';
import { name as StickieName } from './apps/Stickie';
import { name as PDFViewerName } from './apps/PDFViewer';
import { name as CodeCellName } from './apps/CodeCell';
import { name as ImageViewerName } from './apps/ImageViewer';
import { name as LeafLetName } from './apps/LeafLet';
import { name as VideoViewerName } from './apps/VideoViewer';
import { name as WebviewName } from './apps/Webview';
import { name as DataTableAppName } from './apps/DataTableApp';
import { name as CSVViewerName } from './apps/CSVViewer';
import { name as RTCChatName } from './apps/RTCChat';
import { name as ScreenshareName } from './apps/TwilioScreenshare';
import { name as VegaLiteViewerName } from './apps/VegaLiteViewer';
import { name as VegaLiteName } from './apps/VegaLite';
import { name as ClockName } from './apps/Clock';
import { name as CobrowseName } from './apps/Cobrowse';
import { name as JupyterLabName } from './apps/JupyterLab';
import { name as DeepZoomImageName } from './apps/DeepZoomImage';
import { name as NotepadName } from './apps/Notepad';

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
import Screenshare from './apps/TwilioScreenshare/TwilioScreenshare';
import Clock from './apps/Clock/Clock';
import Cobrowse from './apps/Cobrowse/Cobrowse';
import JupyterLab from './apps/JupyterLab/JupyterLab';
import VegaLiteViewer from './apps/VegaLiteViewer/VegaLiteViewer';
import VegaLite from './apps/VegaLite/VegaLite';
import DeepZoomImage from './apps/DeepZoomImage/DeepZoomImage';
import Notepad from './apps/Notepad/Notepad';

export const Applications = {
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
  [DeepZoomImageName]: DeepZoomImage,
  [NotepadName]: Notepad,
} as unknown as Record<string, { AppComponent: () => JSX.Element; ToolbarComponent: () => JSX.Element }>;

export * from './components';
