# Test Fixture Expectations

## File: `mini/a.ts` (TypeScript)
- **LOC**: 13 (total lines)
- **SLOC**: 4 (source lines: export function, return statement, const x = 42, and closing brace)
- Comments removed: single-line (`//`) and multi-line block comments (`/* */`)

## File: `mini/b.py` (Python)
- **LOC**: 13 (total lines)
- **SLOC**: 3 (source lines: def greet, return statement, x = 42)
- Comments removed: triple-quoted docstrings and `#` comments

## File: `mini/README.md` (Markdown)
- **LOC**: 6 (total lines)
- **SLOC**: — (Markdown is counted as documentation, SLOC not applicable)

## Expected Totals (when running from `scripts/fixtures/mini`):
```
Language     Files     LOC      SLOC
-----------  -------   -------  -------
TypeScript   1         13       4
Python       1         13       3
Markdown     1         6        —
TOTAL        3         32       7
```

## Validation Command:
```bash
cd scripts/fixtures && python ../loc_report.py --path mini
```
