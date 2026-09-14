"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePhase1QRImage = generatePhase1QRImage;
exports.generatePhase2QRImage = generatePhase2QRImage;
const phase1_js_1 = require("./phase1.js");
const phase2_js_1 = require("./phase2.js");
async function loadQRCode() {
    try {
        return await import('qrcode');
    }
    catch {
        throw new Error('The "qrcode" package is required for QR image generation. ' +
            'Install it with: npm install qrcode');
    }
}
const defaultOptions = {
    width: 200,
    margin: 1,
    errorCorrectionLevel: 'M',
};
/**
 * Generate Phase 1 QR code image as data URL (PNG).
 * Requires optional `qrcode` peer dependency.
 * Throws helpful error if qrcode not installed.
 */
async function generatePhase1QRImage(data, options) {
    const QRCode = await loadQRCode();
    const base64TLV = (0, phase1_js_1.generatePhase1TLV)(data);
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
async function generatePhase2QRImage(data, options) {
    const QRCode = await loadQRCode();
    const base64TLV = (0, phase2_js_1.generatePhase2TLV)(data);
    return QRCode.toDataURL(base64TLV, {
        width: options?.width ?? defaultOptions.width,
        margin: options?.margin ?? defaultOptions.margin,
        errorCorrectionLevel: options?.errorCorrectionLevel ?? defaultOptions.errorCorrectionLevel,
        color: { dark: '#000000', light: '#FFFFFF' },
    });
}
//# sourceMappingURL=image.js.map