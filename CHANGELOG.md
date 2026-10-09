# Changelog

## 0.2.5

Run 167 ready-made terminal commands from the VS Code status bar. Five groups are
installed with the extension (69 commands); the other eleven are one command away.

### Groups

Python, Flutter, Node.js, Git and Firebase ship enabled. Docker, GitHub CLI,
PostgreSQL, Go, Rust, Kubernetes, Java (Maven/Gradle), Redis, Android, Vercel and
Surge are added with **CmdDock: Add Built-in Group**.

Every command runs in the shared terminal with its working directory set to the
workspace root. Long-running commands (`flutter run`, `npm run dev`,
`git init` and the rest) keep the terminal open — Ctrl+C stops them.

### Editing

Commands live in the `cmddock.groups` setting, but editing it by hand is tedious, so
the extension uses a separate file: `cmddock-groups.json`. Open it from the command
palette, edit it, then apply. The file is JSONC — `//` and `/* */` comments work,
and it is validated against a JSON schema as you type.

Applying offers two modes. **Merge groups** updates same-named commands and adds new
ones; anything missing from the file is kept. **Replace list** swaps the whole list
for the file's contents.

### Safety

Commands that delete, publish or overwrite ask for confirmation first and say in
plain words what will be lost. Platform tokens (`{python}`, `{venv}`, `{venvpy}`,
`{rm}`) resolve to the right paths on macOS, Linux and Windows, so one command list
works on all three.

### Details

- Group and command buttons use different icons and colours; the Cmd button
  lists every group flat for searching.
- Commands you run most float to the top of the list.
- Usage counters are stored per project and never touch `settings.json`.
- `CmdDock: Check Platform Compatibility` lists commands that will not run on your
  platform and copies the Windows equivalent to the clipboard.