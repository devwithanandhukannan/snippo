# SayMore: Type less. Say more.

> Ultra-fast, 100% local text expansion browser extension. Everything runs locally in the browser: no backend, no accounts, no keystroke leaves the device.

---

## Highlights

- **Ultra-Fast Engine**: Core matcher responds in under **1 ms** using tail-only suffix matching.
- **Under 15 KB Budget**: Content script bundle is only **~4.6 KB gzipped** (13.8 KB raw).
- **100% Private**: Zero network permissions in `manifest.json`. No analytics, no tracking, no server.
- **Forgiving Undo**: Every expansion can be undone instantly by tapping **Escape** or clicking the floating chip.
- **Loss Aversion**: Deleting a snippet gives an **8-second undo toast** before permanent removal.
- **Error Prevention**: Duplicate and prefix trigger conflicts are identified in real-time as you type.
- **Clean Design**: Frosted glass popup, 8pt spacing grid, 12px radii, and system typography for both Light and Dark modes.
- **Dynamic Variables**: Insert real-time `{date}`, `{time}`, `{clipboard}`, and caret position `{cursor}`.
- **Folders & Organization**: Group snippets into folders with instant search and live test sandboxes.
- **Backup & Restore**: Export and import your snippet library anytime as clean JSON.

---

## Surfaces

1. **Popup (`ui/popup`)**: Compact 380px panel with fast search, recent snippets, per-site pause switch, and "+ New" launcher.
2. **Manager Workspace (`ui/manager`)**: Full workspace with Apple Notes-style sidebar, folder organization, dynamic variable toolbar, live practice sandbox, and settings.
3. **In-Page Feedback Chip (`content/chip`)**: Subtle floating pill near your cursor confirming expansion with an instant Esc undo button.
4. **Onboarding (`ui/onboarding`)**: Frictionless 3-step first-run screen with live sandbox practice.

---

## Quick Start (Development & Loading)

### 1. Build the Extension
```bash
# Install dependencies
npm install

# Run test suite
npm run test

# Build production bundle
npm run build
```

### 2. Load in Google Chrome
1. Open Google Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** (toggle in top-right corner).
3. Click **Load unpacked**.
4. Select the `dist/` directory (or root directory) inside this repository.
5. Snippo is now active! Try typing `/omw` in any input field or search bar.

---

## Default Snippets

| Trigger | Expansion |
|---|---|
| `/omw` | `On my way!` |
| `/email` | `hello@snippo.local` |
| `/meet` | `Let's connect on Google Meet: https://meet.google.com/{cursor}` |
| `/date` | `{date}` *(e.g. October 10, 2026)* |
| `/sig` | Professional email signature |
| `/shrug` | `¯\_(ツ)_/¯` |

---

## Architecture

```
verbatim/
├── manifest.json         # Manifest V3 declaration (storage, contextMenus, activeTab)
├── src/
│   ├── core/             # Pure logic: Matcher, Template Resolver, Conflict Detector
│   ├── content/          # Content script, Editor Detector, Adapters (plain, rich, shadow DOM, fallback), Undo, Chip
│   ├── background/       # Stateless Service Worker, context menus, command routing
│   ├── data/             # Persistent Store, Schema, Import/Export
│   ├── ui/               # Popup, Manager Workspace, Onboarding, Apple Design System
│   ├── messaging/        # Typed message contracts
│   └── utils/            # Debounce, Site-exclusion matcher
├── assets/               # Generated 16, 48, 128px PNG icons
├── tests/                # Automated unit tests (Vitest)
└── build/                # Esbuild + Vite bundling script and size budget validation
```

---

## Quality & Budget Verification

- **Keystroke Latency**: `< 1 ms`
- **Content Script Size**: `4.66 KB gzipped` (Budget: `< 15 KB`)
- **Idle Memory**: `< 2 MB`
- **Unit Test Coverage**: Core matcher, resolver, conflicts, store, import/export, and adapters.

## License

MIT
