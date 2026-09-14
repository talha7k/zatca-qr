import { encodeTLV, hexToBase64 } from './tlv.js';
import type { Phase1QRData } from './types.js';

/**
 * Generate Phase 1 TLV as Base64 string (5 tags).
 * Validates required fields, throws descriptive errors.
 */
export function generatePhase1TLV(data: Phase1QRData): string {
  if (!data.sellerName?.trim()) throw new Error('sellerName is required');
  if (!data.vatNumber?.trim()) throw new Error('vatNumber is required');
  if (!data.timestamp?.trim()) throw new Error('timestamp is required');
  if (!data.totalWithVat?.trim()) throw new Error('totalWithVat is required');

  try {
    const hex = [
      encodeTLV(1, data.sellerName.trim()),
      encodeTLV(2, data.vatNumber.trim()),
      encodeTLV(3, data.timestamp.trim()),
      encodeTLV(4, data.totalWithVat.trim()),
      encodeTLV(5, (data.vatTotal ?? '0.00').trim()),
    ].join('');

    return hexToBase64(hex);
  } catch (error) {
    throw new Error(`Phase 1 QR TLV generation failed: ${(error as Error).message}`, { cause: error });
  }
}
