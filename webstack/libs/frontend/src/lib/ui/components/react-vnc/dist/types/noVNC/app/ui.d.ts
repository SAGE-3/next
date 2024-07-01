export default UI;
declare namespace UI {
    const connected: boolean;
    const desktopName: string;
    const statusTimeout: null;
    const hideKeyboardTimeout: null;
    const idleControlbarTimeout: null;
    const closeControlbarTimeout: null;
    const controlbarGrabbed: boolean;
    const controlbarDrag: boolean;
    const controlbarMouseDownClientY: number;
    const controlbarMouseDownOffsetY: number;
    const lastKeyboardinput: null;
    const defaultKeyboardinputLen: number;
    const inhibitReconnect: boolean;
    const reconnectCallback: null;
    const reconnectPassword: null;
    function prime(): Promise<any>;
    function prime(): Promise<any>;
    function start(): Promise<any>;
    function start(): Promise<any>;
    function initFullscreen(): void;
    function initFullscreen(): void;
    function initSettings(): void;
    function initSettings(): void;
    function setupSettingLabels(): void;
    function setupSettingLabels(): void;
    function addControlbarHandlers(): void;
    function addControlbarHandlers(): void;
    function addTouchSpecificHandlers(): void;
    function addTouchSpecificHandlers(): void;
    function addExtraKeysHandlers(): void;
    function addExtraKeysHandlers(): void;
    function addMachineHandlers(): void;
    function addMachineHandlers(): void;
    function addConnectionControlHandlers(): void;
    function addConnectionControlHandlers(): void;
    function addClipboardHandlers(): void;
    function addClipboardHandlers(): void;
    function addSettingChangeHandler(name: any, changeFunc: any): void;
    function addSettingChangeHandler(name: any, changeFunc: any): void;
    function addSettingsHandlers(): void;
    function addSettingsHandlers(): void;
    function addFullscreenHandlers(): void;
    function addFullscreenHandlers(): void;
    function updateVisualState(state: any): void;
    function updateVisualState(state: any): void;
    function showStatus(text: any, statusType: any, time: any): void;
    function showStatus(text: any, statusType: any, time: any): void;
    function hideStatus(): void;
    function hideStatus(): void;
    function activateControlbar(event: any): void;
    function activateControlbar(event: any): void;
    function idleControlbar(): void;
    function idleControlbar(): void;
    function keepControlbar(): void;
    function keepControlbar(): void;
    function openControlbar(): void;
    function openControlbar(): void;
    function closeControlbar(): void;
    function closeControlbar(): void;
    function toggleControlbar(): void;
    function toggleControlbar(): void;
    function toggleControlbarSide(): void;
    function toggleControlbarSide(): void;
    function showControlbarHint(show: any, animate?: boolean): void;
    function showControlbarHint(show: any, animate?: boolean): void;
    function dragControlbarHandle(e: any): void;
    function dragControlbarHandle(e: any): void;
    function moveControlbarHandle(viewportRelativeY: any): void;
    function moveControlbarHandle(viewportRelativeY: any): void;
    function updateControlbarHandle(): void;
    function updateControlbarHandle(): void;
    function controlbarHandleMouseUp(e: any): void;
    function controlbarHandleMouseUp(e: any): void;
    function controlbarHandleMouseDown(e: any): void;
    function controlbarHandleMouseDown(e: any): void;
    function toggleExpander(e: any): void;
    function toggleExpander(e: any): void;
    function initSetting(name: any, defVal: any): any;
    function initSetting(name: any, defVal: any): any;
    function forceSetting(name: any, val: any): void;
    function forceSetting(name: any, val: any): void;
    function updateSetting(name: any): void;
    function updateSetting(name: any): void;
    function saveSetting(name: any): any;
    function saveSetting(name: any): any;
    function getSetting(name: any): any;
    function getSetting(name: any): any;
    function disableSetting(name: any): void;
    function disableSetting(name: any): void;
    function enableSetting(name: any): void;
    function enableSetting(name: any): void;
    function closeAllPanels(): void;
    function closeAllPanels(): void;
    function openSettingsPanel(): void;
    function openSettingsPanel(): void;
    function closeSettingsPanel(): void;
    function closeSettingsPanel(): void;
    function toggleSettingsPanel(): void;
    function toggleSettingsPanel(): void;
    function openPowerPanel(): void;
    function openPowerPanel(): void;
    function closePowerPanel(): void;
    function closePowerPanel(): void;
    function togglePowerPanel(): void;
    function togglePowerPanel(): void;
    function updatePowerButton(): void;
    function updatePowerButton(): void;
    function openClipboardPanel(): void;
    function openClipboardPanel(): void;
    function closeClipboardPanel(): void;
    function closeClipboardPanel(): void;
    function toggleClipboardPanel(): void;
    function toggleClipboardPanel(): void;
    function clipboardReceive(e: any): void;
    function clipboardReceive(e: any): void;
    function clipboardSend(): void;
    function clipboardSend(): void;
    function openConnectPanel(): void;
    function openConnectPanel(): void;
    function closeConnectPanel(): void;
    function closeConnectPanel(): void;
    function connect(event: any, password: any): void;
    function connect(event: any, password: any): void;
    function disconnect(): void;
    function disconnect(): void;
    function reconnect(): void;
    function reconnect(): void;
    function cancelReconnect(): void;
    function cancelReconnect(): void;
    function connectFinished(e: any): void;
    function connectFinished(e: any): void;
    function disconnectFinished(e: any): void;
    function disconnectFinished(e: any): void;
    function securityFailed(e: any): void;
    function securityFailed(e: any): void;
    function serverVerify(e: any): Promise<void>;
    function serverVerify(e: any): Promise<void>;
    function approveServer(e: any): void;
    function approveServer(e: any): void;
    function rejectServer(e: any): void;
    function rejectServer(e: any): void;
    function credentials(e: any): void;
    function credentials(e: any): void;
    function setCredentials(e: any): void;
    function setCredentials(e: any): void;
    function toggleFullscreen(): void;
    function toggleFullscreen(): void;
    function updateFullscreenButton(): void;
    function updateFullscreenButton(): void;
    function applyResizeMode(): void;
    function applyResizeMode(): void;
    function updateViewClip(): void;
    function updateViewClip(): void;
    function toggleViewDrag(): void;
    function toggleViewDrag(): void;
    function updateViewDrag(): void;
    function updateViewDrag(): void;
    function updateQuality(): void;
    function updateQuality(): void;
    function updateCompression(): void;
    function updateCompression(): void;
    function showVirtualKeyboard(): void;
    function showVirtualKeyboard(): void;
    function hideVirtualKeyboard(): void;
    function hideVirtualKeyboard(): void;
    function toggleVirtualKeyboard(): void;
    function toggleVirtualKeyboard(): void;
    function onfocusVirtualKeyboard(event: any): void;
    function onfocusVirtualKeyboard(event: any): void;
    function onblurVirtualKeyboard(event: any): void;
    function onblurVirtualKeyboard(event: any): void;
    function keepVirtualKeyboard(event: any): void;
    function keepVirtualKeyboard(event: any): void;
    function keyboardinputReset(): void;
    function keyboardinputReset(): void;
    function keyEvent(keysym: any, code: any, down: any): void;
    function keyEvent(keysym: any, code: any, down: any): void;
    function keyInput(event: any): void;
    function keyInput(event: any): void;
    function openExtraKeys(): void;
    function openExtraKeys(): void;
    function closeExtraKeys(): void;
    function closeExtraKeys(): void;
    function toggleExtraKeys(): void;
    function toggleExtraKeys(): void;
    function sendEsc(): void;
    function sendEsc(): void;
    function sendTab(): void;
    function sendTab(): void;
    function toggleCtrl(): void;
    function toggleCtrl(): void;
    function toggleWindows(): void;
    function toggleWindows(): void;
    function toggleAlt(): void;
    function toggleAlt(): void;
    function sendCtrlAltDel(): void;
    function sendCtrlAltDel(): void;
    function sendKey(keysym: any, code: any, down: any): void;
    function sendKey(keysym: any, code: any, down: any): void;
    function updateViewOnly(): void;
    function updateViewOnly(): void;
    function updateShowDotCursor(): void;
    function updateShowDotCursor(): void;
    function updateLogging(): void;
    function updateLogging(): void;
    function updateDesktopName(e: any): void;
    function updateDesktopName(e: any): void;
    function bell(e: any): void;
    function bell(e: any): void;
    function addOption(selectbox: any, text: any, value: any): void;
    function addOption(selectbox: any, text: any, value: any): void;
}
