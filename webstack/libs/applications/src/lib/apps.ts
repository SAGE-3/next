// SAGE3 Generated from apps.json file

import { name as CounterAppName, init as defaultCounterApp } from './apps/CounterApp';
import { name as ImageAppName, init as defaultImageApp } from './apps/ImageApp';
import { name as LinkerAppName, init as defaultLinkerApp } from './apps/LinkerApp';
import { name as NoteAppName, init as defaultNoteApp } from './apps/NoteApp';
import { name as SliderAppName, init as defaultSliderApp } from './apps/SliderApp';
import { name as StickieName, init as defaultStickie } from './apps/Stickie';
import { name as PDFViewerName, init as defaultPDFViewer } from './apps/PDFViewer';
import { name as CodeCellName, init as defaultCodeCell } from './apps/CodeCell';
import { name as ImageViewerName, init as defaultImageViewer } from './apps/ImageViewer';
import { name as LeafLetName, init as defaultLeafLet } from './apps/LeafLet';
import { name as ScreenshareName, init as defaultScreenshare } from './apps/Screenshare';
import { name as VideoViewerName, init as defaultVideoViewer } from './apps/VideoViewer';
import { name as WebviewName, init as defaultWebview } from './apps/Webview';
import { name as DataTableAppName, init as defaultDataTableApp } from './apps/DataTableApp';
import { name as CSVViewerName, init as defaultCSVViewer } from './apps/CSVViewer';
import { name as RTCChatName, init as defaultRTCChat } from './apps/RTCChat';
import { name as SVGBoxName, init as defaultSVGBox } from './apps/SVGBox';
import { name as TwilioName, init as defaultTwilio } from './apps/Twilio';


import CounterApp from './apps/CounterApp/CounterApp';
import ImageApp from './apps/ImageApp/ImageApp';
import LinkerApp from './apps/LinkerApp/LinkerApp';
import NoteApp from './apps/NoteApp/NoteApp';
import SliderApp from './apps/SliderApp/SliderApp';
import Stickie from './apps/Stickie/Stickie';
import PDFViewer from './apps/PDFViewer/PDFViewer';
import CodeCell from './apps/CodeCell/CodeCell';
import ImageViewer from './apps/ImageViewer/ImageViewer';
import LeafLet from './apps/LeafLet/LeafLet';
import Screenshare from './apps/Screenshare/Screenshare';
import VideoViewer from './apps/VideoViewer/VideoViewer';
import Webview from './apps/Webview/Webview';
import DataTableApp from './apps/DataTableApp/DataTableApp';
import CSVViewer from './apps/CSVViewer/CSVViewer';
import RTCChat from './apps/RTCChat/RTCChat';
import SVGBox from './apps/SVGBox/SVGBox';
import Twilio from './apps/Twilio/Twilio';


export const Applications = {
  [CounterAppName]: CounterApp,
  [ImageAppName]: ImageApp,
  [LinkerAppName]: LinkerApp,
  [NoteAppName]: NoteApp,
  [SliderAppName]: SliderApp,
  [StickieName]: Stickie,
  [PDFViewerName]: PDFViewer,
  [CodeCellName]: CodeCell,
  [ImageViewerName]: ImageViewer,
  [LeafLetName]: LeafLet,
  [ScreenshareName]: Screenshare,
  [VideoViewerName]: VideoViewer,
  [WebviewName]: Webview,
  [DataTableAppName]: DataTableApp,
  [CSVViewerName]: CSVViewer,
  [RTCChatName]: RTCChat,
  [SVGBoxName]: SVGBox,
  [TwilioName]: Twilio,
} as unknown as Record<string, { AppComponent: () => JSX.Element, ToolbarComponent: () => JSX.Element }>;


export const initialValues = {
  [CounterAppName]: defaultCounterApp,
  [ImageAppName]: defaultImageApp,
  [LinkerAppName]: defaultLinkerApp,
  [NoteAppName]: defaultNoteApp,
  [SliderAppName]: defaultSliderApp,
  [StickieName]: defaultStickie,
  [PDFViewerName]: defaultPDFViewer,
  [CodeCellName]: defaultCodeCell,
  [ImageViewerName]: defaultImageViewer,
  [LeafLetName]: defaultLeafLet,
  [ScreenshareName]: defaultScreenshare,
  [VideoViewerName]: defaultVideoViewer,
  [WebviewName]: defaultWebview,
  [DataTableAppName]: defaultDataTableApp,
  [CSVViewerName]: defaultCSVViewer,
  [RTCChatName]: defaultRTCChat,
  [SVGBoxName]: defaultSVGBox,
  [TwilioName]: defaultTwilio,
};

export * from './components';
