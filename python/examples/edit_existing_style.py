from citograph_style import Style, emit

style = Style.from_xml(BASE_STYLE_XML)
style.rename("My institution style")
style.set("citation/layout", prefix="[", suffix="]", delimiter="; ")
style.set("bibliography", hanging_indent="true", line_spacing="1")
emit(style)
