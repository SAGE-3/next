export class RSACipher {
    static generateKey(algorithm: any, extractable: any, _keyUsages: any): Promise<{
        privateKey: RSACipher;
    }>;
    static importKey(key: any, _algorithm: any, extractable: any, keyUsages: any): Promise<RSACipher>;
    _keyLength: number;
    _keyBytes: number;
    _n: Uint8Array | null;
    _e: Uint8Array | null;
    _d: Uint8Array | null;
    _nBigInt: bigint | null;
    _eBigInt: bigint | null;
    _dBigInt: bigint | null;
    _extractable: boolean;
    get algorithm(): {
        name: string;
    };
    _base64urlDecode(data: any): any[];
    _padArray(arr: any, length: any): Uint8Array;
    _generateKey(algorithm: any, extractable: any): Promise<void>;
    _importKey(key: any, extractable: any): Promise<void>;
    encrypt(_algorithm: any, message: any): Promise<Uint8Array | null>;
    decrypt(_algorithm: any, message: any): Promise<Uint8Array | null>;
    exportKey(): Promise<{
        n: Uint8Array | null;
        e: Uint8Array | null;
        d: Uint8Array | null;
    }>;
}
