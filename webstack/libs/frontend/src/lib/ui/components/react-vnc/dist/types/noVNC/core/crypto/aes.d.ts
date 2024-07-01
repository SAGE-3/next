export class AESECBCipher {
    static importKey(key: any, _algorithm: any, extractable: any, keyUsages: any): Promise<AESECBCipher>;
    _key: CryptoKey | null;
    get algorithm(): {
        name: string;
    };
    _importKey(key: any, extractable: any, keyUsages: any): Promise<void>;
    encrypt(_algorithm: any, plaintext: any): Promise<Uint8Array | null>;
}
export class AESEAXCipher {
    static importKey(key: any, _algorithm: any, _extractable: any, _keyUsages: any): Promise<AESEAXCipher>;
    _rawKey: any;
    _ctrKey: CryptoKey | null;
    _cbcKey: CryptoKey | null;
    _zeroBlock: Uint8Array;
    _prefixBlock0: Uint8Array;
    _prefixBlock1: Uint8Array;
    _prefixBlock2: Uint8Array;
    get algorithm(): {
        name: string;
    };
    _encryptBlock(block: any): Promise<Uint8Array>;
    _initCMAC(): Promise<void>;
    _k1: Uint8Array | undefined;
    _k2: Uint8Array | undefined;
    _encryptCTR(data: any, counter: any): Promise<Uint8Array>;
    _decryptCTR(data: any, counter: any): Promise<Uint8Array>;
    _computeCMAC(data: any, prefixBlock: any): Promise<any>;
    _importKey(key: any): Promise<void>;
    encrypt(algorithm: any, message: any): Promise<Uint8Array>;
    decrypt(algorithm: any, data: any): Promise<Uint8Array | null>;
}
