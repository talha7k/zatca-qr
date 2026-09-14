import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generatePhase1TLV } from '../src/phase1.js';
import { base64ToHex } from '../src/tlv.js';

const validData = {
  sellerName: 'Acme Corp',
  vatNumber: '300000000000003',
  timestamp: '2023-12-15T14:30:00',
  totalWithVat: '115.00',
  vatTotal: '15.00',
};

describe('generatePhase1TLV', () => {
  it('generates a valid Base64 string', () => {
    const result = generatePhase1TLV(validData);
    assert.ok(result.length > 0);
    // Should be valid Base64
    assert.doesNotThrow(() => atob(result));
  });

  it('decodes to TLV hex with all 5 tags', () => {
    const result = generatePhase1TLV(validData);
    const hex = base64ToHex(result);

    // Verify tag 1 appears at the start
    assert.ok(hex.startsWith('01'), 'Should start with tag 01');

    // Find all tags in the hex
    assert.ok(hex.includes('01'), 'Tag 1 (sellerName) present');
    assert.ok(hex.includes('02'), 'Tag 2 (vatNumber) present');
    assert.ok(hex.includes('03'), 'Tag 3 (timestamp) present');
    assert.ok(hex.includes('04'), 'Tag 4 (totalWithVat) present');
    assert.ok(hex.includes('05'), 'Tag 5 (vatTotal) present');
  });

  it('tags appear in sequential order', () => {
    const result = generatePhase1TLV(validData);
    const hex = base64ToHex(result);

    const pos1 = hex.indexOf('01');
    const pos2 = hex.indexOf('02', pos1);
    const pos3 = hex.indexOf('03', pos2);
    const pos4 = hex.indexOf('04', pos3);
    const pos5 = hex.indexOf('05', pos4);

    assert.ok(pos1 < pos2, 'Tag 1 before tag 2');
    assert.ok(pos2 < pos3, 'Tag 2 before tag 3');
    assert.ok(pos3 < pos4, 'Tag 3 before tag 4');
    assert.ok(pos4 < pos5, 'Tag 4 before tag 5');
  });

  it('throws on missing sellerName', () => {
    assert.throws(
      () => generatePhase1TLV({ ...validData, sellerName: '' }),
      /sellerName is required/,
    );
  });

  it('throws on missing vatNumber', () => {
    assert.throws(
      () => generatePhase1TLV({ ...validData, vatNumber: '' }),
      /vatNumber is required/,
    );
  });

  it('throws on missing timestamp', () => {
    assert.throws(
      () => generatePhase1TLV({ ...validData, timestamp: '' }),
      /timestamp is required/,
    );
  });

  it('throws on missing totalWithVat', () => {
    assert.throws(
      () => generatePhase1TLV({ ...validData, totalWithVat: '' }),
      /totalWithVat is required/,
    );
  });

  it('throws on whitespace-only sellerName', () => {
    assert.throws(
      () => generatePhase1TLV({ ...validData, sellerName: '   ' }),
      /sellerName is required/,
    );
  });

  it('defaults vatTotal to "0.00" when omitted', () => {
    const data = { ...validData, vatTotal: undefined };
    const result = generatePhase1TLV(data);
    const hex = base64ToHex(result);

    // Find tag 5 and verify the value is "0.00"
    const pos5 = hex.indexOf('05');
    const lenHex = hex.slice(pos5 + 2, pos5 + 4);
    const len = parseInt(lenHex, 16);
    const valueHex = hex.slice(pos5 + 4, pos5 + 4 + len * 2);
    const value = new TextDecoder().decode(
      new Uint8Array(valueHex.match(/.{2}/g)!.map((b) => parseInt(b, 16))),
    );
    assert.equal(value, '0.00');
  });

  it('handles Arabic seller names correctly', () => {
    const arabicData = { ...validData, sellerName: 'شركة الأحلام' };
    const result = generatePhase1TLV(arabicData);
    assert.ok(result.length > 0);
    assert.doesNotThrow(() => atob(result));
  });

  it('trims whitespace from fields', () => {
    const data = {
      ...validData,
      sellerName: '  Acme Corp  ',
      vatNumber: '  300000000000003  ',
    };
    const trimmedData = { ...validData };
    assert.equal(
      generatePhase1TLV(data),
      generatePhase1TLV(trimmedData),
    );
  });

  it('produces consistent output for the same input', () => {
    const result1 = generatePhase1TLV(validData);
    const result2 = generatePhase1TLV(validData);
    assert.equal(result1, result2);
  });
});
