"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePhase2TLV = generatePhase2TLV;
const tlv_js_1 = require("./tlv.js");
function decodeBase64Field(fieldName, value) {
    try {
        return (0, tlv_js_1.base64ToBytes)(value);
    }
    catch {
        throw new Error(`${fieldName} must be valid base64`);
    }
}
function normalizeBase64Field(fieldName, value) {
    const trimmed = value.trim();
    decodeBase64Field(fieldName, trimmed);
    return trimmed;
}
function normalizeInvoiceHash(value) {
    const trimmed = value.trim();
    if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
        return btoa(String.fromCharCode(...Array.from(trimmed.match(/.{2}/g) ?? []).map((byte) => parseInt(byte, 16))));
    }
    decodeBase64Field('invoiceHash', trimmed);
    return trimmed;
}
/**
 * Generate Phase 2 TLV as Base64 string (9 tags).
 * Tags 1-7 are UTF-8 text as emitted by the official ZATCA SDK. Tags 8-9 are
 * binary DER values decoded from their base64 input.
 * Tag 6 also accepts a 64-character SHA-256 hex digest for compatibility.
 */
function generatePhase2TLV(data) {
    if (!data.sellerName?.trim())
        throw new Error('sellerName is required');
    if (!data.vatNumber?.trim())
        throw new Error('vatNumber is required');
    if (!data.timestamp?.trim())
        throw new Error('timestamp is required');
    if (!data.totalWithVat?.trim())
        throw new Error('totalWithVat is required');
    if (!data.invoiceHash?.trim())
        throw new Error('invoiceHash is required');
    if (!data.signatureValue?.trim())
        throw new Error('signatureValue is required');
    if (!data.publicKey?.trim())
        throw new Error('publicKey is required');
    if (!data.certificateSignature?.trim())
        throw new Error('certificateSignature is required');
    try {
        const hex = [
            (0, tlv_js_1.encodeTLV)(1, data.sellerName.trim()),
            (0, tlv_js_1.encodeTLV)(2, data.vatNumber.trim()),
            (0, tlv_js_1.encodeTLV)(3, data.timestamp.trim()),
            (0, tlv_js_1.encodeTLV)(4, data.totalWithVat.trim()),
            (0, tlv_js_1.encodeTLV)(5, (data.vatTotal ?? '0.00').trim()),
            (0, tlv_js_1.encodeTLV)(6, normalizeInvoiceHash(data.invoiceHash)),
            (0, tlv_js_1.encodeTLV)(7, normalizeBase64Field('signatureValue', data.signatureValue)),
            (0, tlv_js_1.encodeTLVBytes)(8, decodeBase64Field('publicKey', data.publicKey.trim())),
            (0, tlv_js_1.encodeTLVBytes)(9, decodeBase64Field('certificateSignature', data.certificateSignature.trim())),
        ].join('');
        return (0, tlv_js_1.hexToBase64)(hex);
    }
    catch (error) {
        throw new Error(`Phase 2 QR TLV generation failed: ${error.message}`, { cause: error });
    }
}
//# sourceMappingURL=phase2.js.map