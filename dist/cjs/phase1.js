"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePhase1TLV = generatePhase1TLV;
const tlv_js_1 = require("./tlv.js");
/**
 * Generate Phase 1 TLV as Base64 string (5 tags).
 * Validates required fields, throws descriptive errors.
 */
function generatePhase1TLV(data) {
    if (!data.sellerName?.trim())
        throw new Error('sellerName is required');
    if (!data.vatNumber?.trim())
        throw new Error('vatNumber is required');
    if (!data.timestamp?.trim())
        throw new Error('timestamp is required');
    if (!data.totalWithVat?.trim())
        throw new Error('totalWithVat is required');
    try {
        const hex = [
            (0, tlv_js_1.encodeTLV)(1, data.sellerName.trim()),
            (0, tlv_js_1.encodeTLV)(2, data.vatNumber.trim()),
            (0, tlv_js_1.encodeTLV)(3, data.timestamp.trim()),
            (0, tlv_js_1.encodeTLV)(4, data.totalWithVat.trim()),
            (0, tlv_js_1.encodeTLV)(5, (data.vatTotal ?? '0.00').trim()),
        ].join('');
        return (0, tlv_js_1.hexToBase64)(hex);
    }
    catch (error) {
        throw new Error(`Phase 1 QR TLV generation failed: ${error.message}`, { cause: error });
    }
}
//# sourceMappingURL=phase1.js.map