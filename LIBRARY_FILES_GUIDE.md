# Citograph 1.3 — portable libraries

Click **Library files** at the top of the sidebar.

| Command | Shortcut | Result |
| --- | --- | --- |
| New Library | Ctrl Shift N | Create an empty `.citograph` file in a folder you choose. |
| Open Library | Ctrl O | Open a saved `.citograph` file. |
| Save Library | Ctrl S | Save pending changes to the active library. |
| Save Library As | Ctrl Shift S | Copy the current library into a portable file and open that copy. |
| Desktop library | — | Return to the original library in application data. |

Changes also save automatically. The app remembers the last opened library and lists up to 12 recent files. Settings shows the active file path and provides the same New, Open and Save As commands.

## What the file contains

One `.citograph` file stores references, collections, tags, reference notes, evidence, PDF bytes, highlights and annotations, manuscripts, citation styles, saved Python recipes, style versions and library preferences. Move or copy the file to another folder or Windows computer running Citograph. PDFs remain readable without their original source folders. Close Citograph before copying an active file so all pending edits are saved.

The container uses SQLite with a Citograph format marker and version, JSON metadata and embedded PDF assets. Its persistent contents fit in one file; a temporary SQLite journal can appear while a write is in progress. Metadata supports up to 100 MB; each PDF supports up to 150 MB. The native container does not inherit the 300 MB total attachment limit of JSON backups.

New Library refuses to replace an existing file. Save As uses the native save dialog's overwrite confirmation and preserves the source library. A missing PDF stops portable export and leaves the destination intact. Invalid Open keeps the current library selected. Pending edits save before switching; late operations from the previous library cannot overwrite the new library.

## Existing data and backups

The original desktop library remains in application data. Use **Save Library As** to make its first portable copy. Existing `.citograph.json` backups still restore through **Settings → Restore from backup**. BibTeX, RIS, CSL JSON and EndNote reference XML remain reference interchange formats; they do not contain the complete workspace. `.cstyle` packages are individual styles, not libraries.

Daily metadata snapshots (up to 14 per library) are kept in application data and do not include PDFs. A portable recovery copy is created before restoring a JSON backup. Copy the `.citograph` file for a complete independent backup.

## Word

The Word add-in reads references and custom styles from the library currently open in Citograph. Traveling-library imports go into that library. Existing Word documents retain their embedded reference and style snapshots. Open the intended library before inserting or importing citations. Windows file association is included in the rebuilt installer; double-clicking a `.citograph` file opens it in Citograph.
