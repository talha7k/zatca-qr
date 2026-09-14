import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

let hasQRCode = false;
try {
  require.resolve('qrcode');
  hasQRCode = true;
} catch {
  // qrcode not installed
}

const validPhase1Data = {
  sellerName: 'Acme Corp',
  vatNumber: '300000000000003',
  timestamp: '2023-12-15T14:30:00',
  totalWithVat: '115.00',
  vatTotal: '15.00',
};

const validPhase2Data = {
  ...validPhase1Data,
  invoiceHash: 'YWJjZGVmZzEyMzQ1Njc4OTA=',
  signatureValue: 'c2lnbmF0dXJldmFsdWU=',
  publicKey: 'cHVibGlja2V5',
  certificateSignature: 'Y2VydHNpZw==',
};

describe('generatePhase1QRImage', () => {
  it('returns a data URL starting with data:image/png;base64,', async () => {
    if (!hasQRCode) return;
    const { generatePhase1QRImage } = await import('../src/image.js');
    const result = await generatePhase1QRImage(validPhase1Data);
    assert.ok(result.startsWith('data:image/png;base64,'));
  });

  it('returns a valid base64 data URL', async () => {
    if (!hasQRCode) return;
    const { generatePhase1QRImage } = await import('../src/image.js');
    const result = await generatePhase1QRImage(validPhase1Data);
    const base64Part = result.replace('data:image/png;base64,', '');
    assert.doesNotThrow(() => atob(base64Part));
  });

  it('respects custom width option', async () => {
    if (!hasQRCode) return;
    const { generatePhase1QRImage } = await import('../src/image.js');
    const small = await generatePhase1QRImage(validPhase1Data, { width: 50 });
    const large = await generatePhase1QRImage(validPhase1Data, { width: 400 });
    // Larger image should produce more base64 data
    assert.ok(large.length > small.length);
  });

  it('respects custom error correction level', async () => {
    if (!hasQRCode) return;
    const { generatePhase1QRImage } = await import('../src/image.js');
    const low = await generatePhase1QRImage(validPhase1Data, { errorCorrectionLevel: 'L' });
    const high = await generatePhase1QRImage(validPhase1Data, { errorCorrectionLevel: 'H' });
    // Higher error correction → larger QR code
    assert.ok(high.length >= low.length);
  });
});

describe('generatePhase2QRImage', () => {
  it('returns a data URL starting with data:image/png;base64,', async () => {
    if (!hasQRCode) return;
    const { generatePhase2QRImage } = await import('../src/image.js');
    const result = await generatePhase2QRImage(validPhase2Data);
    assert.ok(result.startsWith('data:image/png;base64,'));
  });

  it('returns a valid base64 data URL', async () => {
    if (!hasQRCode) return;
    const { generatePhase2QRImage } = await import('../src/image.js');
    const result = await generatePhase2QRImage(validPhase2Data);
    const base64Part = result.replace('data:image/png;base64,', '');
    assert.doesNotThrow(() => atob(base64Part));
  });
});

describe('error handling', () => {
  it('throws helpful error when qrcode is not installed', async () => {
    if (hasQRCode) {
      // Can't test this when qrcode IS installed — skip
      return;
    }
    const { generatePhase1QRImage } = await import('../src/image.js');
    try {
      await generatePhase1QRImage(validPhase1Data);
      assert.fail('Should have thrown');
    } catch (err) {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes('qrcode'));
      assert.ok(err.message.includes('npm install qrcode'));
    }
  });
});
