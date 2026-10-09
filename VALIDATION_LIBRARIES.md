# Citograph 1.3 validation — portable libraries

Validated on Windows on 9 October 2026. **111 checks passed** across the suites below. All desktop tests used isolated application data and fixture files; they did not migrate or alter the normal application library.

| Suite | Checks | Evidence |
| --- | ---: | --- |
| Citation, import, database, portable file, Python compiler and Word service tests | 41 | `npm test` — 41 passed, 0 failed. |
| Final packaged portable-library workflow | 16 | `test-results/libraries-1791567042746/library-report.json` |
| Desktop workflow regression | 15 | `test-results/desktop-report.json` |
| PDF/annotation/complete backup/restore with an active portable library | 7 | `test-results/reader-report.json`; data in `test-results/reader-library-1791566705067/` |
| Packaged Style Studio regression | 12 | `test-results/styles-1791566879797/style-report.json` |
| Actual Word document engine with a portable library, plus desktop consistency | 20 | 19 native checks in `test-results/word-1791566944136/word-native-report.json`; desktop consistency assertion in the same run. |

The portable workflow verifies New, Open, Save, Save As, autosave, canceled dialogs, invalid input, independent libraries, recents, original desktop-library access, embedded PDF rendering, notes, annotations, manuscripts, style history, per-library draft isolation, Word import routing, process restart, and opening a moved file through the launch argument. Missing PDFs and failed export leave existing destinations intact. Delayed saves are rejected after switching libraries. A streamed Word import test verifies that a request retains its original library session even when its body arrives after a switch.

The native Word checks use a separate empty Word process and fixture documents. The current 1.2 Word document engine and exact-window StyleHost worked with the 1.3 desktop bridge and portable library, including Python style application through Electron IPC. **Word retained an earlier ribbon build in this Office environment** (`nativeRibbonHost: false`); loading the new ribbon remains unverified. These results verify the document engine and desktop integration, not the new ribbon host.

The rebuilt installer is `release/Citograph Setup 1.3.0.exe`. The standalone app is `release/win-unpacked/Citograph.exe`. The emitted installer script in `release/builder-debug.yml` includes the `.citograph` file association and quotes the selected filename. Native file launch was exercised in the packaged workflow. The installer itself was built but was not run to change the user's Windows registration during validation.

Preview images are `Citograph-Library-Files.png` and `Citograph-Library-Files-Dark.png`. See `LIBRARY_FILES_GUIDE.md` for file commands, contents, format limits and backup behavior.
