/** Phase 1 QR data (5 tags — simplified invoices) */
export interface Phase1QRData {
    /** Tag 1 — Seller name (Arabic or English) */
    sellerName: string;
    /** Tag 2 — 15-digit TRN */
    vatNumber: string;
    /** Tag 3 — ISO 8601 (YYYY-MM-DDTHH:MM:SS or YYYY-MM-DD HH:MM:SS) */
    timestamp: string;
    /** Tag 4 — Total amount including VAT (e.g., "115.00") */
    totalWithVat: string;
    /** Tag 5 — VAT amount (e.g., "15.00") */
    vatTotal?: string;
}
/** Phase 2 QR data (9 tags — compliant invoices) */
export interface Phase2QRData extends Phase1QRData {
    /** Tag 6 — SHA-256 hash of invoice (hex or base64) */
    invoiceHash: string;
    /** Tag 7 — ECDSA signature (base64) */
    signatureValue: string;
    /** Tag 8 — ECDSA public key (base64) */
    publicKey: string;
    /** Tag 9 — ZATCA CA signature on public key (base64) */
    certificateSignature: string;
}
/** QR image generation options */
export interface QRImageOptions {
    /** Image width in pixels. Default: 200 */
    width?: number;
    /** Margin in modules. Default: 1 */
    margin?: number;
    /** Error correction level. Default: 'M' */
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}
//# sourceMappingURL=types.d.ts.map