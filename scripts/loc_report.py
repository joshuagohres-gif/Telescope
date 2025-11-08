#!/usr/bin/env python3
"""
Lines of Code (LOC/SLOC) Reporter
Zero-dependency script to count lines of code in the repository.
"""

import argparse
import json
import os
import re
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Set, Tuple, Optional

# Language catalog with comment syntax
LANGS = {
    "TypeScript": {"exts": {".ts", ".tsx"}, "line": r"//", "block": (r"/\*", r"\*/")},
    "JavaScript": {"exts": {".js", ".jsx"}, "line": r"//", "block": (r"/\*", r"\*/")},
    "Python": {"exts": {".py"}, "line": r"#", "triple": (r'"""', r"'''")},
    "Go": {"exts": {".go"}, "line": r"//", "block": (r"/\*", r"\*/")},
    "C/C++": {"exts": {".c", ".h", ".cpp", ".hpp"}, "line": r"//", "block": (r"/\*", r"\*/")},
    "Rust": {"exts": {".rs"}, "line": r"//", "block": (r"/\*", r"\*/")},
    "Java": {"exts": {".java"}, "line": r"//", "block": (r"/\*", r"\*/")},
    "Kotlin": {"exts": {".kt"}, "line": r"//", "block": (r"/\*", r"\*/")},
    "Shell": {"exts": {".sh"}, "line": r"#"},
    "YAML": {"exts": {".yml", ".yaml"}, "line": r"#"},
    "JSON": {"exts": {".json"}},  # no comments
    "Markdown": {"exts": {".md"}},  # docs only
}

# Default exclude patterns
DEFAULT_EXCLUDES = {
    "node_modules",
    ".git",
    "dist",
    "build",
    "out",
    ".next",
    ".cache",
    "coverage",
    "__pycache__",
    "venv",
    ".venv",
    "generated",
    "proto",
    "migrations",
}

DEFAULT_EXCLUDE_PATTERNS = {
    "*.min.*",
    "*.lock",
    "*.bundle.*",
}


class LOCCounter:
    def __init__(self, args):
        self.args = args
        self.root = Path(args.path).resolve()
        self.excludes = self._build_exclude_set()
        self.ext_to_lang = self._build_extension_map()
        self.results = {}
        self.total_loc = 0
        self.total_sloc = 0
        self.total_files = 0

    def _build_exclude_set(self) -> Set[str]:
        """Build set of patterns to exclude"""
        excludes = DEFAULT_EXCLUDES.copy()
        excludes.update(DEFAULT_EXCLUDE_PATTERNS)

        # Load .slocignore if it exists
        slocignore = self.root / ".slocignore"
        if slocignore.exists():
            with open(slocignore, "r") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#"):
                        excludes.add(line)

        return excludes

    def _build_extension_map(self) -> Dict[str, str]:
        """Map file extensions to language names"""
        ext_map = {}
        for lang, config in LANGS.items():
            for ext in config.get("exts", set()):
                ext_map[ext] = lang
        return ext_map

    def _should_exclude(self, path: Path) -> bool:
        """Check if path should be excluded"""
        path_str = str(path.relative_to(self.root))

        # Check directory exclusions
        parts = path_str.split(os.sep)
        for part in parts:
            if part in self.excludes:
                return True

        # Check pattern exclusions
        for pattern in self.excludes:
            if "*" in pattern:
                import fnmatch
                if fnmatch.fnmatch(path.name, pattern):
                    return True

        # Check test directories (unless --include-tests)
        if not self.args.include_tests:
            if any(p in {"test", "tests", "__tests__"} for p in parts):
                return True

        # Check generated files (unless --include-generated)
        if not self.args.include_generated:
            if any(p in {"generated", "proto", "migrations"} for p in parts):
                return True

        return False

    def _count_sloc(self, lines: List[str], lang_config: dict) -> int:
        """Count source lines of code (excluding blanks and comments)"""
        sloc = 0
        in_block_comment = False
        in_triple_quote = False
        triple_quote_char = None

        line_comment = lang_config.get("line")
        block_comment = lang_config.get("block")
        triple = lang_config.get("triple")

        for line in lines:
            stripped = line.strip()

            # Skip blank lines
            if not stripped:
                continue

            # Handle Python triple-quoted strings (docstrings)
            if triple and not in_block_comment:
                for tq in triple:
                    if tq in stripped:
                        if not in_triple_quote:
                            in_triple_quote = True
                            triple_quote_char = tq
                            # Check if it closes on same line
                            if stripped.count(tq) >= 2:
                                in_triple_quote = False
                                triple_quote_char = None
                            continue
                        elif triple_quote_char and tq == triple_quote_char:
                            in_triple_quote = False
                            triple_quote_char = None
                            continue

                if in_triple_quote:
                    continue

            # Handle block comments
            if block_comment:
                block_start, block_end = block_comment

                # Check for block comment start
                if not in_block_comment and block_start in stripped:
                    in_block_comment = True
                    # Check if it ends on same line
                    if block_end in stripped:
                        in_block_comment = False
                    continue

                # Check for block comment end
                if in_block_comment:
                    if block_end in stripped:
                        in_block_comment = False
                    continue

            # Handle line comments
            if line_comment and stripped.startswith(line_comment):
                continue

            # This is a source line
            sloc += 1

        return sloc

    def _count_file(self, file_path: Path) -> Optional[Tuple[str, int, int]]:
        """Count LOC/SLOC for a single file"""
        ext = file_path.suffix.lower()
        lang = self.ext_to_lang.get(ext)

        if not lang:
            return None

        # Skip large files
        try:
            if file_path.stat().st_size > self.args.max_bytes:
                return None
        except OSError:
            return None

        # Read file
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                lines = f.readlines()
        except (OSError, UnicodeDecodeError):
            return None

        # Check for GENERATED marker
        if not self.args.include_generated:
            first_lines = "".join(lines[:10]).upper()
            if "GENERATED" in first_lines or "AUTO-GENERATED" in first_lines:
                return None

        loc = len(lines)

        # For Markdown, only count LOC
        if lang == "Markdown":
            sloc = None
        # For JSON, SLOC = non-blank lines
        elif lang == "JSON":
            sloc = sum(1 for line in lines if line.strip())
        # For other languages, parse comments
        else:
            lang_config = LANGS[lang]
            sloc = self._count_sloc(lines, lang_config)

        return (lang, loc, sloc)

    def run(self):
        """Walk the tree and count all files"""
        print(f"Counting lines in: {self.root}")
        print()

        # Collect all source files
        files_to_count = []
        for file_path in self.root.rglob("*"):
            if file_path.is_file() and not self._should_exclude(file_path):
                # Follow symlinks only if requested
                if file_path.is_symlink() and not self.args.follow_symlinks:
                    continue
                files_to_count.append(file_path)

        # Count each file
        for file_path in files_to_count:
            result = self._count_file(file_path)
            if result:
                lang, loc, sloc = result

                if lang not in self.results:
                    self.results[lang] = {"files": 0, "loc": 0, "sloc": 0}

                self.results[lang]["files"] += 1
                self.results[lang]["loc"] += loc
                if sloc is not None:
                    self.results[lang]["sloc"] += sloc

                self.total_files += 1
                self.total_loc += loc
                if sloc is not None:
                    self.total_sloc += sloc

    def print_report(self):
        """Print human-readable report"""
        # Sort by LOC descending
        sorted_langs = sorted(
            self.results.items(),
            key=lambda x: x[1]["loc"],
            reverse=True
        )

        # Print table
        print(f"{'Language':<15} {'Files':>8} {'LOC':>12} {'SLOC':>12}")
        print("-" * 50)

        for lang, data in sorted_langs:
            sloc_str = f"{data['sloc']:,}" if data['sloc'] > 0 else "—"
            print(f"{lang:<15} {data['files']:>8,} {data['loc']:>12,} {sloc_str:>12}")

        print("-" * 50)
        print(f"{'TOTAL':<15} {self.total_files:>8,} {self.total_loc:>12,} {self.total_sloc:>12,}")
        print()

    def write_json(self):
        """Write machine-readable JSON report"""
        output = {
            "timestamp": datetime.now().isoformat(),
            "root": str(self.root),
            "totals": {
                "loc": self.total_loc,
                "sloc": self.total_sloc,
                "files": self.total_files,
            },
            "by_language": [
                {
                    "language": lang,
                    "files": data["files"],
                    "loc": data["loc"],
                    "sloc": data["sloc"],
                }
                for lang, data in sorted(
                    self.results.items(),
                    key=lambda x: x[1]["loc"],
                    reverse=True
                )
            ],
            "excluded": {
                "patterns": list(self.excludes),
                "paths_count": 0,  # Could track this if needed
            }
        }

        output_path = Path("loc-report.json")
        with open(output_path, "w") as f:
            json.dump(output, f, indent=2)

        print(f"Wrote {output_path}")


def main():
    parser = argparse.ArgumentParser(
        description="Count lines of code (LOC/SLOC) in the repository",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python scripts/loc_report.py
  python scripts/loc_report.py --include-tests
  python scripts/loc_report.py --path src
  python scripts/loc_report.py --extensions ".ts,.tsx,.py"
        """,
    )

    parser.add_argument(
        "--path",
        default=".",
        help="Root directory to scan (default: current directory)",
    )
    parser.add_argument(
        "--include-tests",
        action="store_true",
        help="Include test files (default: excluded)",
    )
    parser.add_argument(
        "--include-generated",
        action="store_true",
        help="Include generated files (default: excluded)",
    )
    parser.add_argument(
        "--extensions",
        help="Comma-separated list of extensions to count (e.g., '.ts,.tsx,.py')",
    )
    parser.add_argument(
        "--follow-symlinks",
        action="store_true",
        help="Follow symbolic links (default: don't follow)",
    )
    parser.add_argument(
        "--max-bytes",
        type=int,
        default=5 * 1024 * 1024,  # 5MB
        help="Skip files larger than this (default: 5MB)",
    )

    args = parser.parse_args()

    counter = LOCCounter(args)
    counter.run()
    counter.print_report()
    counter.write_json()


if __name__ == "__main__":
    main()
