import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { encodeTLV, encodeTLVBytes, hexToBase64, base64ToHex, base64ToBytes, hexToBytes } from '../src/tlv.js';

describe('encodeTLV', () => {
  it('encodes ASCII value with correct tag, length, and value', () => {
    // Tag 1, "Acme Corp" = 9 bytes
    const result = encodeTLV(1, 'Acme Corp');
    assert.equal(result.slice(0, 2), '01'); // tag
    assert.equal(result.slice(2, 4), '09'); // length (9)
    // Verify value hex = UTF-8 bytes of "Acme Corp"
    const expected = '41636D6520436F7270';
    assert.equal(result.slice(4), expected);
  });

  it('encodes Arabic (multi-byte UTF-8) values correctly', () => {
    // "شركة الأحلام" — each Arabic char is 2 bytes
    const value = 'شركة الأحلام';
    const result = encodeTLV(1, value);
    assert.equal(result.slice(0, 2), '01'); // tag

    // Calculate expected byte length (each Arabic char = 2 bytes, space = 1 byte)
    const expectedLength = new TextEncoder().encode(value).length;
    assert.equal(result.slice(2, 4), expectedLength.toString(16).padStart(2, '0').toUpperCase());

    // Verify value portion is the UTF-8 hex of the Arabic string
    const valueBytes = new TextEncoder().encode(value);
    const expectedHex = Array.from(valueBytes)
      .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
      .join('');
    assert.equal(result.slice(4), expectedHex);
  });

  it('uses 0x81 prefix for values ≥128 bytes', () => {
    // Create a string exactly 128 bytes long
    const value = 'A'.repeat(128);
    const result = encodeTLV(2, value);
    assert.equal(result.slice(0, 2), '02'); // tag
    assert.equal(result.slice(2, 4), '81'); // 0x81 prefix for ≥128 bytes
    assert.equal(result.slice(4, 6), '80'); // length = 128 = 0x80
  });

  it('uses 0x82 prefix for values ≥256 bytes', () => {
    // Create a string exactly 256 bytes long
    const value = 'B'.repeat(256);
    const result = encodeTLV(3, value);
    assert.equal(result.slice(0, 2), '03'); // tag
    assert.equal(result.slice(2, 4), '82'); // 0x82 prefix for ≥256 bytes
    assert.equal(result.slice(4, 8), '0100'); // length = 256 = 0x0100
  });

  it('uses 0x82 prefix for values between 256 and 65535 bytes', () => {
    // Create a string exactly 300 bytes long (well within 0x82 range)
    const value = 'C'.repeat(300);
    const result = encodeTLV(9, value);
    assert.equal(result.slice(0, 2), '09'); // tag
    assert.equal(result.slice(2, 4), '82'); // 0x82 prefix
    assert.equal(result.slice(4, 8), '012C'); // length = 300 = 0x012C
  });

  it('handles empty string (zero length)', () => {
    const result = encodeTLV(1, '');
    assert.equal(result.slice(0, 2), '01'); // tag
    assert.equal(result.slice(2, 4), '00'); // length = 0
    assert.equal(result.length, 4); // tag + length, no value
  });

  it('handles special characters', () => {
    const value = 'Hello & "World" <test>';
    const result = encodeTLV(1, value);
    const expectedLength = new TextEncoder().encode(value).length;
    assert.equal(result.slice(2, 4), expectedLength.toString(16).padStart(2, '0').toUpperCase());
  });

  it('handles emojis (4-byte UTF-8)', () => {
    const value = '🧾💰';
    const result = encodeTLV(1, value);
    // 🧾 = 4 bytes, 💰 = 4 bytes = 8 total
    assert.equal(result.slice(2, 4), '08');
    const valueBytes = new TextEncoder().encode(value);
    const expectedHex = Array.from(valueBytes)
      .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
      .join('');
    assert.equal(result.slice(4), expectedHex);
  });

  it('handles tag numbers with different values', () => {
    const r1 = encodeTLV(5, 'test');
    assert.equal(r1.slice(0, 2), '05');

    const r9 = encodeTLV(9, 'test');
    assert.equal(r9.slice(0, 2), '09');
  });
});

describe('encodeTLVBytes', () => {
  it('encodes raw bytes without UTF-8 conversion', () => {
    const result = encodeTLVBytes(6, new Uint8Array([0x00, 0xff, 0x41]));

    assert.equal(result, '060300FF41');
  });

  it('uses 0x81 prefix for raw values >=128 bytes', () => {
    const result = encodeTLVBytes(8, new Uint8Array(128).fill(0xcc));

    assert.equal(result.slice(0, 2), '08');
    assert.equal(result.slice(2, 4), '81');
    assert.equal(result.slice(4, 6), '80');
  });
});

describe('hexToBase64', () => {
  it('converts hex to base64 correctly', () => {
    const hex = '48656C6C6F'; // "Hello"
    const result = hexToBase64(hex);
    assert.equal(result, 'SGVsbG8=');
  });

  it('converts empty hex to empty base64', () => {
    const result = hexToBase64('');
    assert.equal(result, '');
  });

  it('roundtrips: hex → base64 → hex', () => {
    const original = '010941636D6520436F727002083132333435363738';
    const base64 = hexToBase64(original);
    const hex = base64ToHex(base64);
    assert.equal(hex, original);
  });

  it('handles multi-byte hex (Arabic UTF-8)', () => {
    const hex = 'D8B4D8B1D983D8A9'; // Arabic chars
    const base64 = hexToBase64(hex);
    const recovered = base64ToHex(base64);
    assert.equal(recovered, hex);
  });
});

describe('base64ToHex', () => {
  it('converts base64 to hex correctly', () => {
    const base64 = 'SGVsbG8=';
    const result = base64ToHex(base64);
    assert.equal(result, '48656C6C6F');
  });

  it('roundtrips: base64 → hex → base64', () => {
    const original = 'AQlBY21lIENvcnA=';
    const hex = base64ToHex(original);
    const base64 = hexToBase64(hex);
    assert.equal(base64, original);
  });

  it('handles base64 without padding', () => {
    // Some base64 strings may not have padding
    const base64 = 'SGVsbG8'; // "Hello" without padding
    const hex = base64ToHex(base64);
    assert.equal(hex, '48656C6C6F');
  });
});

describe('byte conversion helpers', () => {
  it('converts base64 to raw bytes', () => {
    assert.deepEqual(Array.from(base64ToBytes('AP9B')), [0x00, 0xff, 0x41]);
  });

  it('converts hex to raw bytes', () => {
    assert.deepEqual(Array.from(hexToBytes('00FF41')), [0x00, 0xff, 0x41]);
  });
});
