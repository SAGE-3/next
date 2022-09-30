/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { name as AIPaneName, init as defaultAIPane } from './apps/AIPane';
import { name as CounterAppName, init as defaultCounterApp } from './apps/Counter';
import { name as LinkerName, init as defaultLinker } from './apps/Linker';
import { name as StickieName, init as defaultStickie } from './apps/Stickie';
import { name as PDFViewerName, init as defaultPDFViewer } from './apps/PDFViewer';
import { name as CodeCellName, init as defaultCodeCell } from './apps/CodeCell';
import { name as ImageViewerName, init as defaultImageViewer } from './apps/ImageViewer';
import { name as LeafLetName, init as defaultLeafLet } from './apps/LeafLet';
import { name as VideoViewerName, init as defaultVideoViewer } from './apps/VideoViewer';
import { name as WebviewName, init as defaultWebview } from './apps/Webview';
import { name as DataTableName, init as defaultDataTable } from './apps/DataTable';
import { name as CSVViewerName, init as defaultCSVViewer } from './apps/CSVViewer';
import { name as RTCChatName, init as defaultRTCChat } from './apps/RTCChat';
import { name as ScreenshareName, init as defaultScreenshare } from './apps/TwilioScreenshare';
import { name as VegaLiteViewerName, init as defaultVegaLiteViewer } from './apps/VegaLiteViewer';
import { name as VegaLiteName, init as defaultVegaLite } from './apps/VegaLite';
import { name as ClockName, init as defaultClock } from './apps/Clock';
import { name as CobrowseName, init as defaultCobrowse } from './apps/Cobrowse';
import { name as JupyterLabName, init as defaultJupyterLab } from './apps/JupyterLab';
import { name as DeepZoomImageName, init as defaultDeepZoomImage } from './apps/DeepZoomImage';
import { name as NotepadName, init as defaultNotepad } from './apps/Notepad';
import { name as GLTFViewerName, init as defaultGLTFViewer } from './apps/GLTFViewer';

export const initialValues = {
  [AIPaneName]: defaultAIPane,
  [CounterAppName]: defaultCounterApp,
  [LinkerName]: defaultLinker,
  [StickieName]: defaultStickie,
  [PDFViewerName]: defaultPDFViewer,
  [CodeCellName]: defaultCodeCell,
  [ImageViewerName]: defaultImageViewer,
  [LeafLetName]: defaultLeafLet,
  [VideoViewerName]: defaultVideoViewer,
  [WebviewName]: defaultWebview,
  [DataTableName]: defaultDataTable,
  [CSVViewerName]: defaultCSVViewer,
  [RTCChatName]: defaultRTCChat,
  [ScreenshareName]: defaultScreenshare,
  [VegaLiteViewerName]: defaultVegaLiteViewer,
  [VegaLiteName]: defaultVegaLite,
  [ClockName]: defaultClock,
  [CobrowseName]: defaultCobrowse,
  [JupyterLabName]: defaultJupyterLab,
  [DeepZoomImageName]: defaultDeepZoomImage,
  [NotepadName]: defaultNotepad,
  [GLTFViewerName]: defaultGLTFViewer,
};
