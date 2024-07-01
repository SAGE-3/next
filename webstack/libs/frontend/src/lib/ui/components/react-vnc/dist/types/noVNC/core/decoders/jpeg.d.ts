export default class JPEGDecoder {
    _cachedQuantTables: any[];
    _cachedHuffmanTables: any[];
    _segments: any[];
    decodeRect(x: any, y: any, width: any, height: any, sock: any, display: any, depth: any): boolean;
    _readSegment(sock: any): Uint8Array | null;
}
