import type { Phase1QRData, Phase2QRData, QRImageOptions } from './types.js';
/**
 * Generate Phase 1 QR code image as data URL (PNG).
 * Requires optional `qrcode` peer dependency.
 * Throws helpful error if qrcode not installed.
 */
export declare function generatePhase1QRImage(data: Phase1QRData, options?: QRImageOptions): Promise<string>;
/**
 * Generate Phase 2 QR code image as data URL (PNG).
 * Requires optional `qrcode` peer dependency.
 */
export declare function generatePhase2QRImage(data: Phase2QRData, options?: QRImageOptions): Promise<string>;
//# sourceMappingURL=image.d.ts.map