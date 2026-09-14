/**
 * Encode a single TLV pair from raw bytes as a hex string.
 * Supports BER-TLV DER multi-byte length encoding (0x81, 0x82 prefixes).
 */
export declare function encodeTLVBytes(tag: number, valueBytes: Uint8Array): string;
/**
 * Encode a single TLV pair as a hex string.
 * Supports BER-TLV DER multi-byte length encoding (0x81, 0x82 prefixes).
 * Value is UTF-8 encoded via TextEncoder.
 */
export declare function encodeTLV(tag: number, value: string): string;
/**
 * Convert a hex string to Base64 (works in browser and Node.js).
 */
export declare function hexToBase64(hex: string): string;
/**
 * Convert a Base64 string to hex (works in browser and Node.js).
 */
export declare function base64ToHex(base64: string): string;
/**
 * Convert a hex string to raw bytes.
 */
export declare function hexToBytes(hex: string): Uint8Array;
/**
 * Convert a Base64 string to raw bytes.
 */
export declare function base64ToBytes(base64: string): Uint8Array;
//# sourceMappingURL=tlv.d.ts.map