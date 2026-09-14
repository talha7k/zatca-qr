import type { Phase1QRData, Phase2QRData, QRImageOptions } from './types.js';
import { generatePhase1TLV } from './phase1.js';
import { generatePhase2TLV } from './phase2.js';

async function loadQRCode() {
  try {
    return await import('qrcode');
  } catch {
    throw new Error(
      'The "qrcode" package is required for QR image generation. ' +
        'Install it with: npm install qrcode',
    );
  }
}

const defaultOptions = {
  width: 200,
  margin: 1,
  errorCorrectionLevel: 'M' as const,
};

/**
 * Generate Phase 1 QR code image as data URL (PNG).
 * Requires optional `qrcode` peer dependency.
 * Throws helpful error if qrcode not installed.
 */
export async function generatePhase1QRImage(
  data: Phase1QRData,
  options?: QRImageOptions,
): Promise<string> {
  const QRCode = await loadQRCode();
  const base64TLV = generatePhase1TLV(data);
  return QRCode.toDataURL(base64TLV, {
    width: options?.width ?? defaultOptions.width,
    margin: options?.margin ?? defaultOptions.margin,
    errorCorrectionLevel: options?.errorCorrectionLevel ?? defaultOptions.errorCorrectionLevel,
    color: { dark: '#000000', light: '#FFFFFF' },
  });
}

/**
 * Generate Phase 2 QR code image as data URL (PNG).
 * Requires optional `qrcode` peer dependency.
 */
export async function generatePhase2QRImage(
  data: Phase2QRData,
  options?: QRImageOptions,
): Promise<string> {
  const QRCode = await loadQRCode();
  const base64TLV = generatePhase2TLV(data);
  return QRCode.toDataURL(base64TLV, {
    width: options?.width ?? defaultOptions.width,
    margin: options?.margin ?? defaultOptions.margin,
    errorCorrectionLevel: options?.errorCorrectionLevel ?? defaultOptions.errorCorrectionLevel,
    color: { dark: '#000000', light: '#FFFFFF' },
  });
}
