export default class RSAAESAuthenticationState extends EventTargetMixin {
    constructor(sock: any, getCredentials: any);
    _hasStarted: boolean;
    _checkSock: any;
    _checkCredentials: any;
    _approveServerResolve: ((value: any) => void) | null;
    _sockReject: ((reason?: any) => void) | null;
    _credentialsReject: ((reason?: any) => void) | null;
    _approveServerReject: ((reason?: any) => void) | null;
    _sock: any;
    _getCredentials: any;
    _waitSockAsync(len: any): Promise<any>;
    _waitApproveKeyAsync(): Promise<any>;
    _waitCredentialsAsync(subtype: any): Promise<any>;
    checkInternalEvents(): void;
    approveServer(): void;
    disconnect(): void;
    negotiateRA2neAuthAsync(): Promise<void>;
    set hasStarted(arg: boolean);
    get hasStarted(): boolean;
}
import EventTargetMixin from "./util/eventtarget.js";
