import React from 'react';
import RFB from '../noVNC/core/rfb';
export interface RFBOptions {
    shared: boolean;
    credentials: {
        username?: string;
        password?: string;
        target?: string;
    };
    repeaterID: string;
    wsProtocols: string | string[];
}
export interface Props {
    url: string;
    style?: object;
    className?: string;
    viewOnly?: boolean;
    rfbOptions?: Partial<RFBOptions>;
    focusOnClick?: boolean;
    clipViewport?: boolean;
    dragViewport?: boolean;
    scaleViewport?: boolean;
    resizeSession?: boolean;
    screenSizeWidth: number;
    screenSizeHeight: number;
    // selected: boolean;
    showDotCursor?: boolean;
    background?: string;
    qualityLevel?: number;
    compressionLevel?: number;
    autoConnect?: boolean;
    retryDuration?: number;
    debug?: boolean;
    loadingUI?: React.ReactNode;
    onConnect?: (rfb?: RFB) => void;
    onDisconnect?: (rfb?: RFB) => void;
    onCredentialsRequired?: (rfb?: RFB) => void;
    onSecurityFailure?: (e?: {
        detail: {
            status: number;
            reason: string;
        };
    }) => void;
    onClipboard?: (e?: {
        detail: {
            text: string;
        };
    }) => void;
    onBell?: () => void;
    onDesktopName?: (e?: {
        detail: {
            name: string;
        };
    }) => void;
    onCapabilities?: (e?: {
        detail: {
            capabilities: RFB["capabilities"];
        };
    }) => void;
}
export declare enum Events {
    connect = 0,
    disconnect = 1,
    credentialsrequired = 2,
    securityfailure = 3,
    clipboard = 4,
    bell = 5,
    desktopname = 6,
    capabilities = 7
}
export declare type EventListeners = {
    -readonly [key in keyof typeof Events]?: (e?: any) => void;
};
export declare type VncScreenHandle = {
    connect: () => void;
    disconnect: () => void;
    connected: boolean;
    sendCredentials: (credentials: RFBOptions["credentials"]) => void;
    sendKey: (keysym: number, code: string, down?: boolean) => void;
    sendCtrlAltDel: () => void;
    focus: () => void;
    blur: () => void;
    machineShutdown: () => void;
    machineReboot: () => void;
    machineReset: () => void;
    clipboardPaste: (text: string) => void;
    rfb: RFB | null;
    eventListeners: EventListeners;
};
declare const _default: React.ForwardRefExoticComponent<Props & React.RefAttributes<VncScreenHandle>>;
export default _default;
