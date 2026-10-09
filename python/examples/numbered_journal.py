from citograph_style import Style, emit

style = Style("My numbered journal", mode="numeric", prefix="[", suffix="]",
              sort="citation", author_limit=4, names="family-given",
              italic_journal=True, include_doi=True, hanging_indent=True)
emit(style)

