"""
Cuts the "Quizio Symbols" font (spec 047, RN-16; ADR 0025): the symbols of
"Insira um símbolo" that Montserrat does not have, taken from the Noto fonts
(OFL 1.1), one small WOFF2 per source, each declared with its unicode-range,
so a browser downloads one only when one of its symbols shows up.

Run it again whenever the catalog changes; the catalog's coverage test fails
until then. The sources are downloaded by hand, outside the repository:

  python -I packages/ui/scripts/build-symbol-font.py \
    --catalog apps/web/src/lib/symbol-catalog.json \
    --montserrat packages/ui/node_modules/@fontsource/montserrat/files \
    --out packages/ui/src/fonts \
    sans=<dir>/NotoSans[wdth,wght].ttf \
    math=<dir>/NotoSansMath-Regular.ttf \
    symbols2=<dir>/NotoSansSymbols2-Regular.ttf

Writes quizio-symbols-<name>.woff2, quizio-symbols.css and
quizio-symbols.coverage.json (every code point Montserrat or the cut covers).
Needs fontTools and brotli (pip install fonttools brotli).
"""

import argparse
import io
import json
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

FAMILY = "Quizio Symbols"


def code_points_of(font: TTFont) -> set[int]:
    return set(font.getBestCmap() or {})


def montserrat_code_points(folder: Path) -> set[int]:
    covered: set[int] = set()
    files = sorted(folder.glob("*-400-normal.woff2"))
    if not files:
        sys.exit(f"No Montserrat files in {folder}")
    for file in files:
        covered |= code_points_of(TTFont(file))
    return covered


def catalog_code_points(catalog: Path) -> set[int]:
    tabs = json.loads(catalog.read_text(encoding="utf-8"))["tabs"]
    return {ord(char) for tab in tabs for symbol in tab["symbols"] for char in symbol}


def unicode_range(code_points: set[int]) -> str:
    ranges: list[str] = []
    ordered = sorted(code_points)
    start = previous = ordered[0]
    for point in ordered[1:] + [None]:
        if point is not None and point == previous + 1:
            previous = point
            continue
        ranges.append(f"U+{start:X}" if start == previous else f"U+{start:X}-{previous:X}")
        if point is not None:
            start = previous = point
    return ", ".join(ranges)


def cut(source: Path, code_points: set[int], target: Path) -> str:
    # Loaded whole: the variable font's lazy tables lose glyphs on the way.
    font = TTFont(source, lazy=False)
    weight = "400"
    if "fvar" in font:
        axes = {axis.axisTag: axis for axis in font["fvar"].axes}
        # Keep the weight, so bold Greek is real bold; drop the width.
        pinned = {tag: axis.defaultValue for tag, axis in axes.items() if tag != "wght"}
        if pinned:
            font = instancer.instantiateVariableFont(font, pinned)
            # Written and read again: the instanced variations table misses
            # the glyphs that have none, which the subsetter asks for.
            buffer = io.BytesIO()
            font.save(buffer)
            buffer.seek(0)
            font = TTFont(buffer, lazy=False)
        if "wght" in axes:
            weight = f"{int(axes['wght'].minValue)} {int(axes['wght'].maxValue)}"
    options = subset.Options()
    options.flavor = "woff2"
    options.hinting = False
    options.desubroutinize = True
    options.notdef_outline = True
    options.name_IDs = ["*"]
    options.layout_features = ["*"]
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=sorted(code_points))
    subsetter.subset(font)
    font.flavor = "woff2"
    font.save(target)
    return weight


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--catalog", type=Path, required=True)
    parser.add_argument("--montserrat", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("sources", nargs="+", help="name=path, in order of preference")
    args = parser.parse_args()

    montserrat = montserrat_code_points(args.montserrat)
    needed = catalog_code_points(args.catalog) - montserrat
    sources = [(name, Path(path)) for name, path in (item.split("=", 1) for item in args.sources)]

    assigned: dict[str, set[int]] = {}
    left = set(needed)
    for name, path in sources:
        mine = left & code_points_of(TTFont(path))
        if mine:
            assigned[name] = mine
            left -= mine
    if left:
        missing = " ".join(chr(point) for point in sorted(left))
        sys.exit(f"No source covers: {missing}")

    args.out.mkdir(parents=True, exist_ok=True)
    faces: list[str] = []
    for name, path in sources:
        points = assigned.get(name)
        if not points:
            continue
        file = f"quizio-symbols-{name}.woff2"
        weight = cut(path, points, args.out / file)
        size = (args.out / file).stat().st_size
        print(f"{file}: {len(points)} symbols, {size} bytes")
        faces.append(
            "@font-face {\n"
            f'\tfont-family: "{FAMILY}";\n'
            "\tfont-style: normal;\n"
            f"\tfont-weight: {weight};\n"
            "\tfont-display: swap;\n"
            f'\tsrc: url("./{file}") format("woff2");\n'
            f"\tunicode-range: {unicode_range(points)};\n"
            "}\n"
        )

    header = (
        "/* Generated by packages/ui/scripts/build-symbol-font.py (spec 047, ADR 0025): do not edit.\n"
        " * Noto Sans, Noto Sans Math and Noto Sans Symbols 2, cut to the symbols\n"
        " * Montserrat lacks; SIL Open Font License 1.1 (OFL.txt). */\n"
    )
    (args.out / "quizio-symbols.css").write_text(header + "\n".join(faces), encoding="utf-8", newline="\n")
    covered = sorted(montserrat | set().union(*assigned.values()))
    (args.out / "quizio-symbols.coverage.json").write_text(
        json.dumps({"codePoints": covered}) + "\n", encoding="utf-8", newline="\n"
    )
    print(f"{len(needed)} symbols cut, {len(covered)} code points covered")


if __name__ == "__main__":
    main()
