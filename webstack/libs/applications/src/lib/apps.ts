// SAGE3 Generated from apps.json file

import { name as AIPaneName } from './apps/AIPane';
import { name as BoardLinkName } from './apps/BoardLink';
import { name as CSVViewerName } from './apps/CSVViewer';
import { name as ChatName } from './apps/Chat';
import { name as ClockName } from './apps/Clock';
import { name as CobrowseName } from './apps/Cobrowse';
import { name as CounterName } from './apps/Counter';
import { name as DataTableName } from './apps/DataTable';
import { name as DeepZoomImageName } from './apps/DeepZoomImage';
import { name as GLTFViewerName } from './apps/GLTFViewer';
import { name as ImageViewerName } from './apps/ImageViewer';
import { name as JupyterLabName } from './apps/JupyterLab';
import { name as KernelDashboardName } from './apps/KernelDashboard';
import { name as KernelsName } from './apps/Kernels';
import { name as LeafLetName } from './apps/LeafLet';
import { name as LinkerName } from './apps/Linker';
import { name as MapGLName } from './apps/MapGL';
import { name as NotepadName } from './apps/Notepad';
import { name as PDFResultName } from './apps/PDFResult';
import { name as PDFViewerName } from './apps/PDFViewer';
import { name as PluginAppName } from './apps/PluginApp';
import { name as RTCChatName } from './apps/RTCChat';
import { name as SageCellName } from './apps/SageCell';
import { name as SeerName } from './apps/Seer';
import { name as SensorOverviewName } from './apps/SensorOverview';
import { name as StickieName } from './apps/Stickie';
import { name as TwilioScreenshareName } from './apps/TwilioScreenshare';
import { name as VegaLiteName } from './apps/VegaLite';
import { name as VegaLiteViewerName } from './apps/VegaLiteViewer';
import { name as VideoViewerName } from './apps/VideoViewer';
import { name as WebpageLinkName } from './apps/WebpageLink';
import { name as WebviewName } from './apps/Webview';


import AIPane from './apps/AIPane/AIPane';
import BoardLink from './apps/BoardLink/BoardLink';
import CSVViewer from './apps/CSVViewer/CSVViewer';
import Chat from './apps/Chat/Chat';
import Clock from './apps/Clock/Clock';
import Cobrowse from './apps/Cobrowse/Cobrowse';
import Counter from './apps/Counter/Counter';
import DataTable from './apps/DataTable/DataTable';
import DeepZoomImage from './apps/DeepZoomImage/DeepZoomImage';
import GLTFViewer from './apps/GLTFViewer/GLTFViewer';
import ImageViewer from './apps/ImageViewer/ImageViewer';
import JupyterLab from './apps/JupyterLab/JupyterLab';
import KernelDashboard from './apps/KernelDashboard/KernelDashboard';
import Kernels from './apps/Kernels/Kernels';
import LeafLet from './apps/LeafLet/LeafLet';
import Linker from './apps/Linker/Linker';
import MapGL from './apps/MapGL/MapGL';
import Notepad from './apps/Notepad/Notepad';
import PDFResult from './apps/PDFResult/PDFResult';
import PDFViewer from './apps/PDFViewer/PDFViewer';
import PluginApp from './apps/PluginApp/PluginApp';
import RTCChat from './apps/RTCChat/RTCChat';
import SageCell from './apps/SageCell/SageCell';
import Seer from './apps/Seer/Seer';
import SensorOverview from './apps/SensorOverview/SensorOverview';
import Stickie from './apps/Stickie/Stickie';
import TwilioScreenshare from './apps/TwilioScreenshare/TwilioScreenshare';
import VegaLite from './apps/VegaLite/VegaLite';
import VegaLiteViewer from './apps/VegaLiteViewer/VegaLiteViewer';
import VideoViewer from './apps/VideoViewer/VideoViewer';
import WebpageLink from './apps/WebpageLink/WebpageLink';
import Webview from './apps/Webview/Webview';
import { App } from './schema';
import React from 'react';


export const Applications = {
  [AIPaneName]: { AppComponent: React.memo(AIPane.AppComponent), ToolbarComponent: AIPane.ToolbarComponent, GroupedToolbarComponent: AIPane.GroupedToolbarComponent },
  [BoardLinkName]: { AppComponent: React.memo(BoardLink.AppComponent), ToolbarComponent: BoardLink.ToolbarComponent, GroupedToolbarComponent: BoardLink.GroupedToolbarComponent },
  [CSVViewerName]: { AppComponent: React.memo(CSVViewer.AppComponent), ToolbarComponent: CSVViewer.ToolbarComponent, GroupedToolbarComponent: CSVViewer.GroupedToolbarComponent },
  [ChatName]: { AppComponent: React.memo(Chat.AppComponent), ToolbarComponent: Chat.ToolbarComponent, GroupedToolbarComponent: Chat.GroupedToolbarComponent },
  [ClockName]: { AppComponent: React.memo(Clock.AppComponent), ToolbarComponent: Clock.ToolbarComponent, GroupedToolbarComponent: Clock.GroupedToolbarComponent },
  [CobrowseName]: { AppComponent: React.memo(Cobrowse.AppComponent), ToolbarComponent: Cobrowse.ToolbarComponent, GroupedToolbarComponent: Cobrowse.GroupedToolbarComponent },
  [CounterName]: { AppComponent: React.memo(Counter.AppComponent), ToolbarComponent: Counter.ToolbarComponent, GroupedToolbarComponent: Counter.GroupedToolbarComponent },
  [DataTableName]: { AppComponent: React.memo(DataTable.AppComponent), ToolbarComponent: DataTable.ToolbarComponent, GroupedToolbarComponent: DataTable.GroupedToolbarComponent },
  [DeepZoomImageName]: { AppComponent: React.memo(DeepZoomImage.AppComponent), ToolbarComponent: DeepZoomImage.ToolbarComponent, GroupedToolbarComponent: DeepZoomImage.GroupedToolbarComponent },
  [GLTFViewerName]: { AppComponent: React.memo(GLTFViewer.AppComponent), ToolbarComponent: GLTFViewer.ToolbarComponent, GroupedToolbarComponent: GLTFViewer.GroupedToolbarComponent },
  [ImageViewerName]: { AppComponent: React.memo(ImageViewer.AppComponent), ToolbarComponent: ImageViewer.ToolbarComponent, GroupedToolbarComponent: ImageViewer.GroupedToolbarComponent },
  [JupyterLabName]: { AppComponent: React.memo(JupyterLab.AppComponent), ToolbarComponent: JupyterLab.ToolbarComponent, GroupedToolbarComponent: JupyterLab.GroupedToolbarComponent },
  [KernelDashboardName]: { AppComponent: React.memo(KernelDashboard.AppComponent), ToolbarComponent: KernelDashboard.ToolbarComponent, GroupedToolbarComponent: KernelDashboard.GroupedToolbarComponent },
  [KernelsName]: { AppComponent: React.memo(Kernels.AppComponent), ToolbarComponent: Kernels.ToolbarComponent, GroupedToolbarComponent: Kernels.GroupedToolbarComponent },
  [LeafLetName]: { AppComponent: React.memo(LeafLet.AppComponent), ToolbarComponent: LeafLet.ToolbarComponent, GroupedToolbarComponent: LeafLet.GroupedToolbarComponent },
  [LinkerName]: { AppComponent: React.memo(Linker.AppComponent), ToolbarComponent: Linker.ToolbarComponent, GroupedToolbarComponent: Linker.GroupedToolbarComponent },
  [MapGLName]: { AppComponent: React.memo(MapGL.AppComponent), ToolbarComponent: MapGL.ToolbarComponent, GroupedToolbarComponent: MapGL.GroupedToolbarComponent },
  [NotepadName]: { AppComponent: React.memo(Notepad.AppComponent), ToolbarComponent: Notepad.ToolbarComponent, GroupedToolbarComponent: Notepad.GroupedToolbarComponent },
  [PDFResultName]: { AppComponent: React.memo(PDFResult.AppComponent), ToolbarComponent: PDFResult.ToolbarComponent, GroupedToolbarComponent: PDFResult.GroupedToolbarComponent },
  [PDFViewerName]: { AppComponent: React.memo(PDFViewer.AppComponent), ToolbarComponent: PDFViewer.ToolbarComponent, GroupedToolbarComponent: PDFViewer.GroupedToolbarComponent },
  [PluginAppName]: { AppComponent: React.memo(PluginApp.AppComponent), ToolbarComponent: PluginApp.ToolbarComponent, GroupedToolbarComponent: PluginApp.GroupedToolbarComponent },
  [RTCChatName]: { AppComponent: React.memo(RTCChat.AppComponent), ToolbarComponent: RTCChat.ToolbarComponent, GroupedToolbarComponent: RTCChat.GroupedToolbarComponent },
  [SageCellName]: { AppComponent: React.memo(SageCell.AppComponent), ToolbarComponent: SageCell.ToolbarComponent, GroupedToolbarComponent: SageCell.GroupedToolbarComponent },
  [SeerName]: { AppComponent: React.memo(Seer.AppComponent), ToolbarComponent: Seer.ToolbarComponent, GroupedToolbarComponent: Seer.GroupedToolbarComponent },
  [SensorOverviewName]: { AppComponent: React.memo(SensorOverview.AppComponent), ToolbarComponent: SensorOverview.ToolbarComponent, GroupedToolbarComponent: SensorOverview.GroupedToolbarComponent },
  [StickieName]: { AppComponent: React.memo(Stickie.AppComponent), ToolbarComponent: Stickie.ToolbarComponent, GroupedToolbarComponent: Stickie.GroupedToolbarComponent },
  [TwilioScreenshareName]: { AppComponent: React.memo(TwilioScreenshare.AppComponent), ToolbarComponent: TwilioScreenshare.ToolbarComponent, GroupedToolbarComponent: TwilioScreenshare.GroupedToolbarComponent },
  [VegaLiteName]: { AppComponent: React.memo(VegaLite.AppComponent), ToolbarComponent: VegaLite.ToolbarComponent, GroupedToolbarComponent: VegaLite.GroupedToolbarComponent },
  [VegaLiteViewerName]: { AppComponent: React.memo(VegaLiteViewer.AppComponent), ToolbarComponent: VegaLiteViewer.ToolbarComponent, GroupedToolbarComponent: VegaLiteViewer.GroupedToolbarComponent },
  [VideoViewerName]: { AppComponent: React.memo(VideoViewer.AppComponent), ToolbarComponent: VideoViewer.ToolbarComponent, GroupedToolbarComponent: VideoViewer.GroupedToolbarComponent },
  [WebpageLinkName]: { AppComponent: React.memo(WebpageLink.AppComponent), ToolbarComponent: WebpageLink.ToolbarComponent, GroupedToolbarComponent: WebpageLink.GroupedToolbarComponent },
  [WebviewName]: { AppComponent: React.memo(Webview.AppComponent), ToolbarComponent: Webview.ToolbarComponent, GroupedToolbarComponent: Webview.GroupedToolbarComponent },
} as unknown as Record<string, { AppComponent: () => JSX.Element, ToolbarComponent: () => JSX.Element, GroupedToolbarComponent: (props: { apps: App[] }) => JSX.Element; }>;

export * from './components';
