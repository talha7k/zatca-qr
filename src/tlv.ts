/**
 * Encode a single TLV pair from raw bytes as a hex string.
 * Supports BER-TLV DER multi-byte length encoding (0x81, 0x82 prefixes).
 */
export function encodeTLVBytes(tag: number, valueBytes: Uint8Array): string {
  if (valueBytes === null || valueBytes === undefined) {
    throw new Error(`encodeTLVBytes: value for tag ${tag} must not be null or undefined`);
  }

  const tagHex = tag.toString(16).padStart(2, '0').toUpperCase();
  const length = valueBytes.length;

  let lengthHex: string;
  if (length < 128) {
    lengthHex = length.toString(16).padStart(2, '0').toUpperCase();
  } else if (length < 256) {
    lengthHex = '81' + length.toString(16).padStart(2, '0').toUpperCase();
  } else {
    lengthHex = '82' + length.toString(16).padStart(4, '0').toUpperCase();
  }

  const valueHex = Array.from(valueBytes)
    .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
    .join('');

  return tagHex + lengthHex + valueHex;
}

/**
 * Encode a single TLV pair as a hex string.
 * Supports BER-TLV DER multi-byte length encoding (0x81, 0x82 prefixes).
 * Value is UTF-8 encoded via TextEncoder.
 */
export function encodeTLV(tag: number, value: string): string {
  if (value === null || value === undefined) {
    throw new Error(`encodeTLV: value for tag ${tag} must not be null or undefined`);
  }
  const valueBytes = new TextEncoder().encode(value);
  return encodeTLVBytes(tag, valueBytes);
}

/**
 * Convert a hex string to Base64 (works in browser and Node.js).
 */
export function hexToBase64(hex: string): string {
  if (!hex || hex.length === 0) return '';
  if (hex.length % 2 !== 0) {
    throw new Error('hexToBase64: hex string must have even length');
  }
  const pairs = hex.match(/.{2}/g);
  if (!pairs) return '';
  const bytes = new Uint8Array(pairs.map((byte) => parseInt(byte, 16)));
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Convert a Base64 string to hex (works in browser and Node.js).
 */
export function base64ToHex(base64: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
    .join('');
}

/**
 * Convert a hex string to raw bytes.
 */
export function hexToBytes(hex: string): Uint8Array {
  if (!hex || hex.length === 0) return new Uint8Array();
  if (hex.length % 2 !== 0) {
    throw new Error('hexToBytes: hex string must have even length');
  }
  if (!/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error('hexToBytes: hex string contains non-hex characters');
  }
  const pairs = hex.match(/.{2}/g);
  if (!pairs) return new Uint8Array();
  return new Uint8Array(pairs.map((byte) => parseInt(byte, 16)));
}

/**
 * Convert a Base64 string to raw bytes.
 */
export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
