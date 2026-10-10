# Privacy Policy for Snippo

**Effective Date:** October 10, 2026

Snippo ("we", "our", or "the extension") is committed to protecting your privacy. This Privacy Policy explains our practices regarding user information.

## 1. No Data Collection

Snippo is built on the principle of **Zero Knowledge and Local-First Architecture**:
- We do **not** collect, store, log, or transmit any personally identifiable information (PII).
- We do **not** record, capture, or transmit keystrokes off your device.
- We do **not** use cookies, analytics, trackers, beacons, or external telemetric libraries.

## 2. On-Device Storage

All snippets, trigger shortcuts, folder groupings, and user preferences are saved strictly within your browser's local storage (`chrome.storage.local`). This data is exclusively accessible to the Snippo extension running locally on your computer and is never shared, synced, or sent across any network.

## 3. Network Permissions

Snippo requests **zero network permissions** in its Manifest declaration. The extension cannot make HTTP/HTTPS network requests, WebSocket connections, or background fetches.

## 4. Sensitive Field Exclusion

Snippo strictly skips all password fields (`type="password"`) and financial payment fields (such as credit card numbers, CVV codes, and expiry dates). No keystroke inspection occurs in these inputs.

## 5. Contact & Support

If you have questions about this privacy policy or the extension, please open an issue in the project repository.
