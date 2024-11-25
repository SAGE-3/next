declare var _default: LegacyCrypto;
export default _default;
declare class LegacyCrypto {
    _algorithms: {
        "AES-ECB": typeof AESECBCipher;
        "AES-EAX": typeof AESEAXCipher;
        "DES-ECB": typeof DESECBCipher;
        "DES-CBC": typeof DESCBCCipher;
        "RSA-PKCS1-v1_5": typeof RSACipher;
        DH: typeof DHCipher;
        MD5: typeof MD5;
    };
    encrypt(algorithm: any, key: any, data: any): any;
    decrypt(algorithm: any, key: any, data: any): any;
    importKey(format: any, keyData: any, algorithm: any, extractable: any, keyUsages: any): any;
    generateKey(algorithm: any, extractable: any, keyUsages: any): any;
    exportKey(format: any, key: any): any;
    digest(algorithm: any, data: any): any;
    deriveBits(algorithm: any, key: any, length: any): any;
}
import { AESECBCipher } from "./aes.js";
import { AESEAXCipher } from "./aes.js";
import { DESECBCipher } from "./des.js";
import { DESCBCCipher } from "./des.js";
import { RSACipher } from "./rsa.js";
import { DHCipher } from "./dh.js";
import { MD5 } from "./md5.js";
