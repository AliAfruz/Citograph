# Citograph Python style compiler

This directory contains the standard-library-only style authoring API and runner. The installed application includes the official Windows x64 CPython 3.14.8 embeddable runtime in `runtime/`; its Python Software Foundation license and third-party notices are in `runtime/LICENSE.txt`. Python's executable signature was verified as valid, signed by the Python Software Foundation.

The compiler copies `runner.py`, `citograph_style.py`, a request JSON file and your recipe into a temporary working directory. It runs Python without a shell and reads a separately emitted result file. XML is structurally checked before being returned to the editor. Standard output and error are returned separately. This is local code execution with the current user's permissions, not a security sandbox.

See `../STYLE_STUDIO_GUIDE.md` for the authoring contract and UI workflow.

