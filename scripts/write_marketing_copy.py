# -*- coding: utf-8 -*-
"""Generate docs/marketing-copy-draft.md with proper UTF-8 encoding."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "marketing-copy-draft.md"

PARTS = [
    "marketing-copy-part1.md",
    "marketing-copy-part2.md",
    "marketing-copy-part3.md",
]

def main() -> None:
    chunks: list[str] = []
    for name in PARTS:
        path = ROOT / "docs" / name
        chunks.append(path.read_text(encoding="utf-8"))
    OUT.write_text("".join(chunks), encoding="utf-8", newline="\n")
    print(f"Wrote {OUT} ({OUT.stat().st_size} bytes)")

if __name__ == "__main__":
    main()
