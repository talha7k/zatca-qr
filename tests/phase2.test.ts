import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generatePhase2TLV } from '../src/phase2.js';
import { generatePhase1TLV } from '../src/phase1.js';
import { base64ToHex, hexToBytes } from '../src/tlv.js';

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

function decodeTLVHex(base64: string): Array<{ tag: number; length: number; valueHex: string }> {
  const hex = base64ToHex(base64);
  const entries: Array<{ tag: number; length: number; valueHex: string }> = [];
  let offset = 0;

  while (offset < hex.length) {
    const tag = parseInt(hex.slice(offset, offset + 2), 16);
    offset += 2;

    const lengthFirstByte = parseInt(hex.slice(offset, offset + 2), 16);
    let length: number;
    let lengthHexBytes: number;
    if (lengthFirstByte < 0x80) {
      length = lengthFirstByte;
      lengthHexBytes = 2;
    } else if (lengthFirstByte === 0x81) {
      length = parseInt(hex.slice(offset + 2, offset + 4), 16);
      lengthHexBytes = 4;
    } else if (lengthFirstByte === 0x82) {
      length = parseInt(hex.slice(offset + 2, offset + 6), 16);
      lengthHexBytes = 6;
    } else {
      throw new Error(`Unsupported TLV length encoding: 0x${lengthFirstByte.toString(16)}`);
    }

    offset += lengthHexBytes;
    const valueHex = hex.slice(offset, offset + length * 2);
    entries.push({ tag, length, valueHex });
    offset += length * 2;
  }

  return entries;
}

function textToHex(value: string): string {
  return Buffer.from(value, 'utf8').toString('hex').toUpperCase();
}

describe('generatePhase2TLV', () => {
  it('generates a valid Base64 string', () => {
    const result = generatePhase2TLV(validPhase2Data);
    assert.ok(result.length > 0);
    assert.doesNotThrow(() => atob(result));
  });

  it('decodes to TLV hex with all 9 tags', () => {
    const result = generatePhase2TLV(validPhase2Data);
    const entries = decodeTLVHex(result);

    assert.equal(entries.length, 9);
    assert.deepEqual(entries.map((entry) => entry.tag), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('tags appear in sequential order (1-9)', () => {
    const result = generatePhase2TLV(validPhase2Data);
    const entries = decodeTLVHex(result);

    assert.deepEqual(entries.map((entry) => entry.tag), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('tags 1-5 hex output matches Phase 1 output', () => {
    const phase1Result = generatePhase1TLV(validPhase1Data);
    const phase2Result = generatePhase2TLV(validPhase2Data);

    const phase1Hex = base64ToHex(phase1Result);
    const phase2Hex = base64ToHex(phase2Result);

    // Phase 2 should start with the exact same Phase 1 tags 1-5 hex
    assert.ok(phase2Hex.startsWith(phase1Hex), 'Phase 2 starts with Phase 1 tags');
  });

  it('Phase 2 output is longer than Phase 1 output', () => {
    const phase1Result = generatePhase1TLV(validPhase1Data);
    const phase2Result = generatePhase2TLV(validPhase2Data);
    assert.ok(phase2Result.length > phase1Result.length);
  });

  it('throws on missing invoiceHash', () => {
    assert.throws(
      () => generatePhase2TLV({ ...validPhase2Data, invoiceHash: '' }),
      /invoiceHash is required/,
    );
  });

  it('throws on missing signatureValue', () => {
    assert.throws(
      () => generatePhase2TLV({ ...validPhase2Data, signatureValue: '' }),
      /signatureValue is required/,
    );
  });

  it('throws on missing publicKey', () => {
    assert.throws(
      () => generatePhase2TLV({ ...validPhase2Data, publicKey: '' }),
      /publicKey is required/,
    );
  });

  it('throws on missing certificateSignature', () => {
    assert.throws(
      () => generatePhase2TLV({ ...validPhase2Data, certificateSignature: '' }),
      /certificateSignature is required/,
    );
  });

  it('throws on missing Phase 1 required fields too', () => {
    assert.throws(
      () => generatePhase2TLV({ ...validPhase2Data, sellerName: '' }),
      /sellerName is required/,
    );
    assert.throws(
      () => generatePhase2TLV({ ...validPhase2Data, vatNumber: '' }),
      /vatNumber is required/,
    );
    assert.throws(
      () => generatePhase2TLV({ ...validPhase2Data, timestamp: '' }),
      /timestamp is required/,
    );
    assert.throws(
      () => generatePhase2TLV({ ...validPhase2Data, totalWithVat: '' }),
      /totalWithVat is required/,
    );
  });

  it('throws on whitespace-only Phase 2 fields', () => {
    assert.throws(
      () => generatePhase2TLV({ ...validPhase2Data, invoiceHash: '   ' }),
      /invoiceHash is required/,
    );
    assert.throws(
      () => generatePhase2TLV({ ...validPhase2Data, signatureValue: '   ' }),
      /signatureValue is required/,
    );
  });

  it('produces consistent output for the same input', () => {
    const result1 = generatePhase2TLV(validPhase2Data);
    const result2 = generatePhase2TLV(validPhase2Data);
    assert.equal(result1, result2);
  });

  it('handles long base64 values for tags 6-9', () => {
    // Simulate real-world long hash/signature values
    const longData = {
      ...validPhase2Data,
      invoiceHash: 'a'.repeat(64), // SHA-256 hex
      signatureValue: btoa(String.fromCharCode(...new Uint8Array(72).fill(0xbb))),
      publicKey: btoa(String.fromCharCode(...new Uint8Array(128).fill(0xcc))),
      certificateSignature: btoa(String.fromCharCode(...new Uint8Array(72).fill(0xdd))),
    };
    const result = generatePhase2TLV(longData);
    assert.ok(result.length > 0);
    assert.doesNotThrow(() => atob(result));

    const hex = base64ToHex(result);
    // Verify 0x81 prefix for the long publicKey (128 bytes >= 128)
    const pos8 = hex.indexOf('08');
    assert.ok(pos8 !== -1);
    assert.equal(hex.slice(pos8 + 2, pos8 + 4), '81', 'Tag 8 uses 0x81 prefix for 128-byte value');
  });

  it('encodes Phase 2 tags like the official SDK: tags 6-7 as text, tags 8-9 as binary DER bytes', () => {
    const result = generatePhase2TLV(validPhase2Data);
    const entries = decodeTLVHex(result);

    assert.equal(entries[5].valueHex, textToHex(validPhase2Data.invoiceHash));
    assert.equal(entries[6].valueHex, textToHex(validPhase2Data.signatureValue));
    assert.equal(entries[7].valueHex, base64ToHex(validPhase2Data.publicKey));
    assert.equal(entries[8].valueHex, base64ToHex(validPhase2Data.certificateSignature));
  });

  it('accepts a 64-character SHA-256 invoice hash hex string for tag 6', () => {
    const invoiceHash = 'a1'.repeat(32);
    const result = generatePhase2TLV({ ...validPhase2Data, invoiceHash });
    const entries = decodeTLVHex(result);

    assert.equal(entries[5].length, 44);
    assert.equal(entries[5].valueHex, textToHex(Buffer.from(hexToBytes(invoiceHash)).toString('base64')));
  });
});
