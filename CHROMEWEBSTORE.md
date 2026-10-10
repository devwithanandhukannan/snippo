# Chrome Web Store Listing — Snippo

> Last Updated: 2026-10-10

## Store Listing

**Extension Name** [REQUIRED]
Snippo: Type less. Say more.

**Short Description** [REQUIRED]
Ultra-fast, 100% local text expansion. Type short triggers to expand templates instantly with zero keystrokes leaving your device.

**Detailed Description** [REQUIRED]
Snippo is an ultra-fast, local-first text expansion browser extension designed for privacy, speed, and focus.

Type short triggers like /omw or ;sig anywhere on the web, and watch them instantly expand into full sentences, formatted email signatures, dynamic dates, or multi-line messages.

KEY FEATURES

• Ultra-fast expansion: Core matcher runs in under 1ms per keystroke using tail-only lookups.
• 100% Local & Private: Zero network permissions, no accounts, no external tracking. Keystrokes never leave your browser.
• Dynamic variables: Insert real-time dates ({date}), timestamps ({time}), clipboard text ({clipboard}), and dynamic caret positioning ({cursor}).
• Forgiving undo: Every expansion can be undone immediately with Escape or the in-page undo chip. Deleted snippets have an 8-second recovery window.
• Smart skip list: Automatically ignores password and payment fields for your peace of mind.
• Per-site pausing: Toggle off for sensitive or personal domains with one click.
• Apple-inspired design: Clean, native-feeling workspace with folders, live test sandbox, and instant trigger conflict detection.
• Complete backup & restore: Export and import your snippet library anytime as clean JSON.

HOW TO USE IT

1. Open the Snippo manager or popup.
2. Create a snippet: pick a trigger (like /email) and enter your expansion text.
3. Type /email in any text box across the web and watch it transform immediately!
4. Need to revert? Simply press Escape to undo.

PRIVACY & PERMISSIONS

Snippo requests strictly the minimal permissions required to function:
• Storage: to save your snippets and settings in your local browser storage.
• Context Menus: to allow right-clicking highlighted text to create a new snippet.
• ActiveTab: to allow pausing or activating the extension for the current tab.

Snippo makes zero network requests and transmits zero keystroke data off your device.

**Category** [REQUIRED]
Productivity

**Single Purpose** [REQUIRED]
Expands user-defined text shortcuts into full phrases and templates instantly inside any browser text field.

**Primary Language** [REQUIRED]
English

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|---|---|---|---|
| Store Icon [REQUIRED] | 128×128 PNG | [Ready] | `assets/icons/icon-128.png` |
| Small Icon | 48×48 PNG | [Ready] | `assets/icons/icon-48.png` |
| Toolbar Icon | 16×16 PNG | [Ready] | `assets/icons/icon-16.png` |
| Screenshot 1 [REQUIRED] | 1280×800 or 640×400 | [Pending] | `docs/screenshots/manager-workspace.png` |
| Screenshot 2 [RECOMMENDED] | 1280×800 or 640×400 | [Pending] | `docs/screenshots/popup-quick-glance.png` |
| Screenshot 3 [RECOMMENDED] | 1280×800 or 640×400 | [Pending] | `docs/screenshots/in-page-chip-undo.png` |
| Screenshot 4 | 1280×800 or 640×400 | [Pending] | `docs/screenshots/onboarding-practice.png` |

### Screenshot Notes
- Screenshot 1: Full Snippo workspace showing the Apple Notes style sidebar, snippet folders, trigger conflict detection, and live test sandbox.
- Screenshot 2: The compact frosted popup panel displaying recent snippets, quick search, and the per-site pause toggle.
- Screenshot 3: In-page feedback chip floating near caret displaying expansion confirmation and the instant Esc undo button.
- Screenshot 4: Frictionless 3-step first-run onboarding screen.

## Permissions Justification

| Permission | Type | Justification |
|---|---|---|
| `storage` | permissions | Stores snippet definitions, folders, user configuration preferences, and per-site exclusions locally on the device using chrome.storage.local. |
| `contextMenus` | permissions | Adds a context menu item allowing users to highlight text on any webpage and save it directly as a new snippet. |
| `activeTab` | permissions | Enables the popup to identify the active tab's hostname when the user clicks the extension icon, so the user can pause or resume expansion on that specific site. |

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** No

The extension does not collect, track, or transmit any user data. All snippets, triggers, and settings remain exclusively inside the user's local browser storage.

### Data Security & Transmission

- No data is transmitted off-device.
- No analytics, third-party libraries, or tracking SDKs are bundled.
- Zero network requests (`connect-src 'none'`).

## Version History

| Version | Date | Changes |
|---|---|---|
| 1.0.0 | 2026-10-10 | Initial release: ultra-fast tail-only matcher, plain-input and rich-editable adapters, in-page feedback chip with Esc undo, Apple Notes style manager workspace, dynamic variables ({date}, {time}, {cursor}, {clipboard}), per-site exclusions, and JSON backup/restore. |
