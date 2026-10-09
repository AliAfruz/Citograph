# Citograph 1.2 validation

The release installer is `release/Citograph Setup 1.2.0.exe`. The standalone executable is `release/win-unpacked/Citograph.exe`.

## Passed checks

- 31 unit checks: core references, CSL rendering, authenticated Word bridge, Python generation/transformation, Python errors, recursive macro rejection and execution limits.
- 12 packaged Style Studio workflows: opening, Python builder, Python source execution, saved revisions, restoring drafts, CSL errors, Python errors, favorites, native style packages, explicit EndNote migration drafts, Word formatting bridge, persistence and light/dark rendering.
- 15 existing desktop workflows: references, structured names, notes, citation previews, collections, import/export, maps/evidence, manuscripts, themes, persistence, trash, commands and clean shutdown/restart.
- 4 standalone release checks: launch/resources, production citation rendering, dark theme and research atlas.
- 19 actual Word checks plus desktop-library consistency: citation fields, cursor placement, grouped metadata, rich bibliography, standard style switching, generated Python styles, embedded snapshots, document target guards, failed-style preservation, exact Word window targeting, the desktop's restricted Apply to Word IPC, superscripts, editing, document checks, traveling imports, DOCX save/reopen, copying fields, duplicate ID repair, plain-text conversion and footnote ordering.

These are 82 distinct checks. Repeat source/packaged runs are not added to the total. Final packaged Word report: `test-results/word-1791562332221/word-native-report.json`. Packaged Style Studio report: `test-results/styles-1791561024246/style-report.json`.

The delivered Word DLL and StyleHost executable have the same SHA-256 hashes as their tested source-build artifacts. The installer includes Python 3.14.8, its license, the Python authoring API, examples, the Word apply host, and the style guide. The embedded Python executable's signature is valid and identifies the Python Software Foundation.

## Current limits

EndNote `.ens` imports create guided migration drafts and conversion reports. Binary formatting rules are not faithfully decoded. An explicit CSL foundation is selected, and default/Word application is disabled until the migration is reviewed and saved.

The editor uses XML structure/macro checks plus sample rendering. It does not implement full RELAX NG schema validation or guarantee every journal requirement.

Word on this machine loads an earlier Citograph ribbon build. Reports record `nativeRibbonHost: false` for the current build. The current registered document engine, exact-window style host, and the desktop Apply to Word IPC passed independently. New ribbon buttons exist in the 1.2 source, but native hosting of those buttons remains unverified. Use the desktop Style Studio to apply saved styles.

Existing user documents and other vendors' fields/add-ins were preserved. All changed Word documents were isolated test fixtures. The updated target host was tested while the user's separate Word document remained open.

## Reproduce

```powershell
npm test
node scripts/style-smoke.mjs --packaged
node scripts/desktop-smoke.mjs
node scripts/packaged-smoke.mjs
node scripts/word-smoke.mjs --packaged
```

Word tests require installed Microsoft Word. Tests create their own documents and verify their process identity. The optional installed add-in registration is limited to Citograph's own current-user keys; no macro-security or other add-in settings are changed.