# EndNote Word migration — Citograph 1.4.3

Developed by **Ali Afruz** · **a.a.afruz@gmail.com**.

Citograph can recover references from formatted EndNote citation fields in a saved Word `.docx`, `.docm` or legacy `.doc` document. It imports the cited sources into your active Citograph library, creates editable Citograph citation fields, replaces the EndNote bibliography with a Citograph bibliography, and embeds Citograph’s traveling library and selected style. The conversion is saved to a new document; the original file is preserved.

## Use the desktop tool

1. Open Citograph using **Start Citograph.cmd** and choose the library that should receive the references.
2. Open your saved EndNote document in Microsoft Word.
3. Open **Settings → EndNote document migration → Inspect open Word document**. If several Word windows are open, select the document and inspect it.
4. Review the recovered sources and any issues. Select your Citograph citation style.
5. Click **Migrate to a new Word copy** and choose a new, unused filename. The tool chooses `.docm` for macro-capable documents and `.docx` otherwise.
6. Review the converted document. Use Citograph’s **Update Citations**, **Edit Citation**, and **Traveling Library** tools to continue working.

The desktop migration tool connects directly to the selected Word document. It does not require the Citograph ribbon to be installed. To get the new **Migrate EndNote** ribbon button, close Word, run **Install Word Add-in.cmd**, and reopen Word. The ribbon button provides the same preview and copy workflow.

## Readiness and format

The preview separates recovered data, blocking issues and metadata warnings. **Ready to migrate** means all detected citation groups have recoverable links. Missing metadata warnings remain visible for review. Incomplete or contradictory source data is still blocked; Citograph does not guess references from displayed numbers.

The document is saved to a new copy before citation conversion. A .docm source, or a document containing a VBA project, must use a .docm destination. The converter rejects a .docx destination for that source to prevent losing macros. Legacy .doc files use a modern copy while preserving the original.

## Data and compatibility

Supported fields are formatted `ADDIN EN.CITE` citations containing EndNote traveling-library XML in their code or hidden field data, nested `EN.CITE.DATA` support fields, and `ADDIN EN.REFLIST` bibliographies. Supporting data fields are counted once with their enclosing citation. Bibliography hyperlinks are recognized and rebuilt with the new bibliography. Migration supports grouped and repeated citations, body text, footnotes and endnotes, page locators, prefix/suffix text and author suppression. Full author names, titles, journal/book information, years, DOI, URLs, volume, issue, pages, publisher, edition and embedded abstract/keywords are recovered when present. DOI matches reuse existing Citograph references; records without DOI are compared using title, year and authors. The document’s references are linked to their desktop library IDs for metadata refresh.

Missing embedded records can be resolved from another citation in the same document when its record number and available author/year identify a single source. Record numbers alone are not treated as a global library identity. Unresolved or ambiguous records block conversion. Plain-text citations, unformatted `{Author, Year #Record}` placeholders, unsupported EndNote field variants, author-only/year-suppressed display options, nested fields other than recognized EndNote data or bibliography hyperlinks, protected documents and documents with tracked revisions need review first. EndNote fields in headers or text boxes are also reported for manual review. No source metadata is guessed from the displayed citation.

The tool changes the citation structure and applies the selected CSL style; it does not reproduce the original `.ens` style automatically. Use Style Studio to select or prepare a matching style. Bibliographies are rebuilt from the document’s Citograph citations. PDFs and uncited library records are not embedded in EndNote’s Word traveling library and are not recovered by this tool.

If the desktop library becomes unavailable after the converted document has been saved, its embedded Citograph sources remain available. Reopen the converted copy and use **Import to Citograph** to finish importing. The original document remains available.

## Verification

The automated suite includes EndNote XML parser and desktop import mapping checks. Real Microsoft Word tests use synthetic EndNote fields and verify copy migration, original-file checksum preservation, grouping, locators, prefixes, footnotes, bibliography replacement, PAGE fields and layout, desktop source IDs, restyling, save/reopen, duplicate reuse, and unresolved-source blocking. An optional manuscript-fixture check operates on a separate test copy in an isolated Word instance and library; it checks the original checksum, complete conversion, figure/table/section counts, and VBA-project retention and exact VBA-module source preservation. The manuscript and converted test copies are ignored by Git and are never uploaded. The optional macro-source comparison requires Python with `oletools`; macro code is read but never run. Run `npm run test:migration-recovery` for the synthetic hidden-data workflow; supply `CITOGRAPH_MIGRATION_FIXTURE` only when intentionally testing a separate manuscript copy.

Format reference: [EndNote traveling-library documentation](https://docs.endnote.com/docs/endnote/2025/v1/windows/en/content/09word/the_traveling_library.htm). EndNote reference-type numbers were cross-checked against [Zotero’s EndNote XML translator](https://github.com/zotero/translators/blob/master/Endnote%20XML.js).

The desktop migration workflow and Word document engine were verified. This machine’s hidden automated Word instance did not confirm native ribbon loading; the desktop Settings tool provides the tested migration entry point.
