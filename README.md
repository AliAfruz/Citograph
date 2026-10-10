# Citograph

**Developed by Ali Afruz** · [a.a.afruz@gmail.com](mailto:a.a.afruz@gmail.com)

[GitHub repository](https://github.com/AliAfruz/Citograph) · [Windows releases](https://github.com/AliAfruz/Citograph/releases)

A Windows desktop citation manager and research workspace. References are stored locally in SQLite. PDFs live inside portable .citograph files or the managed desktop attachment folder. The interface includes paper-light and midnight-dark themes.

## Open the app

Use the **Citograph** desktop shortcut, double-click **Start Citograph.cmd**, or run **release/win-unpacked/Citograph.exe**. The launcher selects the newest packaged version automatically; the main executable is version **1.4.1**. The packaged app does not require Node.js, Python, an account, or an internet connection for library work. Crossref search and DOI refresh require internet access.

If an installer is present, **release/Citograph Setup 1.4.1.exe** installs the app and creates a desktop shortcut. This locally built release is not code signed.

The first launch contains an explicitly marked sample library of ten real papers with metadata retrieved from Crossref. Use **Remove samples** in Library to move those samples to Trash. Import your references or start adding your own at any time.

## What you can do

- Add and edit journal articles, books, chapters, conference papers, theses, reports, datasets, and webpages.
- Search titles, authors, journals, DOIs, abstracts, tags, and research notes together. Organize references into collections, star important sources, and track unread, reading, and read states.
- Import PubMed NBIB (.nbib), MEDLINE text, BibTeX, RIS, CSL JSON, and EndNote XML. Preview the import and skip records already in your library. Export BibTeX, RIS, CSL JSON, formatted HTML, and plain text bibliographies.
- Search Crossref by topic, title, author, or DOI; add search results and refresh metadata for saved DOIs.
- Format references with citeproc-js and bundled CSL styles: APA 7, IEEE, Nature, NLM/Vancouver, Chicago author-date, MLA 9, ACS, and Harvard Cite Them Right. Install additional independent CSL files in Settings.
- Attach local PDFs, read pages, zoom, draw highlights, and add page notes. Annotations persist with the reference. Extracted page text is visible in the reader sidebar.
- Explore a research atlas with explainable connections from shared tags and author names. Drag nodes, pan, zoom, and filter by collection. The map displays at most 120 papers at once.
- Compare methods, evidence, and limitations in an editable evidence matrix. Export the matrix to CSV.
- Create multiple manuscripts in Writing studio, insert single or grouped citations with page locators, switch citation styles, and preview the formatted manuscript and bibliography. Export Word-compatible RTF, HTML, or plain text. Numeric styles follow manuscript citation order, and author-year styles support disambiguation.
- Review duplicates matched by normalized DOI or title/year. Merge metadata, notes, tags, PDF attachments, and annotations; manuscript markers are redirected to the retained reference. Original records move to Trash.
- Review reading progress, publication years, research themes, and missing core metadata in Research pulse.
- Restore deleted references, undo the last library action outside text fields, export complete backups, restore backups, or open the local data folder.

## Storage and recovery

Normal desktop data is stored under `%APPDATA%/Citograph/research/`:

- `library.sqlite` and its SQLite WAL files: references, collections, notes, annotations, manuscripts, preferences, and custom CSL styles.
- `attachments/`: managed copies of PDFs, identified by UUID.
- `backups/`: the first metadata snapshot saved on each UTC day, retaining up to 14 daily snapshots. These snapshots omit PDF binary data.
- `before-restore-*.json`: metadata recovery copies created before restoring a complete backup.

Complete JSON backups include managed PDFs up to 300 MB total; the individual PDF limit is 150 MB. For larger libraries, close Citograph and copy the entire data folder. Metadata is limited to 100 MB. References and notes remain available offline. No automatic cloud upload, telemetry, or account login is implemented.

The browser development preview uses its own IndexedDB storage; it does not share the desktop SQLite library. Desktop workflow tests use an isolated data directory in `test-results` and do not change your real library.

## Development

Prerequisite: Node.js 24 or newer, and npm. Dependencies are pinned by `package-lock.json`.

```powershell
npm ci
npm run build
npm run desktop
```

For live UI development, run `npm run dev`, then set `CITOGRAPH_DEV_URL=http://127.0.0.1:5178` before launching `npm run desktop`. Remove that environment variable to return to the built application.

```powershell
npm test
npm run test:desktop
npm run test:reader
npm run package
npm run installer
```

The asset preparation scripts are needed only if rebuilding the bundled resources from source. `scripts/fetch-assets.mjs` downloads CSL styles, the English locale, and verified sample metadata. `scripts/prepare-runtime.mjs` bundles font and PDF.js resources. `scripts/create-icon.py` generates the application icon with Pillow. All runtime resources are already included in `public` and `build`.

## Current scope

Citograph 1.4.1 is a local citation and research manager with a native Microsoft Word add-in for Windows. It includes real storage, citation processing, PDF annotation, and manuscript export. It does not include LibreOffice integration, collaboration/cloud sync, browser capture extension, OCR for scanned PDFs, automated scientific-quality assessment, or PDF full-text indexing across the library. Metadata completeness indicates the presence of fields, not the reliability of a publication. Citation output should be reviewed when imported metadata is incomplete.

Research notes and evidence are authored by the user. No generated research findings or pretend AI responses are included. The research atlas shows metadata relationships, not a verified citation network.

See `THIRD_PARTY_NOTICES.md` for source and license information.

## Validation

The included checks cover 16 core citation/import/storage tests, 15 desktop workflow checks, 7 PDF/backup/DOI/export checks, and 4 standalone executable checks. All 42 checks passed. Workflow tests use the production `file://` build with isolated libraries. Reports and interface screenshots are saved under `test-results/`. Citation tests cover all bundled styles, APA year disambiguation, and numeric citation ordering. PDF tests exercise real rendering, stored highlights and page notes, and a complete attachment backup/restore. The standalone checks launch release/win-unpacked/Citograph.exe directly, with development packages excluded. Run them with `node scripts/packaged-smoke.mjs`; the packaged test displays a temporary visible window. No tests write to the normal application library.

## Word integration in 1.1

The Word module provides original ribbon icons, source search and collection filters, grouped editable citation fields, page locators, author suppression, eight built-in styles, managed rich bibliographies, formatted bibliography exports, document checks, metadata refresh, source-library export/import, and a traveling library stored inside the Word document and its citation fields. Footnote and endnote citations are included in document formatting.

Save and close Word, run **Install Word Add-in.cmd**, and reopen Word. Read **word-addin/WORD_GUIDE.md** for the full workflow. The desktop installer includes the native module. Word metadata formatting uses an authenticated local bridge; no cloud account is needed. Native sources, icons, DLL and per-user registration scripts are included.

New validation includes six Word-bridge checks, real Word document-engine tests and packaged backend tests. These verify editable fields, formatting, bibliography controls, repeated updates, saved DOCX reopening, citation copying, duplicate ID repair, traveling-library import, and preservation of other Word fields during plain-text conversion. The source browser is rendered from the compiled WinForms implementation. Ribbon-host loading remains unverified while the existing Office session retains its earlier add-in list; the reports distinguish this from successful direct COM document-engine verification.

## Style Studio (1.2)
Style management now includes a visual builder, bundled Python compiler/editor, CSL editing, sample/library previews, favorites, saved revision history, .cstyle packages and direct Word style application. Read [STYLE_STUDIO_GUIDE.md](STYLE_STUDIO_GUIDE.md). EndNote .ens import creates a guided migration draft with a conversion report; binary formatting rules are not faithfully decoded.

## Portable library files (1.3)
Click **Library files** in the sidebar to create, open, save or copy independent .citograph libraries. Each file embeds references, PDFs, annotations, notes, manuscripts and custom styles with Python recipes and version history. Existing desktop data stays available as Desktop library. The installer includes the Windows file association. See [LIBRARY_FILES_GUIDE.md](LIBRARY_FILES_GUIDE.md) for commands and backup details; [VALIDATION_LIBRARIES.md](VALIDATION_LIBRARIES.md) records the current checks.

## PubMed import and developer credit (1.3.1)
PubMed .nbib records now import through the reference picker, the existing import dropzone or pasted text. Full names, Unicode, wrapped fields and PubMed identifiers are preserved. Settings and package metadata identify Ali Afruz (a.a.afruz@gmail.com) as developer. See [NBIB_IMPORT_GUIDE.md](NBIB_IMPORT_GUIDE.md). The current local installer is **release/Citograph Setup 1.4.1.exe**.

## EndNote document migration (1.4)

Open **Settings → EndNote document migration** to inspect a saved Word document, recover its embedded EndNote references, and create a new copy with editable Citograph citations and bibliography. The **Migrate EndNote** Word ribbon button offers the same workflow. Originals are preserved; missing or unsupported fields are reported before conversion. See **ENDNOTE_MIGRATION_GUIDE.md**.

## Comfortable reading (1.4.1)

Text is larger by default throughout the desktop app, including reference titles, authors, metadata, abstracts, notes, dialogs and style tools. Go to **Settings → Appearance → Text size** to choose Standard (16 px), Comfortable (18 px, default), Large (20 px) or Extra large (22 px). **Ctrl +** and **Ctrl −** adjust it from any view; **Ctrl 0** restores Comfortable. The setting saves with the library. PDFs retain their own document text size and reader zoom controls. The sidebar scrolls while its bottom commands stay accessible, and the reference panel has more reading space.
