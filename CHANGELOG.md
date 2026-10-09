# Changelog

## 0.2.2

- **Release notes are now in English**, matching the description, the README and the
  extension UI.

## 0.2.1

First fix release after the Marketplace debut. The command library is unchanged —
this release covers visibility and packaging.

### Visibility

- **Keywords 4 → 9.** Added `productivity`, `cli`, `shell`, `command palette`
  and `workflow`, so the extension surfaces in more searches.
- **Marketplace page fields.** Added `repository`, `homepage`, `bugs` and
  `galleryBanner`, which makes the "View Repository" and "Report Issue" buttons
  work. Source code is visible, which strengthens the trust story for an
  extension that runs shell commands.

### Packaging

- **Package 61 KB → 41 KB.** `PLAN.md` (a 900-line design log) and the source map
  (214 KB) are no longer packaged. The source map is still generated locally, so
  debugging is unaffected.
- Added `.vscodeignore`: sources, tests and configuration files are not packaged.

### Fixes

- **Python group colour** `#4B8BBE` → `#FFD43B`, Python's official yellow. Contrast
  on dark themes goes from 4.85 to 12.46, and it no longer resembles Flutter's tone.
- **Cmd button** now defaults to teal (`#4EC9B0`), matching the extension icon.
