export class DESECBCipher {
    static importKey(key: any, _algorithm: any, _extractable: any, _keyUsages: any): DESECBCipher;
    _cipher: DES | null;
    get algorithm(): {
        name: string;
    };
    _importKey(key: any, _extractable: any, _keyUsages: any): void;
    encrypt(_algorithm: any, plaintext: any): Uint8Array | null;
}
export class DESCBCCipher {
    static importKey(key: any, _algorithm: any, _extractable: any, _keyUsages: any): DESCBCCipher;
    _cipher: DES | null;
    get algorithm(): {
        name: string;
    };
    _importKey(key: any): void;
    encrypt(algorithm: any, plaintext: any): Uint8Array | null;
}
declare class DES {
    constructor(password: any);
    keys: number[];
    enc8(text: any): any;
}
export {};
