"""Citograph style authoring API. Python 3.11+, standard library only."""
import copy
import json
import os
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

NS = "http://purl.org/net/xbiblio/csl"
ET.register_namespace("", NS)
def tag(name): return "{" + NS + "}" + name
def node(parent, element_name, **attrs):
    return ET.SubElement(parent, tag(element_name), {k.replace("_", "-"): str(v) for k, v in attrs.items() if v is not None})

class Style:
    """Generate a style, or edit an existing independent CSL style without losing its rules."""
    def __init__(self, name="My journal style", **options):
        self.root = self._build(name, **options)

    @classmethod
    def from_xml(cls, xml):
        validate(xml)
        result = cls.__new__(cls)
        result.root = ET.fromstring(xml)
        return result

    @classmethod
    def from_options(cls, options): return cls(**options)

    def set(self, selector, **attributes):
        """Set CSL attributes on all matches, e.g. style.set('citation/layout', prefix='[')."""
        path = "/".join(tag(part) if part != "." else part for part in selector.split("/"))
        matches = self.root.findall(path)
        if not matches: raise ValueError("No CSL elements match " + selector)
        for element in matches:
            for key, value in attributes.items():
                key = key.replace("_", "-")
                if value is None: element.attrib.pop(key, None)
                else: element.set(key, str(value))
        return self

    def rename(self, name):
        self.root.find(tag("info") + "/" + tag("title")).text = name
        return self

    def to_xml(self):
        updated = self.root.find(tag("info") + "/" + tag("updated"))
        if updated is not None: updated.text = datetime.now(timezone.utc).isoformat()
        ET.indent(self.root, space="  ")
        return '<?xml version="1.0" encoding="UTF-8"?>\n' + ET.tostring(self.root, encoding="unicode")

    @staticmethod
    def _build(name, mode="author-date", prefix="(", suffix=")", delimiter="; ",
               author_limit=3, italic_journal=True, italic_title=False, include_doi=True,
               sort="author", hanging_indent=True, line_spacing=1, entry_spacing=1,
               names="family-given", **extra):
        if mode not in ("author-date", "numeric", "superscript"): raise ValueError("Unknown citation mode")
        if sort not in ("author", "year", "citation"): raise ValueError("Unknown bibliography sort")
        limit = int(author_limit)
        if not 2 <= limit <= 100: raise ValueError("Author limit must be 2–100")
        root = ET.Element(tag("style"), {"version":"1.0", "class":"in-text", "default-locale":"en-US"})
        info = node(root, "info")
        node(info, "title").text = str(name)
        node(info, "id").text = "https://citograph.local/styles/user"
        node(info, "category", citation_format="author-date" if mode == "author-date" else "numeric")
        node(info, "updated").text = datetime.now(timezone.utc).isoformat()
        macro = node(root, "macro", name="author")
        authors = node(macro, "names", variable="author")
        node(authors, "name", **{"and":"text"})
        authors[0].set("initialize-with", ". ")
        if names == "family-given": authors[0].set("name-as-sort-order", "all")
        node(authors, "et-al")
        substitute = node(authors, "substitute")
        node(substitute, "text", variable="title")
        citation = node(root, "citation", et_al_min=limit, et_al_use_first=1,
                        disambiguate_add_year_suffix="true" if mode == "author-date" else "false")
        layout = node(citation, "layout", prefix=prefix, suffix=suffix, delimiter=delimiter,
                      vertical_align="sup" if mode == "superscript" else None)
        group = node(layout, "group", delimiter=", ")
        if mode == "author-date":
            short = node(group, "names", variable="author")
            node(short, "name", form="short")
            sub = node(short, "substitute"); node(sub, "text", variable="title", form="short")
            date = node(group, "date", variable="issued"); node(date, "date-part", name="year")
        else: node(group, "text", variable="citation-number")
        locator = node(group, "group", delimiter=" ")
        node(locator, "label", variable="locator", form="short")
        node(locator, "text", variable="locator")
        bib = node(root, "bibliography", hanging_indent=str(bool(hanging_indent)).lower(),
                   line_spacing=max(1,min(3,int(line_spacing))), entry_spacing=max(0,min(3,int(entry_spacing))),
                   et_al_min=limit, et_al_use_first=1)
        ordering = node(bib, "sort")
        if sort == "citation": node(ordering, "key", variable="citation-number")
        else:
            if sort == "author": node(ordering, "key", macro="author")
            node(ordering, "key", variable="issued")
            node(ordering, "key", variable="title")
        bl = node(bib, "layout", suffix=".")
        if mode != "author-date": node(bl, "text", variable="citation-number", suffix=". ")
        details = node(bl, "group", delimiter=". ")
        node(details, "text", macro="author")
        date = node(details, "date", variable="issued", prefix="(", suffix=")")
        node(date, "date-part", name="year")
        node(details, "text", variable="title", font_style="italic" if italic_title else "normal")
        journal = node(details, "group", delimiter=", ")
        node(journal, "text", variable="container-title", font_style="italic" if italic_journal else "normal")
        volume = node(journal, "group")
        node(volume, "text", variable="volume")
        node(volume, "text", variable="issue", prefix="(", suffix=")")
        node(journal, "text", variable="page")
        publisher = node(details, "group", delimiter=": ")
        node(publisher, "text", variable="publisher-place"); node(publisher, "text", variable="publisher")
        if include_doi: node(details, "text", variable="DOI", prefix="https://doi.org/")
        return root

def validate(xml):
    if not isinstance(xml, str) or len(xml.encode("utf-8")) > 2_000_000: raise ValueError("Style must be under 2 MB")
    if "<!DOCTYPE" in xml.upper() or "<!ENTITY" in xml.upper(): raise ValueError("DTD and entities are not supported")
    root = ET.fromstring(xml)
    if root.tag != tag("style") or root.get("version") != "1.0": raise ValueError("Expected an independent CSL 1.0 style")
    for name in ("info", "citation", "bibliography"):
        if root.find(tag(name)) is None: raise ValueError("Missing " + name + " section")
    if root.find(tag("citation") + "/" + tag("layout")) is None: raise ValueError("Citation layout is missing")
    if root.find(tag("bibliography") + "/" + tag("layout")) is None: raise ValueError("Bibliography layout is missing")
    macros = {m.get("name"): m for m in root.findall(tag("macro"))}
    def visit(name, stack):
        if name not in macros: raise ValueError("Undefined macro: " + name)
        if name in stack: raise ValueError("Recursive CSL macro: " + name)
        for e in macros[name].iter():
            if e.get("macro"): visit(e.get("macro"), stack + [name])
    for e in root.iter():
        if e.get("macro"): visit(e.get("macro"), [])
    return root

def emit(style):
    """Publish a Style or CSL string to the Citograph compiler. Print is free for diagnostics."""
    xml = style.to_xml() if isinstance(style, Style) else style
    validate(xml)
    with open(os.environ["CITOGRAPH_STYLE_OUTPUT"], "w", encoding="utf-8") as stream:
        json.dump({"xml":xml}, stream, ensure_ascii=False)

