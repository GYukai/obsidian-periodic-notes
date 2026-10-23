# Periodic Notes (Maintained)

Personal maintenance fork for GYukai, based on upstream tag `0.0.17`. The initial release is `0.1.0`; it preserves the installed stable settings schema and existing note behavior instead of adopting the upstream development branch's calendar-set migration.

## Build and verification

Use Node.js 24 and npm: `npm ci --ignore-scripts`, `npm run build`, `npm run test:compat`. The lockfile and npm override keep the daily-notes interface on the same Obsidian types as the plugin. The Rollup TypeScript filter explicitly matches `.ts` files to avoid the old extglob pattern failing with newly resolved matcher versions. Source is in `src/`; never edit the generated `main.js` directly.

## Installation and compatibility

Disable the original plugin. Copy `main.js`, `manifest.json`, and `styles.css` into `.obsidian/plugins/periodic-notes-maintained/`. Copy the original `data.json` locally to retain settings, then enable the maintained plugin. Never publish personal settings or vault contents.

The independent ID prevents original community updates from overwriting the fork. A runtime alias under `periodic-notes` preserves Calendar and obsidian-daily-notes-interface lookups; it is removed on unload. Legacy command IDs and names preserve hotkeys, Advanced URI commands and existing Buttons actions. The original settings-change event is retained. Running the original and maintained plugin together is unsupported; startup refuses to replace an already loaded original. The compatibility bridge uses Obsidian's internal plugin/command registries and must be checked after application upgrades.

## Rollback

Disable the maintained plugin and enable the original. The original installation and its settings are retained. If settings were changed after migration, copy the maintained `data.json` back before enabling the original.

## Release

Publish only `main.js`, `manifest.json`, and `styles.css` (plus an optional zip). The personal repository is `GYukai/obsidian-periodic-notes`. Add this repository to BRAT and select `latest` for automatic updates. Push a version tag matching `manifest.json` to run the release workflow.

## Day start (0.2.0)

`dayStartTime` defaults to `04:00` for new and existing settings. Before that local wall-clock time, the plugin's current daily note commands (including legacy aliases), ribbon and menus open/create the previous calendar day's note. At the cutoff the current date applies. Set `00:00` for midnight behavior. Invalid values fall back to `04:00`. The settings format preview follows this rule. Explicit dates, previous/next existing-note navigation, weekly/monthly/quarterly/yearly notes and other plugins' own date selection are unchanged; Calendar date clicks still open the selected date. No global clock or third-party plugin is patched. Tests cover the cutoff, custom minutes, calendar boundaries and DST.
