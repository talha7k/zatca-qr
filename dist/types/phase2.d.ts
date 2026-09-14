import type { Phase2QRData } from './types.js';
/**
 * Generate Phase 2 TLV as Base64 string (9 tags).
 * Tags 1-7 are UTF-8 text as emitted by the official ZATCA SDK. Tags 8-9 are
 * binary DER values decoded from their base64 input.
 * Tag 6 also accepts a 64-character SHA-256 hex digest for compatibility.
 */
export declare function generatePhase2TLV(data: Phase2QRData): string;
//# sourceMappingURL=phase2.d.ts.map