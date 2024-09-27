export class DHCipher {
    static generateKey(algorithm: any, _extractable: any): {
        privateKey: DHCipher;
        publicKey: DHPublicKey;
    };
    _g: any;
    _p: any;
    _gBigInt: bigint | null;
    _pBigInt: bigint | null;
    _privateKey: Uint8Array | null;
    get algorithm(): {
        name: string;
    };
    _generateKey(algorithm: any): void;
    _keyBytes: any;
    _privateKeyBigInt: bigint | undefined;
    _publicKey: Uint8Array | undefined;
    deriveBits(algorithm: any, length: any): Uint8Array;
}
declare class DHPublicKey {
    constructor(key: any);
    _key: any;
    get algorithm(): {
        name: string;
    };
    exportKey(): any;
}
export {};
