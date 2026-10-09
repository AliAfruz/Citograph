# PubMed import and developer credit — Citograph 1.3.1

Developed by **Ali Afruz** · **a.a.afruz@gmail.com**.

Open **Import library**, choose a PubMed `.nbib` file, click **Preview import**, then import the reviewed records. The existing import dropzone also accepts `.nbib`; PubMed-format `.txt` files and pasted records are detected automatically. The 25 MB import-file limit remains in place.

The importer reads wrapped and repeated PubMed fields and multiple records. It preserves full author names and Unicode, author order and group authors, title, abstract, publication date, journal and abbreviation, volume, issue, pages or electronic article number, DOI, PubMed URL, PMID, PMCID, ISSN, language, keywords, MeSH terms, publication types and affiliations. The inspector shows PubMed identifiers. Existing citation styles and library storage handle the imported references.

Field definitions and download format: [NLM PubMed guide](https://pubmed.ncbi.nlm.nih.gov/help/#pubmed-format). The sample supplied for validation is not included in the repository; a synthetic `.nbib` fixture is provided instead.

The Settings footer displays Ali Afruz and the developer email, with a copy-email button. Package metadata and the Windows installer also identify Ali Afruz as the developer. Source and installers are uploaded to the private [AliAfruz/Citograph repository](https://github.com/AliAfruz/Citograph).

## Verification

- 49 automated citation/import/storage/compiler/Word-service tests passed, including eight new PubMed parsing and formatting checks.
- Five desktop checks passed against the supplied `28444290-1.nbib` record: file selection and preview, import of all 26 authors and the DOI/date/abstract/journal fields, duplicate detection via the existing dropzone, developer credit and application version, and persistence across reload.
- The same functional checks ran against the packaged 1.3.1 executable. Reports remain in the ignored `test-results/` folder.

To use the local update, close the current Citograph window and open **Start Citograph.cmd**. The launcher prefers the new `release/v1.3.1/win-unpacked/Citograph.exe`. Your existing library remains in application data. The installer is also available in `release/Citograph Setup 1.3.1.exe` and on the private GitHub release page.
