// SAGE3 Generated from apps.json file

import { name as AssetLinkName } from './apps/AssetLink';
import { name as BoardLinkName } from './apps/BoardLink';
import { name as CSVViewerName } from './apps/CSVViewer';
import { name as CalculatorName } from './apps/Calculator';
import { name as ChatName } from './apps/Chat';
import { name as ClockName } from './apps/Clock';
import { name as CobrowseName } from './apps/Cobrowse';
import { name as CodeEditorName } from './apps/CodeEditor';
import { name as CounterName } from './apps/Counter';
import { name as DeepZoomImageName } from './apps/DeepZoomImage';
import { name as DrawingName } from './apps/Drawing';
import { name as GLTFViewerName } from './apps/GLTFViewer';
import { name as IFrameName } from './apps/IFrame';
import { name as ImageViewerName } from './apps/ImageViewer';
import { name as LeafLetName } from './apps/LeafLet';
import { name as LinkerName } from './apps/Linker';
import { name as MapName } from './apps/Map';
import { name as MermaidName } from './apps/Mermaid';
import { name as NotepadName } from './apps/Notepad';
import { name as PDFResultName } from './apps/PDFResult';
import { name as PDFViewerName } from './apps/PDFViewer';
import { name as PluginAppName } from './apps/PluginApp';
import { name as PollName } from './apps/Poll';
import { name as SageCellName } from './apps/SageCell';
import { name as SageIdeatorName } from './apps/SageIdeator';
import { name as ScreenshareName } from './apps/Screenshare';
import { name as StickieName } from './apps/Stickie';
import { name as TimerName } from './apps/Timer';
import { name as TwilioScreenshareName } from './apps/TwilioScreenshare';
import { name as VegaLiteName } from './apps/VegaLite';
import { name as VegaLiteViewerName } from './apps/VegaLiteViewer';
import { name as VideoViewerName } from './apps/VideoViewer';
import { name as WebpageLinkName } from './apps/WebpageLink';
import { name as WebviewName } from './apps/Webview';

import React from 'react';
import { AppGroup } from './schema';

import AssetLink from './apps/AssetLink/AssetLink';
import BoardLink from './apps/BoardLink/BoardLink';
import CSVViewer from './apps/CSVViewer/CSVViewer';
import Calculator from './apps/Calculator/Calculator';
import Chat from './apps/Chat/Chat';
import Clock from './apps/Clock/Clock';
import Cobrowse from './apps/Cobrowse/Cobrowse';
import CodeEditor from './apps/CodeEditor/CodeEditor';
import Counter from './apps/Counter/Counter';
import DeepZoomImage from './apps/DeepZoomImage/DeepZoomImage';
import Drawing from './apps/Drawing/Drawing';
import GLTFViewer from './apps/GLTFViewer/GLTFViewer';
import IFrame from './apps/IFrame/IFrame';
import ImageViewer from './apps/ImageViewer/ImageViewer';
import LeafLet from './apps/LeafLet/LeafLet';
import Linker from './apps/Linker/Linker';
import Map from './apps/Map/Map';
import Mermaid from './apps/Mermaid/Mermaid';
import Notepad from './apps/Notepad/Notepad';
import PDFResult from './apps/PDFResult/PDFResult';
import PDFViewer from './apps/PDFViewer/PDFViewer';
import PluginApp from './apps/PluginApp/PluginApp';
import Poll from './apps/Poll/Poll';
import SageCell from './apps/SageCell/SageCell';
import SageIdeator from './apps/SageIdeator/SageIdeator';
import Screenshare from './apps/Screenshare/Screenshare';
import Stickie from './apps/Stickie/Stickie';
import Timer from './apps/Timer/Timer';
import TwilioScreenshare from './apps/TwilioScreenshare/TwilioScreenshare';
import VegaLite from './apps/VegaLite/VegaLite';
import VegaLiteViewer from './apps/VegaLiteViewer/VegaLiteViewer';
import VideoViewer from './apps/VideoViewer/VideoViewer';
import WebpageLink from './apps/WebpageLink/WebpageLink';
import Webview from './apps/Webview/Webview';

export const Applications = {
  [AssetLinkName]: {
    AppComponent: React.memo(AssetLink.AppComponent),
    ToolbarComponent: AssetLink.ToolbarComponent,
    GroupedToolbarComponent: AssetLink.GroupedToolbarComponent,
  },
  [BoardLinkName]: {
    AppComponent: React.memo(BoardLink.AppComponent),
    ToolbarComponent: BoardLink.ToolbarComponent,
    GroupedToolbarComponent: BoardLink.GroupedToolbarComponent,
  },
  [CSVViewerName]: {
    AppComponent: React.memo(CSVViewer.AppComponent),
    ToolbarComponent: CSVViewer.ToolbarComponent,
    GroupedToolbarComponent: CSVViewer.GroupedToolbarComponent,
  },
  [CalculatorName]: {
    AppComponent: React.memo(Calculator.AppComponent),
    ToolbarComponent: Calculator.ToolbarComponent,
    GroupedToolbarComponent: Calculator.GroupedToolbarComponent,
  },
  [ChatName]: {
    AppComponent: React.memo(Chat.AppComponent),
    ToolbarComponent: Chat.ToolbarComponent,
    GroupedToolbarComponent: Chat.GroupedToolbarComponent,
  },
  [ClockName]: {
    AppComponent: React.memo(Clock.AppComponent),
    ToolbarComponent: Clock.ToolbarComponent,
    GroupedToolbarComponent: Clock.GroupedToolbarComponent,
  },
  [CobrowseName]: {
    AppComponent: React.memo(Cobrowse.AppComponent),
    ToolbarComponent: Cobrowse.ToolbarComponent,
    GroupedToolbarComponent: Cobrowse.GroupedToolbarComponent,
  },
  [CodeEditorName]: {
    AppComponent: React.memo(CodeEditor.AppComponent),
    ToolbarComponent: CodeEditor.ToolbarComponent,
    GroupedToolbarComponent: CodeEditor.GroupedToolbarComponent,
  },
  [CounterName]: {
    AppComponent: React.memo(Counter.AppComponent),
    ToolbarComponent: Counter.ToolbarComponent,
    GroupedToolbarComponent: Counter.GroupedToolbarComponent,
  },
  [DeepZoomImageName]: {
    AppComponent: React.memo(DeepZoomImage.AppComponent),
    ToolbarComponent: DeepZoomImage.ToolbarComponent,
    GroupedToolbarComponent: DeepZoomImage.GroupedToolbarComponent,
  },
  [DrawingName]: {
    AppComponent: React.memo(Drawing.AppComponent),
    ToolbarComponent: Drawing.ToolbarComponent,
    GroupedToolbarComponent: Drawing.GroupedToolbarComponent,
  },
  [GLTFViewerName]: {
    AppComponent: React.memo(GLTFViewer.AppComponent),
    ToolbarComponent: GLTFViewer.ToolbarComponent,
    GroupedToolbarComponent: GLTFViewer.GroupedToolbarComponent,
  },
  [IFrameName]: {
    AppComponent: React.memo(IFrame.AppComponent),
    ToolbarComponent: IFrame.ToolbarComponent,
    GroupedToolbarComponent: IFrame.GroupedToolbarComponent,
  },
  [ImageViewerName]: {
    AppComponent: React.memo(ImageViewer.AppComponent),
    ToolbarComponent: ImageViewer.ToolbarComponent,
    GroupedToolbarComponent: ImageViewer.GroupedToolbarComponent,
  },
  [LeafLetName]: {
    AppComponent: React.memo(LeafLet.AppComponent),
    ToolbarComponent: LeafLet.ToolbarComponent,
    GroupedToolbarComponent: LeafLet.GroupedToolbarComponent,
  },
  [LinkerName]: {
    AppComponent: React.memo(Linker.AppComponent),
    ToolbarComponent: Linker.ToolbarComponent,
    GroupedToolbarComponent: Linker.GroupedToolbarComponent,
  },
  [MapName]: {
    AppComponent: React.memo(Map.AppComponent),
    ToolbarComponent: Map.ToolbarComponent,
    GroupedToolbarComponent: Map.GroupedToolbarComponent,
  },
  [MermaidName]: {
    AppComponent: React.memo(Mermaid.AppComponent),
    ToolbarComponent: Mermaid.ToolbarComponent,
    GroupedToolbarComponent: Mermaid.GroupedToolbarComponent,
  },
  [NotepadName]: {
    AppComponent: React.memo(Notepad.AppComponent),
    ToolbarComponent: Notepad.ToolbarComponent,
    GroupedToolbarComponent: Notepad.GroupedToolbarComponent,
  },
  [PDFResultName]: {
    AppComponent: React.memo(PDFResult.AppComponent),
    ToolbarComponent: PDFResult.ToolbarComponent,
    GroupedToolbarComponent: PDFResult.GroupedToolbarComponent,
  },
  [PDFViewerName]: {
    AppComponent: React.memo(PDFViewer.AppComponent),
    ToolbarComponent: PDFViewer.ToolbarComponent,
    GroupedToolbarComponent: PDFViewer.GroupedToolbarComponent,
  },
  [PluginAppName]: {
    AppComponent: React.memo(PluginApp.AppComponent),
    ToolbarComponent: PluginApp.ToolbarComponent,
    GroupedToolbarComponent: PluginApp.GroupedToolbarComponent,
  },
  [PollName]: {
    AppComponent: React.memo(Poll.AppComponent),
    ToolbarComponent: Poll.ToolbarComponent,
    GroupedToolbarComponent: Poll.GroupedToolbarComponent,
  },
  [SageCellName]: {
    AppComponent: React.memo(SageCell.AppComponent),
    ToolbarComponent: SageCell.ToolbarComponent,
    GroupedToolbarComponent: SageCell.GroupedToolbarComponent,
  },
  [SageIdeatorName]: {
    AppComponent: React.memo(SageIdeator.AppComponent),
    ToolbarComponent: SageIdeator.ToolbarComponent,
    GroupedToolbarComponent: SageIdeator.GroupedToolbarComponent,
  },
  [ScreenshareName]: {
    AppComponent: React.memo(Screenshare.AppComponent),
    ToolbarComponent: Screenshare.ToolbarComponent,
    GroupedToolbarComponent: Screenshare.GroupedToolbarComponent,
  },
  [StickieName]: {
    AppComponent: React.memo(Stickie.AppComponent),
    ToolbarComponent: Stickie.ToolbarComponent,
    GroupedToolbarComponent: Stickie.GroupedToolbarComponent,
  },
  [TimerName]: {
    AppComponent: React.memo(Timer.AppComponent),
    ToolbarComponent: Timer.ToolbarComponent,
    GroupedToolbarComponent: Timer.GroupedToolbarComponent,
  },
  [TwilioScreenshareName]: {
    AppComponent: React.memo(TwilioScreenshare.AppComponent),
    ToolbarComponent: TwilioScreenshare.ToolbarComponent,
    GroupedToolbarComponent: TwilioScreenshare.GroupedToolbarComponent,
  },
  [VegaLiteName]: {
    AppComponent: React.memo(VegaLite.AppComponent),
    ToolbarComponent: VegaLite.ToolbarComponent,
    GroupedToolbarComponent: VegaLite.GroupedToolbarComponent,
  },
  [VegaLiteViewerName]: {
    AppComponent: React.memo(VegaLiteViewer.AppComponent),
    ToolbarComponent: VegaLiteViewer.ToolbarComponent,
    GroupedToolbarComponent: VegaLiteViewer.GroupedToolbarComponent,
  },
  [VideoViewerName]: {
    AppComponent: React.memo(VideoViewer.AppComponent),
    ToolbarComponent: VideoViewer.ToolbarComponent,
    GroupedToolbarComponent: VideoViewer.GroupedToolbarComponent,
  },
  [WebpageLinkName]: {
    AppComponent: React.memo(WebpageLink.AppComponent),
    ToolbarComponent: WebpageLink.ToolbarComponent,
    GroupedToolbarComponent: WebpageLink.GroupedToolbarComponent,
  },
  [WebviewName]: {
    AppComponent: React.memo(Webview.AppComponent),
    ToolbarComponent: Webview.ToolbarComponent,
    GroupedToolbarComponent: Webview.GroupedToolbarComponent,
  },
} as unknown as Record<
  string,
  {
    AppComponent: () => JSX.Element;
    ToolbarComponent: () => JSX.Element;
    GroupedToolbarComponent: (props: { apps: AppGroup }) => JSX.Element;
  }
>;

export * from './components';
export * from './ai-apps';
export * from './appLinks';
