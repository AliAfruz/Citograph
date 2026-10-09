import json
import runpy
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from citograph_style import Style, emit

if __name__ == "__main__":
    request = json.load(open(sys.argv[1], encoding="utf-8"))
    if request.get("mode") == "builder":
        emit(Style.from_options(request["options"]))
    else:
        scope = runpy.run_path(sys.argv[2], init_globals={"BASE_STYLE_XML":request.get("xml", ""), "STYLE_OPTIONS":request.get("options", {})})
        # emit() can be called directly; a 'style' variable also works.
        if "style" in scope: emit(scope["style"])

