import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import {
  encodeTLV,
  hexToBase64,
  base64ToHex,
  generatePhase1TLV,
  generatePhase2TLV,
} from '../src/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface TLVEntry {
  tag: number;
  length: number;
  value: string;
  valueHex: string;
}

/**
 * Decode a Base64 TLV string into an array of { tag, length, value } entries.
 * Supports BER-TLV multi-byte length encoding (0x81, 0x82 prefixes).
 */
function decodeTLV(base64: string): TLVEntry[] {
  const hex = base64ToHex(base64);
  const entries: TLVEntry[] = [];
  let offset = 0;

  while (offset < hex.length) {
    // Tag — 1 byte (tags 1–9)
    const tag = parseInt(hex.slice(offset, offset + 2), 16);
    offset += 2;

    // Length — BER-TLV: check first byte for multi-byte prefix
    const lengthFirstByte = parseInt(hex.slice(offset, offset + 2), 16);
    let length: number;
    let lengthHexBytes: number;

    if (lengthFirstByte < 0x80) {
      // Short form: 1 byte
      length = lengthFirstByte;
      lengthHexBytes = 2;
    } else if (lengthFirstByte === 0x81) {
      // Long form: 0x81 + 1 byte
      length = parseInt(hex.slice(offset + 2, offset + 4), 16);
      lengthHexBytes = 4;
    } else if (lengthFirstByte === 0x82) {
      // Long form: 0x82 + 2 bytes
      length = parseInt(hex.slice(offset + 2, offset + 6), 16);
      lengthHexBytes = 6;
    } else {
      throw new Error(`Unsupported TLV length encoding: 0x${lengthFirstByte.toString(16)} at offset ${offset}`);
    }

    offset += lengthHexBytes;

    // Value — `length` bytes of hex
    const valueHex = hex.slice(offset, offset + length * 2);
    const valueBytes = new Uint8Array(
      valueHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)),
    );
    const value = new TextDecoder().decode(valueBytes);

    entries.push({ tag, length, value, valueHex });
    offset += length * 2;
  }

  return entries;
}

function bytesBase64(length: number, value: number): string {
  return btoa(String.fromCharCode(...new Uint8Array(length).fill(value)));
}

function textToHex(value: string): string {
  return Buffer.from(value, 'utf8').toString('hex').toUpperCase();
}

// ---------------------------------------------------------------------------
// ZATCA Official Example Data
// ---------------------------------------------------------------------------

const ZATCA_OFFICIAL = {
  sellerName: 'Bobs Records',
  vatNumber: '310122393500003',
  timestamp: '2022-04-25T15:30:00Z',
  totalWithVat: '1000.00',
  vatTotal: '150.00',
} as const;

// The ZATCA QRCodeCreation.pdf spec provides the Base64 string below, but the PDF
// transcription contains byte-level errors (e.g., extra bytes, wrong hex digits in the
// VAT number). The individual TLV hex values from the spec table ARE correct.
// We verify against the correct Base64 derived from the spec's individual TLV hex values.
//
// Spec Base64 (has errors): AQxCb2JzIFJlY29yZHMODzMwMTAxMjIzOTM1MDAwMDMTFDIwMjItMDQtMjVUMTU6MzA6MDBaBAc3MTAwMC4wMAUGMTUwLjAw
// Correct Base64 (from individual TLV hex): AQxCb2JzIFJlY29yZHMCDzMxMDEyMjM5MzUwMDAwMwMUMjAyMi0wNC0yNVQxNTozMDowMFoEBzEwMDAuMDAFBjE1MC4wMA==
const ZATCA_EXPECTED_BASE64 =
  'AQxCb2JzIFJlY29yZHMCDzMxMDEyMjM5MzUwMDAwMwMUMjAyMi0wNC0yNVQxNTozMDowMFoEBzEwMDAuMDAFBjE1MC4wMA==';


// Expected individual TLV hex values from the spec
const ZATCA_EXPECTED_TLV = {
  1: '010C426F6273205265636F726473',
  2: '020F333130313232333933353030303033',
  3: '0314323032322D30342D32355431353A33303A30305A',
  4: '0407313030302E3030',
  5: '05063135302E3030',
} as const;

// Cross-validation reference — loaded dynamically, may not be available
let encodeTLVMain: typeof encodeTLV | undefined;
let genPhase1Main: typeof generatePhase1TLV | undefined;
let genPhase2Main: typeof generatePhase2TLV | undefined;
let crossValidationAvailable = false;

// ---------------------------------------------------------------------------
// Test 1: Known-Answer Test (ZATCA Official Example)
// ---------------------------------------------------------------------------

describe('ZATCA Spec Compliance', () => {
  describe('Test 1: Known-Answer Test (ZATCA Official Example)', () => {
    it('full Phase 1 output matches ZATCA spec Base64', () => {
      const result = generatePhase1TLV({
        sellerName: ZATCA_OFFICIAL.sellerName,
        vatNumber: ZATCA_OFFICIAL.vatNumber,
        timestamp: ZATCA_OFFICIAL.timestamp,
        totalWithVat: ZATCA_OFFICIAL.totalWithVat,
        vatTotal: ZATCA_OFFICIAL.vatTotal,
      });

      assert.equal(result, ZATCA_EXPECTED_BASE64);
    });

    it('decoded hex matches expected concatenated TLV hex', () => {
      const result = generatePhase1TLV({
        sellerName: ZATCA_OFFICIAL.sellerName,
        vatNumber: ZATCA_OFFICIAL.vatNumber,
        timestamp: ZATCA_OFFICIAL.timestamp,
        totalWithVat: ZATCA_OFFICIAL.totalWithVat,
        vatTotal: ZATCA_OFFICIAL.vatTotal,
      });

      const hex = base64ToHex(result);
      const expectedHex = Object.values(ZATCA_EXPECTED_TLV).join('');
      assert.equal(hex, expectedHex);
    });

    it('each individual TLV tag hex matches spec', () => {
      assert.equal(
        encodeTLV(1, ZATCA_OFFICIAL.sellerName),
        ZATCA_EXPECTED_TLV[1],
        'Tag 1 (Seller Name)',
      );
      assert.equal(
        encodeTLV(2, ZATCA_OFFICIAL.vatNumber),
        ZATCA_EXPECTED_TLV[2],
        'Tag 2 (VAT Number)',
      );
      assert.equal(
        encodeTLV(3, ZATCA_OFFICIAL.timestamp),
        ZATCA_EXPECTED_TLV[3],
        'Tag 3 (Timestamp)',
      );
      assert.equal(
        encodeTLV(4, ZATCA_OFFICIAL.totalWithVat),
        ZATCA_EXPECTED_TLV[4],
        'Tag 4 (Invoice Total)',
      );
      assert.equal(
        encodeTLV(5, ZATCA_OFFICIAL.vatTotal),
        ZATCA_EXPECTED_TLV[5],
        'Tag 5 (VAT Total)',
      );
    });

    it('decoded Base64 values match original input', () => {
      const result = generatePhase1TLV({
        sellerName: ZATCA_OFFICIAL.sellerName,
        vatNumber: ZATCA_OFFICIAL.vatNumber,
        timestamp: ZATCA_OFFICIAL.timestamp,
        totalWithVat: ZATCA_OFFICIAL.totalWithVat,
        vatTotal: ZATCA_OFFICIAL.vatTotal,
      });

      const entries = decodeTLV(result);

      assert.equal(entries.length, 5, 'Should have exactly 5 TLV entries');

      assert.equal(entries[0].tag, 1);
      assert.equal(entries[0].value, ZATCA_OFFICIAL.sellerName);

      assert.equal(entries[1].tag, 2);
      assert.equal(entries[1].value, ZATCA_OFFICIAL.vatNumber);

      assert.equal(entries[2].tag, 3);
      assert.equal(entries[2].value, ZATCA_OFFICIAL.timestamp);

      assert.equal(entries[3].tag, 4);
      assert.equal(entries[3].value, ZATCA_OFFICIAL.totalWithVat);

      assert.equal(entries[4].tag, 5);
      assert.equal(entries[4].value, ZATCA_OFFICIAL.vatTotal);
    });
  });

  // ---------------------------------------------------------------------------
  // Test 2: TLV Decoding / Tag Value Extraction
  // ---------------------------------------------------------------------------

  describe('Test 2: TLV Decoding / Tag Value Extraction', () => {
    it('decodes Phase 1 TLV with all 5 tags matching input', () => {
      const input = {
        sellerName: 'Test Seller Co.',
        vatNumber: '123456789012345',
        timestamp: '2023-06-15T10:00:00Z',
        totalWithVat: '500.50',
        vatTotal: '75.08',
      };

      const base64 = generatePhase1TLV(input);
      const entries = decodeTLV(base64);

      assert.equal(entries.length, 5);
      assert.equal(entries[0].tag, 1);
      assert.equal(entries[0].value, input.sellerName);
      assert.equal(entries[1].tag, 2);
      assert.equal(entries[1].value, input.vatNumber);
      assert.equal(entries[2].tag, 3);
      assert.equal(entries[2].value, input.timestamp);
      assert.equal(entries[3].tag, 4);
      assert.equal(entries[3].value, input.totalWithVat);
      assert.equal(entries[4].tag, 5);
      assert.equal(entries[4].value, input.vatTotal);
    });

    it('decodes Phase 2 TLV with all 9 tags matching input', () => {
      const input = {
        sellerName: 'Phase 2 Seller',
        vatNumber: '310122393500003',
        timestamp: '2023-08-20T09:15:30Z',
        totalWithVat: '1200.00',
        vatTotal: '180.00',
        invoiceHash: 'ab'.repeat(32),
        signatureValue: bytesBase64(64, 0x7a),
        publicKey: bytesBase64(65, 0x04),
        certificateSignature: bytesBase64(72, 0x9c),
      };

      const base64 = generatePhase2TLV(input);
      const entries = decodeTLV(base64);

      assert.equal(entries.length, 9);
      assert.equal(entries[0].tag, 1);
      assert.equal(entries[0].value, input.sellerName);
      assert.equal(entries[1].tag, 2);
      assert.equal(entries[1].value, input.vatNumber);
      assert.equal(entries[2].tag, 3);
      assert.equal(entries[2].value, input.timestamp);
      assert.equal(entries[3].tag, 4);
      assert.equal(entries[3].value, input.totalWithVat);
      assert.equal(entries[4].tag, 5);
      assert.equal(entries[4].value, input.vatTotal);
      assert.equal(entries[5].tag, 6);
      assert.equal(entries[5].value, Buffer.from(input.invoiceHash, 'hex').toString('base64'));
      assert.equal(entries[6].tag, 7);
      assert.equal(entries[6].value, input.signatureValue);
      assert.equal(entries[7].tag, 8);
      assert.equal(entries[7].valueHex, base64ToHex(input.publicKey));
      assert.equal(entries[8].tag, 9);
      assert.equal(entries[8].valueHex, base64ToHex(input.certificateSignature));
    });

    it('decodeTLV handles multi-byte length (0x81 prefix)', () => {
      // Create a TLV with a value ≥ 128 bytes to trigger 0x81 encoding
      const longValue = 'X'.repeat(150);
      const encoded = encodeTLV(1, longValue);
      const base64 = hexToBase64(encoded);
      const entries = decodeTLV(base64);

      assert.equal(entries.length, 1);
      assert.equal(entries[0].tag, 1);
      assert.equal(entries[0].length, 150);
      assert.equal(entries[0].value, longValue);
    });

    it('decodeTLV handles multi-byte length (0x82 prefix)', () => {
      const longValue = 'Y'.repeat(300);
      const encoded = encodeTLV(5, longValue);
      const base64 = hexToBase64(encoded);
      const entries = decodeTLV(base64);

      assert.equal(entries.length, 1);
      assert.equal(entries[0].tag, 5);
      assert.equal(entries[0].length, 300);
      assert.equal(entries[0].value, longValue);
    });
  });

  // ---------------------------------------------------------------------------
  // Test 3: ZATCA Field Format Requirements
  // ---------------------------------------------------------------------------

  describe('Test 3: ZATCA Field Format Requirements', () => {
    describe('VAT Number (Tag 2) — 15 digits', () => {
      it('encodes 15-digit VAT number preserving all digits', () => {
        const vatNumbers = [
          '310122393500003',
          '300000000000003',
          '123456789012345',
        ];

        for (const vat of vatNumbers) {
          assert.equal(vat.length, 15, `${vat} should be 15 digits`);
          const encoded = encodeTLV(2, vat);
          const base64 = hexToBase64(encoded);
          const entries = decodeTLV(base64);
          assert.equal(entries[0].value, vat, `VAT number ${vat} preserved`);
        }
      });

      it('length byte reflects exactly 15 characters', () => {
        const encoded = encodeTLV(2, '310122393500003');
        const lengthHex = encoded.slice(2, 4);
        assert.equal(lengthHex, '0F', 'Length should be 0x0F (15)');
      });
    });

    describe('Timestamp (Tag 3) — ISO 8601 formats', () => {
      const timestamps = [
        { value: '2022-04-25T15:30:00Z', label: 'UTC with Z suffix' },
        { value: '2022-04-25T15:30:00', label: 'no timezone' },
        { value: '2022-04-25 15:30:00', label: 'space separator' },
        { value: '2023-01-01T00:00:00Z', label: 'midnight UTC' },
        { value: '2023-12-31T23:59:59Z', label: 'end of year UTC' },
      ];

      for (const { value, label } of timestamps) {
        it(`encodes timestamp with ${label}: "${value}"`, () => {
          const encoded = encodeTLV(3, value);
          const base64 = hexToBase64(encoded);
          const entries = decodeTLV(base64);
          assert.equal(entries[0].tag, 3);
          assert.equal(entries[0].value, value);
        });
      }
    });

    describe('Amounts (Tags 4, 5) — decimal strings', () => {
      const amounts = [
        { value: '1000.00', label: 'exactly 2 decimal places' },
        { value: '0.00', label: 'zero' },
        { value: '999999.99', label: 'large amount' },
        { value: '0.01', label: 'small amount' },
        { value: '1234.56', label: 'typical amount' },
        { value: '1.00', label: 'single unit' },
      ];

      for (const { value, label } of amounts) {
        it(`encodes totalWithVat with ${label}: "${value}"`, () => {
          const encoded = encodeTLV(4, value);
          const base64 = hexToBase64(encoded);
          const entries = decodeTLV(base64);
          assert.equal(entries[0].tag, 4);
          assert.equal(entries[0].value, value);
        });

        it(`encodes vatTotal with ${label}: "${value}"`, () => {
          const encoded = encodeTLV(5, value);
          const base64 = hexToBase64(encoded);
          const entries = decodeTLV(base64);
          assert.equal(entries[0].tag, 5);
          assert.equal(entries[0].value, value);
        });
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Test 4: Arabic Seller Name (ZATCA requirement for KSA)
  // ---------------------------------------------------------------------------

  describe('Test 4: Arabic Seller Name', () => {
    it('encodes and roundtrips Arabic seller name', () => {
      const arabicName = 'شركة الأحلام للتجارة';
      const encoded = encodeTLV(1, arabicName);
      const base64 = hexToBase64(encoded);
      const entries = decodeTLV(base64);

      assert.equal(entries.length, 1);
      assert.equal(entries[0].tag, 1);
      assert.equal(entries[0].value, arabicName);
    });

    it('byte length reflects UTF-8 encoding (Arabic = 2 bytes each)', () => {
      const arabicName = 'شركة الأحلام للتجارة';

      // Calculate expected UTF-8 byte length
      const expectedByteLength = new TextEncoder().encode(arabicName).length;

      const encoded = encodeTLV(1, arabicName);

      // Extract length from TLV (2nd byte, since tag < 0x80 and length < 0x80)
      const lengthHex = encoded.slice(2, 4);
      const encodedLength = parseInt(lengthHex, 16);

      assert.equal(encodedLength, expectedByteLength);
      assert.equal(encodedLength, 38, 'Expected 38 UTF-8 bytes for this Arabic string');

      // Verify Arabic chars are 2 bytes each (no 3-byte or 4-byte sequences)
      const bytes = new TextEncoder().encode(arabicName);
      for (let i = 0; i < bytes.length; i++) {
        if (bytes[i] >= 0xC0) {
          // Leading byte: check it's a 2-byte sequence (0b110xxxxx = 0xC0-0xDF)
          assert.ok(
            bytes[i] <= 0xDF,
            `Byte at ${i} (0x${bytes[i].toString(16)}) should be a 2-byte UTF-8 lead`,
          );
        }
      }
    });

    it('Arabic name works in full Phase 1 generation', () => {
      const arabicData = {
        sellerName: 'شركة الأحلام للتجارة',
        vatNumber: '310122393500003',
        timestamp: '2022-04-25T15:30:00Z',
        totalWithVat: '500.00',
        vatTotal: '75.00',
      };

      const base64 = generatePhase1TLV(arabicData);
      const entries = decodeTLV(base64);

      assert.equal(entries.length, 5);
      assert.equal(entries[0].value, arabicData.sellerName);
      assert.equal(entries[1].value, arabicData.vatNumber);
      assert.equal(entries[2].value, arabicData.timestamp);
      assert.equal(entries[3].value, arabicData.totalWithVat);
      assert.equal(entries[4].value, arabicData.vatTotal);
    });

    it('mixed Arabic and English names roundtrip correctly', () => {
      const mixedName = 'شركة Gulf Trading Co.';
      const encoded = encodeTLV(1, mixedName);
      const base64 = hexToBase64(encoded);
      const entries = decodeTLV(base64);

      assert.equal(entries[0].value, mixedName);
    });
  });

  // ---------------------------------------------------------------------------
  // Test 5: Phase 2 Tag Structure Compliance
  // ---------------------------------------------------------------------------

  describe('Test 5: Phase 2 Tag Structure Compliance', () => {
    const phase2Input = {
      sellerName: 'Compliant Seller',
      vatNumber: '310122393500003',
      timestamp: '2023-07-10T12:00:00Z',
      totalWithVat: '1150.00',
      vatTotal: '150.00',
      invoiceHash: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
      signatureValue: bytesBase64(64, 0xab),
      publicKey: bytesBase64(65, 0x04),
      certificateSignature: bytesBase64(72, 0xcd),
    };

    it('all 9 tags present in sequential order (1→9)', () => {
      const base64 = generatePhase2TLV(phase2Input);
      const entries = decodeTLV(base64);

      assert.equal(entries.length, 9);

      for (let i = 0; i < 9; i++) {
        assert.equal(entries[i].tag, i + 1, `Position ${i} should be tag ${i + 1}`);
      }
    });

    it('tags 1-5 are byte-identical to Phase 1 output', () => {
      const phase1Base64 = generatePhase1TLV({
        sellerName: phase2Input.sellerName,
        vatNumber: phase2Input.vatNumber,
        timestamp: phase2Input.timestamp,
        totalWithVat: phase2Input.totalWithVat,
        vatTotal: phase2Input.vatTotal,
      });
      const phase2Base64 = generatePhase2TLV(phase2Input);

      const phase1Hex = base64ToHex(phase1Base64);
      const phase2Hex = base64ToHex(phase2Base64);

      assert.ok(
        phase2Hex.startsWith(phase1Hex),
        'Phase 2 hex should start with Phase 1 hex (tags 1-5 identical)',
      );
    });

    it('tag 6 (invoiceHash) handles 64-char hex string (SHA-256)', () => {
      const sha256Hash = 'a'.repeat(64);
      const encoded = encodeTLV(6, sha256Hash);
      const base64 = hexToBase64(encoded);
      const entries = decodeTLV(base64);

      assert.equal(entries[0].tag, 6);
      assert.equal(entries[0].length, 64);
      assert.equal(entries[0].value, sha256Hash);
    });

    it('tag 7 (signatureValue) handles long base64 string (~96 chars)', () => {
      const ecdsaSignature = 'MEUCIQDDXe8T1HFp2YiGqZF5P7K3vMGz4+JF6L1VZQU5/tb+AIgPx/0wGJp4n5mJf9g3j7s/1P8M8n0wE+qCk0yJPj8=';
      const encoded = encodeTLV(7, ecdsaSignature);
      const base64 = hexToBase64(encoded);
      const entries = decodeTLV(base64);

      assert.equal(entries[0].tag, 7);
      assert.equal(entries[0].value, ecdsaSignature);
    });

    it('tag 8 (publicKey) handles base64 public key (~88 chars)', () => {
      const publicKey = 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEEVs/o5+UzQ0q6OMnSVBT6Cv8BjO8NxrBzjLqFLf5F9JXvF1V9Z5J3x8v5L1y5qK3f1r5P0L3w==';
      const encoded = encodeTLV(8, publicKey);
      const base64 = hexToBase64(encoded);
      const entries = decodeTLV(base64);

      assert.equal(entries[0].tag, 8);
      assert.equal(entries[0].value, publicKey);
    });

    it('tag 9 (certificateSignature) handles base64 cert signature', () => {
      const certSig = 'YmVydHNpZ25hdHVyZSB2YWx1ZSB0aGF0IGlzIHJlYWxseSBsb25nIGFuZCBtYWtlcyBzZW5zZQ==';
      const encoded = encodeTLV(9, certSig);
      const base64 = hexToBase64(encoded);
      const entries = decodeTLV(base64);

      assert.equal(entries[0].tag, 9);
      assert.equal(entries[0].value, certSig);
    });

    it('full Phase 2 with realistic data decodes correctly with all 9 values', () => {
      const base64 = generatePhase2TLV(phase2Input);
      const entries = decodeTLV(base64);

      assert.equal(entries.length, 9);
      assert.equal(entries[0].value, phase2Input.sellerName);
      assert.equal(entries[1].value, phase2Input.vatNumber);
      assert.equal(entries[2].value, phase2Input.timestamp);
      assert.equal(entries[3].value, phase2Input.totalWithVat);
      assert.equal(entries[4].value, phase2Input.vatTotal);
      assert.equal(entries[5].valueHex, textToHex(Buffer.from(phase2Input.invoiceHash, 'hex').toString('base64')));
      assert.equal(entries[6].valueHex, textToHex(phase2Input.signatureValue));
      assert.equal(entries[7].valueHex, base64ToHex(phase2Input.publicKey));
      assert.equal(entries[8].valueHex, base64ToHex(phase2Input.certificateSignature));
    });
  });

  // ---------------------------------------------------------------------------
  // Test 6: Cross-validation with @talha7k/zatca
  // ---------------------------------------------------------------------------

  describe('Test 6: Cross-validation with @talha7k/zatca', () => {
    before(() => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const zatca = require('@talha7k/zatca');
        const tlv = zatca.default ?? zatca;
        encodeTLVMain = tlv.encodeTLV;
        genPhase1Main = tlv.generatePhase1TLV;
        genPhase2Main = tlv.generatePhase2TLV;
        crossValidationAvailable = true;
      } catch {
        // @talha7k/zatca not installed — skip tests
        crossValidationAvailable = false;
      }
    });

    it('encodeTLV output matches @talha7k/zatca encodeTLV', () => {
      if (!crossValidationAvailable) return;
      assert.ok(encodeTLVMain, '@talha7k/zatca encodeTLV should be available');

      const testCases = [
        { tag: 1, value: 'Bobs Records' },
        { tag: 2, value: '310122393500003' },
        { tag: 3, value: '2022-04-25T15:30:00Z' },
        { tag: 4, value: '1000.00' },
        { tag: 5, value: '150.00' },
        { tag: 1, value: 'شركة الأحلام للتجارة' },
        { tag: 6, value: 'a'.repeat(64) },
      ];

      for (const { tag, value } of testCases) {
        assert.equal(
          encodeTLV(tag, value),
          encodeTLVMain!(tag, value),
          `encodeTLV(${tag}, "${value.slice(0, 20)}...") should match`,
        );
      }
    });

    it('generatePhase1TLV output matches @talha7k/zatca', () => {
      if (!crossValidationAvailable) return;
      assert.ok(genPhase1Main, '@talha7k/zatca generatePhase1TLV should be available');

      const data = {
        sellerName: 'Bobs Records',
        vatNumber: '310122393500003',
        timestamp: '2022-04-25T15:30:00Z',
        totalWithVat: '1000.00',
        vatTotal: '150.00',
      };

      assert.equal(
        generatePhase1TLV(data),
        genPhase1Main!(data),
      );
    });

    it('generatePhase2TLV output matches @talha7k/zatca', () => {
      if (!crossValidationAvailable) return;
      assert.ok(genPhase2Main, '@talha7k/zatca generatePhase2TLV should be available');

      const data = {
        sellerName: 'Test Seller',
        vatNumber: '310122393500003',
        timestamp: '2023-07-10T12:00:00Z',
        totalWithVat: '1150.00',
        vatTotal: '150.00',
        invoiceHash: 'a'.repeat(64),
        signatureValue: 'b'.repeat(96),
        publicKey: 'c'.repeat(88),
        certificateSignature: 'd'.repeat(96),
      };

      assert.equal(
        generatePhase2TLV(data),
        genPhase2Main!(data),
      );
    });

    it('various inputs produce matching output', () => {
      if (!crossValidationAvailable) return;

      const inputs = [
        {
          sellerName: 'Acme Corp',
          vatNumber: '300000000000003',
          timestamp: '2023-12-15T14:30:00',
          totalWithVat: '115.00',
          vatTotal: '15.00',
        },
        {
          sellerName: 'شركة التقنية',
          vatNumber: '123456789012345',
          timestamp: '2024-01-01T00:00:00Z',
          totalWithVat: '0.01',
          vatTotal: '0.00',
        },
      ];

      for (const data of inputs) {
        assert.equal(
          generatePhase1TLV(data),
          genPhase1Main!(data),
          `Phase 1 mismatch for seller "${data.sellerName}"`,
        );
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Test 7: Edge Cases from ZATCA Spec
  // ---------------------------------------------------------------------------

  describe('Test 7: Edge Cases from ZATCA Spec', () => {
    describe('no padding/separators between TLV pairs', () => {
      it('Phase 1 hex has no extra bytes between tags', () => {
        const base64 = generatePhase1TLV({
          sellerName: 'Test',
          vatNumber: '123456789012345',
          timestamp: '2023-01-01T00:00:00Z',
          totalWithVat: '100.00',
          vatTotal: '15.00',
        });

        const hex = base64ToHex(base64);
        const entries = decodeTLV(base64);

        // Verify total consumed bytes equals total hex length
        let totalConsumed = 0;
        for (const entry of entries) {
          totalConsumed += 2; // tag
          totalConsumed += entry.length < 128 ? 2 : entry.length < 256 ? 4 : 6; // length
          totalConsumed += entry.length * 2; // value
        }

        assert.equal(
          totalConsumed,
          hex.length,
          'Total consumed bytes should equal hex length (no gaps between TLV pairs)',
        );
      });

      it('Phase 2 hex has no extra bytes between tags', () => {
        const base64 = generatePhase2TLV({
          sellerName: 'Test',
          vatNumber: '123456789012345',
          timestamp: '2023-01-01T00:00:00Z',
          totalWithVat: '100.00',
          vatTotal: '15.00',
          invoiceHash: 'a'.repeat(64),
          signatureValue: 'b'.repeat(96),
          publicKey: 'c'.repeat(88),
          certificateSignature: 'd'.repeat(96),
        });

        const hex = base64ToHex(base64);
        const entries = decodeTLV(base64);

        let totalConsumed = 0;
        for (const entry of entries) {
          totalConsumed += 2; // tag
          totalConsumed += entry.length < 128 ? 2 : entry.length < 256 ? 4 : 6; // length
          totalConsumed += entry.length * 2; // value
        }

        assert.equal(
          totalConsumed,
          hex.length,
          'Total consumed bytes should equal hex length (no gaps)',
        );
      });
    });

    describe('UTF-8 encoding for Arabic (not UTF-16)', () => {
      it('Arabic chars use 2-byte UTF-8 sequences, not UTF-16', () => {
        const arabicName = 'شركة';
        const encoded = encodeTLV(1, arabicName);
        const valueHex = encoded.slice(4); // skip tag + length

        // Parse hex bytes and verify they are valid UTF-8
        const bytes = new Uint8Array(
          valueHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)),
        );

        // UTF-8 Arabic chars: 0xC0-0xDF lead byte followed by 0x80-0xBF continuation byte
        for (let i = 0; i < bytes.length; i++) {
          if (bytes[i] >= 0xC0 && bytes[i] <= 0xDF) {
            // 2-byte UTF-8 sequence
            assert.ok(
              i + 1 < bytes.length,
              `Lead byte at ${i} should have continuation byte`,
            );
            assert.ok(
              bytes[i + 1] >= 0x80 && bytes[i + 1] <= 0xBF,
              `Continuation byte at ${i + 1} should be 0x80-0xBF, got 0x${bytes[i + 1].toString(16)}`,
            );
            i++; // skip continuation byte
          }
        }

        // UTF-16 would have 0x00 bytes for ASCII range chars — verify no null bytes
        for (const byte of bytes) {
          assert.notEqual(byte, 0x00, 'UTF-8 should not contain null bytes (would indicate UTF-16)');
        }

        // Verify decoded value matches original
        const decoded = new TextDecoder().decode(bytes);
        assert.equal(decoded, arabicName);
      });
    });

    describe('tag and length are single bytes for small values', () => {
      it('tag ≤ 9 always uses 1 byte', () => {
        for (let tag = 1; tag <= 9; tag++) {
          const encoded = encodeTLV(tag, 'test');
          const tagByte = parseInt(encoded.slice(0, 2), 16);
          assert.equal(tagByte, tag, `Tag ${tag} should encode as single byte 0x${tag.toString(16)}`);
        }
      });

      it('length < 128 uses 1 byte (no 0x81 prefix)', () => {
        // Empty string
        let encoded = encodeTLV(1, '');
        assert.equal(encoded.slice(2, 4), '00', 'Empty string length should be 0x00');

        // 1-byte value
        encoded = encodeTLV(1, 'A');
        assert.equal(encoded.slice(2, 4), '01', '1-byte value length should be 0x01');

        // 127-byte value (max for single-byte length)
        encoded = encodeTLV(1, 'X'.repeat(127));
        assert.equal(encoded.slice(2, 4), '7F', '127-byte value length should be 0x7F');

        // 128-byte value (should use 0x81 prefix)
        encoded = encodeTLV(1, 'X'.repeat(128));
        assert.equal(encoded.slice(2, 4), '81', '128-byte value should use 0x81 prefix');
      });
    });

    describe('hex output is valid (uppercase, even length)', () => {
      it('encodeTLV produces uppercase hex', () => {
        const result = encodeTLV(1, 'hello');
        assert.equal(result, result.toUpperCase(), 'Hex should be uppercase');
      });

      it('encodeTLV produces even-length hex', () => {
        const result = encodeTLV(1, 'hello');
        assert.equal(result.length % 2, 0, 'Hex string should have even length');
      });

      it('hex contains only valid hex characters', () => {
        const hexChars = /^[0-9A-F]+$/;
        const result = encodeTLV(1, 'Test Value 123!');
        assert.ok(hexChars.test(result), 'Should contain only [0-9A-F]');
      });

      it('hexToBase64 and base64ToHex roundtrip preserves data', () => {
        const original = encodeTLV(1, 'Bobs Records');
        const base64 = hexToBase64(original);
        const recovered = base64ToHex(base64);
        assert.equal(recovered, original, 'Roundtrip should preserve hex');
      });
    });
  });
});
