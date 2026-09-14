// Types
export type { Phase1QRData, Phase2QRData, QRImageOptions } from './types.js';

// TLV primitives
export { encodeTLV, encodeTLVBytes, hexToBase64, base64ToHex, hexToBytes, base64ToBytes } from './tlv.js';

// Phase generators
export { generatePhase1TLV, generatePhase1TLV as generatePhase1QRCodeData } from './phase1.js';
export { generatePhase2TLV, generatePhase2TLV as generateQRCodeData } from './phase2.js';

// Image generation (optional qrcode peer dep)
export { generatePhase1QRImage, generatePhase2QRImage } from './image.js';
