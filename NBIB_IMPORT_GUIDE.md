# PubMed import and developer credit — Citograph 1.4.3

Developed by **Ali Afruz** · **a.a.afruz@gmail.com**.

Open **Import library**, choose a PubMed `.nbib` file, click **Preview import**, then import the reviewed records. The existing import dropzone also accepts `.nbib`; PubMed-format `.txt` files and pasted records are detected automatically. Import files can be up to 25 MB.

The importer reads wrapped and repeated PubMed fields and multiple records. It preserves full author names and Unicode, author order and group authors, title, abstract, publication date, journal and abbreviation, volume, issue, pages or electronic article number, DOI, PubMed URL, PMID, PMCID, ISSN, language, keywords, MeSH terms, publication types and affiliations. The inspector shows PubMed identifiers.

Field definitions and download format: [NLM PubMed guide](https://pubmed.ncbi.nlm.nih.gov/help/#pubmed-format). The supplied validation file is not included in the repository; a synthetic `.nbib` fixture is provided instead.

The Settings footer displays **Ali Afruz** and **a.a.afruz@gmail.com**, with a copy-email button. The same screen shows the application version. Windows package metadata also identifies Ali Afruz as the developer.

## Open the updated application

Use the **Citograph** desktop shortcut or **Start Citograph.cmd** in the project folder. The launcher compares packaged application versions and opens the newest available build. The main `release/win-unpacked/Citograph.exe` location also contains version **1.4.3**. The former 1.3.0 build is retained under `release/v1.3.0/win-unpacked` for recovery.

The local installer is `release/Citograph Setup 1.4.3.exe`. Existing library files and application data are preserved when changing the executable location.

If an older copy is open, close it before starting the new version. In **Settings**, verify **Citograph 1.4.3**, then scroll to the developer credit.

## Verified import

The supplied `28444290-1.nbib` contains one reference. Desktop checks verify all **26 authors**, PMID **28444290**, DOI **10.1093/eurheartj/ehx144**, publication date, abstract and journal, citation rendering, duplicate detection, and persistence after reload. These checks use an isolated test library and do not import sample data into your research library.

Source code is available in the private [AliAfruz/Citograph repository](https://github.com/AliAfruz/Citograph).
