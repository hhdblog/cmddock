# Cmdkit

Reach your most used terminal commands in two clicks, from a single item in the status bar.

`Cmdkit` → command group → command → runs in the terminal. Groups are edited in
`cmdkit-groups.json`, applied into `.vscode/settings.json`, and you can commit that
file to share it with your team.

## Install

```bash
npm install
npm run build
npm run package            # produces cmddock-0.2.5.vsix
code --install-extension cmddock-0.2.5.vsix
```

While developing, open this folder in VSCode and press <kbd>F5</kbd> to start the
Extension Development Host.

## Usage

| What you want                          | What to do                                                                    |
| -------------------------------------- | ----------------------------------------------------------------------------- |
| Run a command                          | Click the **group icon** in the status bar → command (skips the group level)  |
| Pick from every group                  | Click the `Cmd` button in the status bar → group → command                    |
| Edit the command list                  | `Cmdkit: Edit Command List` → the JSON file opens, edit it                    |
| Add a built-in group (Docker, Go, k8s, Surge…) | `Cmdkit: Add Built-in Group` → pick from the library                     |
| Remove a group                         | `Cmdkit: Remove Group` → pick from the groups                                 |
| Search without going through a group   | <kbd>Ctrl</kbd>+<kbd>P</kbd> → `Cmdkit: Search All Commands`                   |
| Repeat the last command                | `Cmdkit: Run Last Command Again`                                              |
| Check Windows compatibility            | `Cmdkit: Check Platform Compatibility`                                       |
| Browse the usable icons                | `Cmdkit: Icon Catalog`                                                        |
| Learn how the command file works       | `Cmdkit: How to Use the Command File`                                        |
| Choose which groups show in the bar    | `Cmdkit: Choose Status Bar Items` (multi select, tick)                        |

The commands you use most float to the top; on a tie the `settings.json` order
wins. The order of the groups themselves always follows your settings.

## The status bar

Each group gets **its own status bar button with its own icon**; clicking one opens that
group's commands directly. The `Cmd` button lists every group in one flat list. Both
are optional:

```
[⌨ Cmd] [🐍] [📱] [⚙]     ← Cmd plus the Python, Flutter, Node.js icons
```

| Setting                            | Default    | Description                                                                                                                                                                              |
| --------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cmdkit.groupFile`               | `""`       | Path to the command file — see the section above                                                                                                                                         |
| `cmdkit.statusBar.showGroups`    | `true`     | Show a separate button per group                                                                                                                                                         |
| `cmdkit.statusBar.showMaster`    | `true`     | Show the `Cmd` button                                                                                                                                                                    |
| `cmdkit.statusBar.maxGroupItems` | `3`        | How many group buttons show in the bar **to begin with**. The rest are created but start hidden: right click the status bar → `Hide Status Bar Items` → **Show**. **`0` = unlimited** |
| `cmdkit.statusBar.hiddenGroups`  | `[]`       | Group names not shown: `["Python"]`                                                                                                                                                      |
| `cmdkit.statusBar.groupLabel`    | `""`       | `"always"` writes the group name next to the icon                                                                                                                                        |
| `cmdkit.statusBar.icon`          | `terminal` | Icon of the `Cmd` button. `"zap"` or `"$(zap)"` both work                                                                                                                               |
| `cmdkit.statusBar.color`         | `#4EC9B0`  | Foreground colour: hex or a theme colour like `charts.red`. Set to `""` to follow the theme. Group buttons keep their own colour                                                                                                                |
| `cmdkit.statusBar.background`    | `""`       | Background colour, same format                                                                                                                                                           |
| `cmdkit.statusBar.priority`      | `250`      | Order of the buttons (higher = further left). Shift it if another extension collides                                                                                                      |

A group button's tooltip shows the group name, the command count and **the most used
command** (`Most used: test (×5)`). The colour setting applies to every button at once;
leave it empty to use the theme (transparent background).

**Crowding the bar:** the status bar is already busy with Pylance, Git, Live Server and
friends; dozens of icons turn it unreadable. That is why only **3** group buttons show
on a fresh install.

This is not a limit, it is a starting value: the first 3 groups are visible and the rest
start **hidden** — the buttons are still created, so they appear under **right click →
`Hide Status Bar Items` → `Cmdkit: Git` / `Cmdkit: Firebase`** in the status bar. Groups
you reveal there stay visible through the next command run; the cap is only reapplied
when you change the setting.

For a permanent choice use `maxGroupItems: 0` (**unlimited**) or drop some entirely with
`hiddenGroups`. To show no group buttons at all, set `showGroups: false`.

Order follows **the group order in your settings**; hidden groups stay reachable through
the `Cmd` button and `Search All Commands`, and the `Cmd` tooltip says how many buttons
are hidden.

Adding or removing a group updates the buttons through the setting change — no reload
needed. VSCode's own status bar context menu can hide them too.

**Hiding them one by one:** right click the status bar and every button is listed
separately under `Hide Status Bar Items`:

```
Cmdkit: All Groups
Cmdkit: Python
Cmdkit: Flutter
Cmdkit: Node.js
```

Two things make this work (both are in place):

- **Identity:** `createStatusBarItem(id, ...)` gives each button its own id
  (`cmdkit.cmd`, `cmdkit.group.Python`, …). Without ids they all fall back to the
  extension identity, the menu collapses into a single entry, and hiding one hides them all.
- **Name:** `StatusBarItem.name` is set. That is the label the menu shows; left empty,
  every entry reads "Cmdkit (extension)".

**Ordering collisions:** VSCode sorts the status bar by the priority of every extension,
so another extension using the same number interleaves with ours (Live Server uses `100`,
which put itself between the `Cmd` button and the group icons). Scanning the installed
extensions turned up `-1, 0, 1, 100, 1000`, so the default is **250** (the 200–259 band was
free). Shift `cmdkit.statusBar.priority` if you still see a collision.

**Cmdkit: Icon Catalog** lists about 120 verified codicons grouped by category and draws
them live; the name you pick is copied to the clipboard — then paste it into
`statusBar.icon` or the `icon` field of a group or command.

> VSCode offers no API to list its icons, so the catalog is kept by hand. Every name in it
> has been placed there by verifying it against VSCode's icon registry.

The `icon` field of a group or command also accepts a bare name: `"icon": "git-branch"`
does not render as text, it is turned into the `$(git-branch)` form.

### The Cmd menu

The `Cmd` button lists the groups first, then the utility menus split into four sections:

```
$(snake) Python                    12 commands
$(device-mobile) Flutter           12 commands
$(server-environment) Node.js      12 commands

—— commands ——
$(search)        Search All Commands
$(debug-rerun)   Run Last Command Again

—— edit the list ——
$(json)          Edit Command List
$(sync)          Apply Command File
$(new-folder)    Add Built-in Group
$(trash)         Remove Group
$(refresh)       Reload File From Settings

—— view ——
$(list-selection) Choose Status Bar Items
$(paintcan)      Icon Catalog

—— check and help ——
$(check)         Check Platform Compatibility
$(markdown)      How to Use the Command File
```

The utility menu is **split into four sections** and ordered **by how often each is
used**: the two daily commands on top, list editing in the middle, the rare ones at the
bottom. To add a command, add a line to the `MENU_ACTIONS` list in `src/menu.ts` and put
its section in the `section` field (`run` / `edit` / `view` / `help`). The order is the
order of definition, the order of sections is `MENU_SECTIONS`. `id` is the command id that
gets executed directly; the same commands are in the Command Palette too.

## Built-in group library

Beyond the 5 groups that ship with the install there are **11 more built-in groups**;
each is added with a single command:

`Cmdkit: Add Built-in Group` → pick from the library → it asks for a destination → writes.

| Group                           | Commands |     | Group                                      | Commands |
| ------------------------------ | -------- | --- | ----------------------------------------- | -------- |
| `$(package)` Docker            | 9     |     | `$(vm)` Kubernetes                        | 10    |
| `$(source-control)` GitHub CLI | 12    |     | `$(symbol-interface)` Java (Maven/Gradle) | 8     |
| `$(database)` PostgreSQL       | 7     |     | `$(server)` Redis                         | 6     |
| `$(server-environment)` Go     | 10    |     | `$(device-mobile)` Android                | 6     |
| `$(gear)` Rust                 | 10    |     | `$(rocket)` Vercel                        | 5     |
| `$(zap)` Surge                 | 15    |     |                                          |       |

The ones that ship with the install live in `configurationDefaults`, so **everyone**
gets them; they sit in the library so that growing the default set does not clutter the
menu for people who do not want it. Groups you have already added do not show in the list.

It only **adds**, never deletes — your existing commands are untouched. To delete, use
`Apply Command File` → `Replace list`.

The library is **`src/library.json`**; to add a group, write an entry there. `npm run
build` reads it and generates the `configurationDefaults` field in `package.json` —
**you never sync the two by hand**, `library.json` is the single source.

`test/unit/library.test.ts` automatically checks that icons exist in the catalog, that
names are unique within a group, and that **destructive commands ask for confirmation**.

## Defining your commands

In `settings.json`, under `cmdkit.groups`:

```jsonc
"cmdkit.groups": [
  {
    "name": "Git",
    "icon": "$(source-control)",
    "color": "#8BC34A",
    "commands": [
      { "name": "status", "command": "git status", "description": "working tree" },
      { "name": "commit", "command": "git commit -m", "argsPrompt": "message", "argsSingle": true },
      { "name": "reset",  "command": "git reset --hard", "confirm": "Cannot be undone!" }
    ]
  }
]
```

| Field         | Required | Description                                                                                                                                                       |
| ------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`        | yes      | Name shown in the menu                                                                                                                                            |
| `command`     | yes      | The shell command to run                                                                                                                                          |
| `description` | no       | Shown as dimmed text on the right                                                                                                                                 |
| `icon`        | no       | Codicon, default `$(terminal)`. A bare name works too (`zap`)                                                                                                     |
| `color`       | no       | Colour of **this group** in the status bar: `#4B8BBE` or `charts.blue`. Empty falls back to `cmdkit.statusBar.color`                                               |
| `confirm`     | no       | `true` or a string → asks before running                                                                                                                           |
| `argsPrompt`  | no       | Asks for input before running                                                                                                                                    |
| `argsSingle`  | no       | **When true the whole input is one argument**, not split on spaces. Required for flags that take free text, such as `git commit -m` or `psql -c`                   |
| `clear`       | no       | `true` → runs with the terminal cleared first                                                                                                                     |

The install brings 5 built-in groups: **Python**, **Flutter**, **Node.js**, **Git**,
**Firebase** (69 commands in total). Writing your own setting replaces them — to drop them
outright, use `"cmdkit.groups": []`.

All 61 commands have a meaningful icon (`$(beaker)` test, `$(shield)` lint,
`$(cloud-download)` install, `$(trash)` delete, `$(paintcan)` format…). The single source
is `src/library.json`; `npm run build` reads it and generates `configurationDefaults` in
`package.json`, and a unit test checks the two stay in step.

`defaults` (the 5 groups of a fresh install) and `groups` (the 16 in the library) sit side
by side in that file, so a default group you removed can be brought back with
`Add Built-in Group`.

| Group    | Icon                    | Colour     | Commands |
| -------- | ----------------------- | ---------- | -------- |
| Python   | `$(snake)`              | `#FFD43B` | 12       |
| Flutter  | `$(device-mobile)`      | `#47C5FB` | 15       |
| Node.js  | `$(server-environment)` | `#83CD29` | 12       |
| Git      | `$(source-control)`     | `#F14E32` | 20       |
| Firebase | `$(broadcast)`          | `#FFCA28` | 10       |

The `color` field of a group only paints the status bar icon (colours cannot be shown in
the menu, `QuickPickItem` does not support them). Priority: the group's own `color` →
otherwise `cmdkit.statusBar.color`.

## Adding, removing and editing commands

Commands live in the `cmdkit.groups` setting, but to edit them by hand the extension uses
an **editing file: it opens in VSCode, is validated against the schema, then applied to
your settings.**

```
Cmdkit: Edit Command List     →  cmdkit-groups.json opens (written from settings if missing)
   ... edit, Ctrl+S ...
Cmdkit: Apply Command File    →  shows a summary, asks, writes settings.json
```

| Command                                | What it does                                                                                                                              |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `Cmdkit: Edit Command List`            | Opens the file. **Asks nothing.** If the file is missing it is created from the current settings; if it exists it is **never overwritten** (so unsaved edits survive) |
| `Cmdkit: Apply Command File`           | Reads the file, **summarises what will change**, asks for confirmation, then picks a destination and writes                                   |
| `Cmdkit: Reload File From Settings`    | **Overwrites** the file with the current list from settings — the way to discard your edits                                                |

The path is remembered per project. The default is **`.vscode/cmdkit-groups.json`** — the
file is applied into `.vscode/settings.json`, so source and destination are in the same
place. With no project open it falls back to your home directory. When no path has been
remembered, `Apply Command File` asks you to pick a file once — that way you can also
take a list someone else sent you.

| Setting                | Default    | Description                                                                                                                                                        |
| ------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cmdkit.groupFile` | `""`       | Path to the editing file. To point at a sub-package in a monorepo: `"packages/api/cmdkit-groups.json"`. Relative paths resolve against the first workspace root |

**Comments are free** in the file (JSONC — `//` line, `/* */` block), and
autocompletion and schema validation work:
`schemas/cmdkit-groups.json` marks both the `name`/`command` requirement and typos
(like `descrition`) in red. Unknown fields are rejected.

Because you edit the file by hand, the export writes the **raw list, not the normalised
one**; redundant fields like `description: ""` and `confirm: false` never leak in. The
same trimming happens when writing `settings.json`, where only the fields you actually
set stay — that keeps about 106 lines of noise from 69 commands out. No setting is lost,
because the fields are filled back in as they are read.

> You never edit `settings.json` by hand; have a teammate pull it into their own file with
> `Apply Command File`. The file to share is `cmdkit-groups.json`.

### Applying (import)

There are two modes:

- **Merge groups** — a same-named command is updated, new ones are added. Anything missing from the incoming list is **not deleted**.
- **Replace list** — the current list becomes the incoming list. Commands missing from it **are deleted** (so this is how you delete).

A summary is shown before writing, then you are asked for **this project**
(`.vscode/settings.json`) or **user** (global).

The summary describes **the result that will be written**, not what is missing from the
file. That is why `to delete` never appears in `Merge groups` mode — merging does not
delete. Examples:

```
Merge groups   →   • Git: 18 commands, 1 new
Replace list   →   • Git: 17 commands, 1 to delete
```

If nothing actually changes, no summary appears at all: you get a "nothing was written"
notice straight away and the file is left alone. (Because the summary compares normalised
fields, purely cosmetic differences are not caught at this step.)

The file format is exactly the same as `cmdkit.groups` and it preserves platform tokens
(`{venv}`, `{rm}` …) as written. Copying to the clipboard was dropped: to share a list,
either commit the file (a teammate pulls it with `Apply Command File`) or commit
`.vscode/settings.json` after applying. The second is longer and noisier; the first is
cleaner.

## Platform tokens

The built-in groups are written as a single string; paths and the delete command are
resolved to the platform at run time.

| Token       | macOS / Linux      | Windows                    |
| ---------- | ------------------ | -------------------------- |
| `{python}` | `python3`          | `python`                   |
| `{venv}`   | `.venv/bin/`       | `.venv\Scripts\`           |
| `{venvpy}` | `.venv/bin/python` | `.venv\Scripts\python.exe` |
| `{rm}`     | `rm -rf`           | `cmd /c rmdir /s /q`       |

```jsonc
{ "name": "test", "command": "{venvpy} -m pytest" }
```

Unknown tokens (`{anything}`) are left as they are.

## Behaviour notes

- Commands run **in the terminal** (`tasks.executeTask`), so you watch the output the usual way.
- All commands **share a single terminal**; run several in a row and they stack up.
- Arguments are passed separately, so quoted paths (`"my file.txt"`) survive intact.
- Commands containing `&&` and `|` work without trouble.
- Long-running commands like `flutter run` or `npm run dev` keep the terminal open; <kbd>Ctrl</kbd>+<kbd>C</kbd> stops them.
- In remote development (SSH/WSL) the command runs in the remote terminal.
- Usage counters are stored per project (`workspaceState`), so `settings.json` stays untouched.

## Development

```bash
npm run typecheck      # tsc --noEmit
npm test               # 418 unit tests (vitest)
npm run test:integration   # smoke test inside a real VSCode
npm run sync-defaults  # src/library.json → package.json (defaults)
npm run icon           # produces media/icon.png
npm run watch          # esbuild watch
```

`test:integration` downloads VSCode by default. To use your local install without
downloading:

```bash
VSCODE_TEST_EXECUTABLE="/Applications/Visual Studio Code.app/Contents/MacOS/Electron" npm run test:integration
```
