# @talha7k/zatca-qr

![npm version](https://img.shields.io/npm/v/@talha7k/zatca-qr?style=flat-square)
![license](https://img.shields.io/npm/l/@talha7k/zatca-qr?style=flat-square)
![typescript](https://img.shields.io/badge/TypeScript-5.7-blue?style=flat-square)
![zero deps](https://img.shields.io/badge/dependencies-0-green?style=flat-square)

**Browser-first ZATCA QR code TLV encoding for Saudi Arabia e-invoicing.**

Zero runtime dependencies. Works in browsers and Node.js. Supports both **Phase 1** (simplified) and **Phase 2** (compliant) invoices with full TypeScript types.

## Why @talha7k/zatca-qr?

| Feature | @talha7k/zatca-qr | @axenda/zatca | zatca-qr-generator |
|---------|-------------------|---------------|-------------------|
| Zero dependencies | ✅ | ❌ | ❌ |
| Browser-first | ✅ | ❌ | ❌ |
| TypeScript | ✅ | ❌ | ✅ |
| Dual ESM + CJS | ✅ | ❌ | ❌ |
| Phase 1 + Phase 2 | ✅ | ✅ | ✅ (P2 only) |
| Tree-shakeable | ✅ | ❌ | ❌ |
| QR image generation | ✅ (optional) | ✅ | ✅ |

## Features

- **Zero dependencies** — no Node.js APIs, no `Buffer`, no `crypto`
- **Browser + Node.js** — uses `TextEncoder`, `btoa`, `Uint8Array` only
- **Dual ESM + CJS** — tree-shakeable with `"sideEffects": false`
- **Phase 1 & Phase 2** — 5-tag simplified and 9-tag compliant encoding
- **ZATCA package parity** — Phase 2 tags match the official SDK shape used by `@talha7k/zatca`
- **QR image generation** — optional `qrcode` peer dependency
- **Full TypeScript** — declaration files, strict mode, all types exported
- **BER-TLV DER** — proper multi-byte length encoding (0x81, 0x82)

## Installation

```bash
# npm
npm install @talha7k/zatca-qr

# pnpm
pnpm add @talha7k/zatca-qr

# yarn
yarn add @talha7k/zatca-qr

# For QR image generation (optional)
npm install qrcode
```

## Quick Start

### Phase 1 — Simplified Invoice (5 Tags)

```typescript
import { generatePhase1TLV } from '@talha7k/zatca-qr';

const base64 = generatePhase1TLV({
  sellerName: 'Acme Corp',
  vatNumber: '300000000000003',
  timestamp: '2023-12-15T14:30:00',
  totalWithVat: '115.00',
  vatTotal: '15.00',
});

console.log(base64);
// AQlBY21lIENvcnACAqMDAwMDAwMDAwMDAwMDAWDzIwMjMtMTItMTVUMTQ6MzA6MDAYBTExNS4wMBYGMTAuMDA=
```

### Phase 2 — Compliant Invoice (9 Tags)

```typescript
import { generatePhase2TLV } from '@talha7k/zatca-qr';

const base64 = generatePhase2TLV({
  sellerName: 'Acme Corp',
  vatNumber: '300000000000003',
  timestamp: '2023-12-15T14:30:00',
  totalWithVat: '115.00',
  vatTotal: '15.00',
  invoiceHash: 'YWJjZGVmZzEyMzQ1Njc4OTA=',
  signatureValue: 'c2lnbmF0dXJldmFsdWU=',
  publicKey: 'cHVibGlja2V5',
  certificateSignature: 'Y2VydHNpZw==',
});
```

### QR Code Image

```typescript
import { generatePhase1QRImage } from '@talha7k/zatca-qr';

const dataUrl = await generatePhase1QRImage(
  {
    sellerName: 'Acme Corp',
    vatNumber: '300000000000003',
    timestamp: '2023-12-15T14:30:00',
    totalWithVat: '115.00',
    vatTotal: '15.00',
  },
  { width: 300, errorCorrectionLevel: 'H' },
);

// Use in HTML: <img src="${dataUrl}" />
```

### Node.js (CommonJS)

```javascript
const { generatePhase1TLV } = require('@talha7k/zatca-qr');

const base64 = generatePhase1TLV({
  sellerName: 'Acme Corp',
  vatNumber: '300000000000003',
  timestamp: '2023-12-15T14:30:00',
  totalWithVat: '115.00',
  vatTotal: '15.00',
});
```

### Error Handling

```typescript
import { generatePhase1TLV } from '@talha7k/zatca-qr';

try {
  const base64 = generatePhase1TLV({
    sellerName: '',  // ← missing required field
    vatNumber: '300000000000003',
    timestamp: '2023-12-15T14:30:00',
    totalWithVat: '115.00',
  });
} catch (err) {
  console.error('Validation failed:', (err as Error).message);
}
```

### React Example

```tsx
import { useState, useEffect } from 'react';
import { generatePhase1QRImage } from '@talha7k/zatca-qr';

function InvoiceQR() {
  const [src, setSrc] = useState('');

  useEffect(() => {
    generatePhase1QRImage({
      sellerName: 'Acme Corp',
      vatNumber: '300000000000003',
      timestamp: '2023-12-15T14:30:00',
      totalWithVat: '115.00',
      vatTotal: '15.00',
    }, { width: 200, errorCorrectionLevel: 'H' }).then(setSrc);
  }, []);

  return src ? <img src={src} alt="ZATCA QR" width={200} /> : <p>Loading QR...</p>;
}
```

## API Reference

### Types

#### `Phase1QRData`

| Field          | Type     | Required | Description                              |
|----------------|----------|----------|------------------------------------------|
| `sellerName`   | `string` | Yes      | Seller name (Arabic or English)          |
| `vatNumber`    | `string` | Yes      | 15-digit TRN                             |
| `timestamp`    | `string` | Yes      | ISO 8601 datetime                        |
| `totalWithVat` | `string` | Yes      | Total including VAT (e.g., "115.00")     |
| `vatTotal`     | `string` | No       | VAT amount (defaults to "0.00")          |

#### `Phase2QRData`

Extends `Phase1QRData` with:

| Field                  | Type     | Required | Description                            |
|------------------------|----------|----------|----------------------------------------|
| `invoiceHash`          | `string` | Yes      | SHA-256 hash (hex or base64)           |
| `signatureValue`       | `string` | Yes      | ECDSA signature (base64)               |
| `publicKey`            | `string` | Yes      | ECDSA public key (base64)              |
| `certificateSignature` | `string` | Yes      | ZATCA CA signature (base64)            |

#### `QRImageOptions`

| Field                    | Type                                | Default | Description          |
|--------------------------|-------------------------------------|---------|----------------------|
| `width`                  | `number`                            | `200`   | Image width in px    |
| `margin`                 | `number`                            | `1`     | Margin in modules    |
| `errorCorrectionLevel`   | `'L' \| 'M' \| 'Q' \| 'H'`        | `'M'`   | Error correction     |

### Functions

#### `generatePhase1TLV(data: Phase1QRData): string`

Generates Phase 1 TLV as a Base64 string (5 tags). Throws on missing required fields.

Alias: `generatePhase1QRCodeData(data)`.

#### `generatePhase2TLV(data: Phase2QRData): string`

Generates Phase 2 TLV as a Base64 string (9 tags). Tags 1-7 are UTF-8 text as emitted by the official ZATCA SDK. Tags 8-9 are binary DER values decoded from their base64 input. `invoiceHash` also accepts a 64-character SHA-256 hex digest.

Alias: `generateQRCodeData(data)`.

#### `generatePhase1QRImage(data: Phase1QRData, options?: QRImageOptions): Promise<string>`

Generates Phase 1 QR code as a PNG data URL. Requires optional `qrcode` peer dependency.

#### `generatePhase2QRImage(data: Phase2QRData, options?: QRImageOptions): Promise<string>`

Generates Phase 2 QR code as a PNG data URL. Requires optional `qrcode` peer dependency.

#### `encodeTLV(tag: number, value: string): string`

Encodes a single TLV pair as a hex string with BER-TLV DER length encoding.

#### `encodeTLVBytes(tag: number, value: Uint8Array): string`

Encodes a single TLV pair from raw bytes as a hex string with BER-TLV DER length encoding.

#### `hexToBase64(hex: string): string`

Converts a hex string to Base64.

#### `base64ToHex(base64: string): string`

Converts a Base64 string to hex.

#### `hexToBytes(hex: string): Uint8Array`

Converts a hex string to raw bytes.

#### `base64ToBytes(base64: string): Uint8Array`

Converts a Base64 string to raw bytes.

## ZATCA TLV Tag Reference

| Tag | Field                  | Description                              | Example                        |
|-----|------------------------|------------------------------------------|--------------------------------|
| 01  | Seller Name            | Registered seller name                   | `Acme Corp`                    |
| 02  | VAT Registration Number| 15-digit TRN                             | `300000000000003`              |
| 03  | Invoice Timestamp      | ISO 8601 date/time                       | `2023-12-15T14:30:00`          |
| 04  | Invoice Total          | Total amount with VAT                    | `115.00`                       |
| 05  | VAT Total              | VAT amount                               | `15.00`                        |
| 06  | Invoice Hash           | SHA-256 hash bytes (base64 input, or 64-char hex) | `YWJjZGVmZzEyMzQ1Njc4OTA=` |
| 07  | Digital Signature      | ECDSA signature bytes (base64 input)     | `c2lnbmF0dXJldmFsdWU=`        |
| 08  | Public Key             | Seller's ECDSA public key bytes (base64 input) | `cHVibGlja2V5`            |
| 09  | Certificate Signature  | ZATCA CA signature bytes (base64 input)  | `Y2VydHNpZw==`                 |

**Phase 1** uses tags 1–5 (simplified invoices).
**Phase 2** uses tags 1–9 (fully compliant invoices).

## Browser Compatibility

Uses only standard Web APIs:

- `TextEncoder` — all modern browsers + Node.js 11+
- `btoa` / `atob` — all modern browsers + Node.js 16+
- `Uint8Array` — all modern browsers + Node.js

No polyfills needed for any browser released after 2020.

## License

[MIT](./LICENSE) &copy; talha7k

## Changelog

### [1.3.0] - 2026-09-14
- Phase 1 (5-tag) and Phase 2 (9-tag) BER-TLV encoding
- QR image generation via optional `qrcode` peer dependency
- Full TypeScript types with declaration maps
- Dual ESM + CJS output with tree-shaking support
- 105 tests including ZATCA spec compliance
