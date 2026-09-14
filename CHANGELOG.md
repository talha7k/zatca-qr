# Changelog

All notable changes to this project will be documented in this file.

## [1.3.0] - 2026-09-14

### Added
- Phase 1 (5-tag) BER-TLV encoding for simplified invoices
- Phase 2 (9-tag) BER-TLV encoding for compliant invoices, with binary TLV for tags 6–9
- QR code image generation via optional `qrcode` peer dependency
- `encodeTLV()`, `hexToBase64()`, `base64ToHex()` utility functions
- Full TypeScript types with declaration maps
- Dual ESM + CJS output with `"sideEffects": false`
- Comprehensive test suite (105 tests) with ZATCA spec compliance tests

### Changed
- Errors thrown by TLV generators now carry the original error as `cause` for better diagnostics
