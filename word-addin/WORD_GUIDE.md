# Citograph for Microsoft Word

Citograph 1.1 adds a native Windows Word ribbon, original purple-and-mint icons, a searchable source browser, and document traveling libraries.

## Install and open

Save your documents and close every Word window before installing or updating. Double-click **Install Word Add-in.cmd** in the Citograph folder, then reopen Word. The **Citograph** ribbon appears alongside Word's other tabs. The installer registers only Citograph's own per-user COM component and Word add-in; it does not change macro security or other add-ins.

Open Citograph with **Start Citograph.cmd**. The Word tools can start the desktop citation processor in the background when it is needed. The standalone Citograph app must be version 1.1 or later. The packaged desktop installer includes the Word module and registers it when installed.

## Cite while writing

1. Put the cursor where the citation belongs and click **Insert Citation**.
2. Search by title, author, DOI, or journal. Choose a collection or **This document · traveling library** to narrow the list.
3. Check one or more sources. Optionally add page numbers, a prefix, a suffix, or author suppression.
4. Click **Insert selected sources**. The cursor moves after the new citation so you can continue writing.

Place the cursor in a citation and use **Edit Citation** to change its sources or options. **Manage Citations** lists document citations; double-click an entry to jump to it.

## Format references

**Insert Bibliography** creates a managed bibliography at the end of the document. **Update Citations** recalculates citation order, numbering, author–year disambiguation, and every Citograph bibliography after you move, copy, or delete citations.

Use the **Style** menu for APA 7, IEEE, Nature, NLM/Vancouver, Chicago author–date, MLA 9, ACS, or Harvard. Custom CSL styles added in the desktop app are loaded when you open the source browser. The document retains a snapshot of its style and English locale. Bibliographies preserve italics and hanging indentation; Nature citations retain actual superscript formatting. Citation fields work in the main document, footnotes, and endnotes.

**Export Bibliography** writes formatted HTML or plain text. **Refresh Source Metadata** brings updated reference metadata from the desktop library into the document and reformats its citations.

## Traveling library

Each citation is a Word ADDIN field containing its citation options and CSL reference metadata. A document XML part stores the library and style snapshot. Sources therefore travel with the saved `.docx` file and with complete citation fields copied to another document. Copy the displayed citation as ordinary Word content; copying as plain text removes its source link.

**Traveling Library** opens the sources already embedded in the active document. You can cite these sources again, even when they are absent from your own desktop library. **Import to Citograph** adds the document's cited sources to your desktop library and skips matching existing DOI or title/year records. **Export Traveling Library** writes CSL JSON, RIS, or BibTeX.

The traveling library contains reference metadata. PDF files and private research notes remain in your desktop library. Recipients can view and print the displayed citations without installing the add-in. Updating them requires Citograph and its Word add-in.

## Check and finish

**Document Check** reports missing core metadata, damaged citation fields, pasted duplicate citation identifiers, and bibliography status. Metadata checks identify absent fields; they do not evaluate a paper's scientific quality.

**Convert to Plain Text** removes Citograph's editable fields, bibliography controls, and embedded library while keeping their visible text. Save a separate document copy first. Other Word fields, such as page numbers, are preserved.

## Troubleshooting and removal

If the tab is missing, close all Word windows, run **Install Word Add-in.cmd**, and reopen Word. Word may retain its earlier add-in list while another Word process is running. In **File → Options → Add-ins → Manage COM Add-ins → Go**, enable **Citograph** if it is listed as inactive. An organization that blocks user-installed COM add-ins requires its administrator's approval.

If a citation tool cannot reach the desktop processor, close an older Citograph version and reopen **release/win-unpacked/Citograph.exe** from this folder. The local connection uses authenticated requests to `127.0.0.1`; citation formatting does not need a cloud service or account.

To remove the ribbon, close Word and run **Uninstall Word Add-in.cmd**. Your Word documents and Citograph library are preserved. Logs are under `%LOCALAPPDATA%\Citograph\Word\addin.log`. The source code, original icons, build script, and installation scripts are in `word-addin`.

## Developer verification

```powershell
npm run build
npm run build:word
powershell -NoProfile -ExecutionPolicy Bypass -File word-addin/Install.ps1
npm run test:word
node scripts/word-smoke.mjs
```

The Word checks use a separate Word process and isolated Citograph library. Reports distinguish native ribbon-host loading from direct COM document-engine tests when an existing Office session retains an earlier add-in list. The checks create only disposable validation documents under `test-results`.

## Migrate an EndNote document (1.4)

Use **Migrate EndNote** to preview embedded EndNote references, choose a Citograph style and save a new Word copy. Sources are imported into the active desktop library, and Citograph fields replace the EndNote fields. The original remains available. The desktop equivalent is **Settings → EndNote document migration**. See **ENDNOTE_MIGRATION_GUIDE.md** for supported formats and review requirements.
