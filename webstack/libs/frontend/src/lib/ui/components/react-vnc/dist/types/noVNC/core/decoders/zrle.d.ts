export default class ZRLEDecoder {
    _length: number;
    _inflator: Inflate;
    _pixelBuffer: Uint8Array;
    _tileBuffer: Uint8Array;
    decodeRect(x: any, y: any, width: any, height: any, sock: any, display: any, depth: any): boolean;
    _getBitsPerPixelInPalette(paletteSize: any): 1 | 4 | 2 | undefined;
    _readPixels(pixels: any): Uint8Array;
    _decodePaletteTile(paletteSize: any, tileSize: any, tilew: any, tileh: any): Uint8Array;
    _decodeRLETile(tileSize: any): Uint8Array;
    _decodeRLEPaletteTile(paletteSize: any, tileSize: any): Uint8Array;
    _readRLELength(): number;
}
import Inflate from "../inflator.js";
