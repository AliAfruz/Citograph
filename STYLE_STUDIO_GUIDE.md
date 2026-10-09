# Citograph Style Studio

Open Citograph and choose **Style Studio** in the sidebar. The installer includes a signed Python 3.14.8 runtime; a separate Python installation is not needed for the builder or standard-library recipes.

## Create and save a style

1. Select a built-in CSL style and **Clone**, or choose **New style**.
2. In **Overview**, name the style and describe its intended journal or institution.
3. Use **Builder** to generate author–year, numbered or superscript rules. Set author truncation, punctuation, sorting, name order, italics, DOI inclusion, and bibliography spacing. Generation replaces the current rule set. Use Python or CSL source to edit an established journal style while retaining its existing rules.
4. Check the single-source citation, grouped citation and bibliography in the preview. Test page locators, prefixes and suffixes. Switch from example references to up to six sources in your library.
5. Add a version note and **Save version**. Built-in styles save as a separate personal style.
6. **Use as default** makes the saved style available by default in new manuscripts. Existing manuscripts retain their selected style; choose the new style in their toolbar.

The catalog supports searching, favorites, and filters for personal, built-in and unreviewed styles. Overview includes origin, citation system and CSL contributor/license information. Deleting a personal style resets affected Citograph manuscripts to APA. Word documents retain their embedded snapshot.

## Python Lab

The editor runs Python locally. Standard output and full tracebacks appear in the console. Each execution has a 15 second time limit and a 512 KB console limit; generated CSL is limited to 2 MB. Runs use a fresh temporary working folder, which is cleared afterward. This is not a security sandbox: code has your Windows user permissions. Run code you trust.

The bundled runtime contains the Python standard library. To use third-party Python packages, choose a full Python 3.11+ interpreter with those packages installed using **Choose Python**. Citograph does not install packages automatically.

Three globals are available: `BASE_STYLE_XML` (the current draft), `STYLE_OPTIONS` (builder choices), and normal Python built-ins. Import the local authoring API:

```python
from citograph_style import Style, emit

# Keep the complete original style and modify selected rules.
style = Style.from_xml(BASE_STYLE_XML)
style.rename("My institution style")
style.set("citation/layout", prefix="[", suffix="]", delimiter="; ")
style.set("bibliography", hanging_indent="true", line_spacing="1")
print("Compiled successfully")
emit(style)
```

`Style.set(path, **attributes)` changes all matching elements. Attribute underscores become hyphens; passing `None` removes an attribute. Paths use element names, such as `citation/layout` or `bibliography/layout`. A missing path is an error. `style.root` is a standard `xml.etree.ElementTree.Element` for more advanced changes.

```python
from citograph_style import Style
style = Style("My numbered journal", mode="numeric",
              prefix="[", suffix="]", sort="citation",
              author_limit=4, italic_journal=True, include_doi=True)
```

Assigning a `Style` or valid CSL string to `style` also publishes it at the end of execution. A recipe may instead call `emit()` directly. Printing CSL is not the output protocol; console messages remain diagnostics. A failed recipe does not replace the previous valid draft or saved style. Saved revisions include the recipe and builder options.

## Apply to Microsoft Word

Insert Citograph citations into an editable Word document. In Style Studio, save the style, open **Overview**, then select **Inspect Word**. Check the displayed document name and citation count. **Apply to Word** updates its Citograph fields and bibliography, and embeds the saved CSL style and locale snapshot for the traveling library.

The application checks the document token again before applying. If the active document changes, inspect again. Word's undo record supports reverting the update. The application does not save or close your Word document.

The native add-in source also includes **Style Studio** and **Refresh Styles** ribbon buttons. Refresh loads saved styles into the Word style dropdown; selecting a style applies its latest saved rules and replaces the old snapshot. On this machine Word may load its previous Citograph ribbon build. The current document engine and direct desktop style host are tested independently; consult `word-addin/VALIDATION.md` for the measured ribbon-host status.

Style changes affect Citograph fields. EndNote fields, ordinary citation text and other vendors' fields require a separate migration.

## Style packages and history

**Export .cstyle** saves Citograph's own JSON format: `format: "citograph-style"`, `version: 1`, and a `style` object containing name, ID, CSL XML, Python source, builder options, metadata, conversion report and up to 30 prior revisions. Import `.cstyle` to reuse the style and history. Imports receive a new local identifier.

**Export CSL** produces an independent `.csl` file usable with compatible citation processors. CSL alone does not include Citograph's Python code or revision history. **History → Restore draft** opens an earlier XML/recipe/options snapshot; save it to create a new current revision.

Styles and history are part of the local SQLite library and complete library backups. Unsaved editor drafts are also kept locally on this computer, separate from saved style versions.

## EndNote `.ens` imports: current limit

Importing a `.ens` file opens a **guided migration** dialog. Choose a CSL foundation explicitly. Citograph records the original filename, byte size, SHA-256 fingerprint and readable strings, then creates a usable Citograph style draft from that foundation.

**Binary EndNote formatting rules are not decoded or faithfully converted in this release.** The foundation's rules are not presented as rules recovered from the EndNote file. The conversion report lists the rules that must be checked: reference-type templates, author lists, sorting, punctuation, disambiguation and notes. Rebuild those in Builder, Python or CSL source and compare output against the original. Mark the migration reviewed and save before making it the default or applying it to Word. The original `.ens` file is not modified. Do not confuse EndNote reference-library XML with citation-style XML.

## Validation scope

The editor checks XML structure, independent-style sections, required layouts, undefined macros and recursive macro references, then renders representative samples with Citograph's CSL engine. These are structural and output checks, not full RELAX NG schema validation or a guarantee of compliance with every journal instruction. Review real manuscript output, especially note styles and disambiguation.

CSL specification: https://docs.citationstyles.org/en/stable/specification.html

Python runtime source: https://www.python.org/ftp/python/3.14.8/python-3.14.8-embed-amd64.zip
Runtime SHA-256: `A93ABE456AB01BD96D7A085B3CDB6566B3063F4241360D114142FBDB07F0A310`.

