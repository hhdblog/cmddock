import * as vscode from 'vscode';

/**
 * The guide shown by the `Cmdkit: How to Use the Command File` command.
 *
 * Kept as a plain file on purpose: the content lands in a virtual document the
 * user can read and copy from. It is long enough that
 * `showInformationMessage` will not do, so a previewable Markdown document is
 * opened instead.
 */
export const USAGE = `# Cmdkit — how to use the command file

Commands live in the **\`cmdkit.groups\`** setting and run in this order on
screen:

\`Cmd\` button → group → command → runs in the terminal.

Editing that setting by hand is tedious, so the editing happens in a separate
file: **\`cmdkit-groups.json\`**.

## Three steps

1. **\`Cmdkit: Edit Command List\`** → the file opens.
   If it does not exist it is created from your settings; if it does, it is
   **never overwritten**.
2. Edit the file, save with <kbd>Ctrl</kbd>+<kbd>S</kbd>.
   **Saving does not apply it.**
3. **\`Cmdkit: Apply Command File\`** → summarises what will change, asks for
   confirmation, asks for a destination and writes \`settings.json\`.

No command changes until you change the setting. The extension always reads
\`settings.json\`, never the file — the third step is the only link between
them.

You can use \`//\` line comments in the file — it is JSONC, so \`/* */\` block
comments work too. Since you are editing it by hand, comments are natural; they
come in handy for noting why a colour like \`#4B8BBE\` is there.

Only \`//\` outside quotes counts as a comment: in \`"command": "curl
https://x/y"\` the \`//\` is part of the command and is left alone.

### Where is the file?

By default **\`<project>/.vscode/cmdkit-groups.json\`** — the file is applied
into \`.vscode/settings.json\`, so source and destination sit in the same folder.
With no project open it falls back to your home directory. The path is
remembered per project.

To point at a sub-package in a monorepo use the \`cmdkit.groupFile\` setting:

\`\`\`json
{
  "cmdkit.groupFile": "packages/api/cmdkit-groups.json"
}
\`\`\`

Relative paths resolve against the first workspace root, absolute paths are
taken as they are. Once a path has been remembered, changing the setting has no
effect — the remembered path wins.

## Applying (import) — two modes

| Mode | What it does |
|---|---|
| **Merge groups** | Same-named commands are updated, new ones added. Anything **missing from the incoming list is kept.** |
| **Replace list** | The current list becomes the incoming list. Anything **missing from the incoming list is deleted.** |

The summary describes the **result that will be written**, not what is missing
from the file. That is why \`will be deleted\` never appears in \`Merge groups\`
mode — merging does not delete. Examples:

\`\`\`
Merge groups   →   • Git: 15 commands, 1 new
Replace list   →   • Git: 15 commands, 2 to delete
\`\`\`

When an entire **group** disappears it takes its commands with it, and its icon
and colour go too. The summary calls that out separately, and loudly:

\`\`\`
• Node.js: GROUP WILL BE DELETED (12 commands, icon and colour go too)
2 groups will be deleted entirely. This cannot be undone — consider moving the
commands to another group before you continue.
\`\`\`

If a group's icon or colour changes, the summary says \`icon/colour changed\`.

If nothing actually changes, no summary is shown at all and the file is left
untouched.

## Deleting

To delete a command: remove it from the file and apply with **\`Replace list\`**.
\`Merge groups\` never deletes — the old command survives even if you confirm.

To delete a group, **\`Cmdkit: Remove Group\`** is safer. \`Replace list\` swaps the
whole list for the incoming file, so if the file is stale (say a group was
added from the library but never written back to the file) groups you wanted to
keep go with it. \`Remove Group\` takes out only the group you picked.

The last group cannot be removed — that would leave no commands to run. So the
list never empties, and applying an empty \`[]\` file is rejected too.

There is no undo, deliberately: the settings file is not under version control,
it is "the list as last written". The file is in your hands before you delete
anything, so if something goes missing you can restore it from the file and
apply with \`Replace list\`.

## Duplicate names

Two groups with the same name make the second button open the first — which
happens when settings are written by hand. Keep the group names distinct.

## Where does it get written?

\`Apply Command File\` asks for a destination at the end:

- **This project** → \`<project>/.vscode/settings.json\`
- **User** → global settings, valid for every project

With no project open the question is skipped and the user settings are used.

A project value **shadows** a user value. So if a project has \`cmdkit.groups\`
in \`.vscode/settings.json\`, a user setting you write at the same time stays
ineffective for that project.

## Sharing with a team

The file to share is **\`cmdkit-groups.json\`**. Commit it to the repo and let a
teammate pull it into their own settings with \`Apply Command File\`.

Committing \`.vscode/settings.json\` works too, but it is written normalised, so
61 commands turn into roughly 100 lines of noise.

## Field reference

### Group

| Field | Required | Default | What it does |
|---|---|---|---|
| \`name\` | yes | — | Heading in the menu, label of the status bar button |
| \`icon\` | no | \`$(terminal)\` | Status bar icon. A bare name works too: \`"zap"\` |
| \`color\` | no | theme | Colour of this group's button only. \`"#4B8BBE"\` or \`charts.blue\` |
| \`commands\` | yes | — | The command list |

### Command

| Field | Required | Default | What it does |
|---|---|---|---|
| \`name\` | yes | — | Name shown in the menu |
| \`command\` | yes | — | The shell command to run |
| \`icon\` | no | \`$(terminal)\` | Icon on the command row |
| \`description\` | no | empty | Dimmed text on the right of the menu |
| \`confirm\` | no | \`false\` | \`true\`, or any text, asks for confirmation before running |
| \`argsPrompt\` | no | — | Asks the user for a value before running |
| \`argsSingle\` | no | \`false\` | **When true the whole input is one argument**, not split on spaces. Required for flags that take free text, such as \`git commit -m\` or \`psql -c\` |
| \`clear\` | no | \`false\` | \`true\` runs with the terminal cleared first |

**Example:**

\`\`\`json
{
  "name": "Git",
  "icon": "$(source-control)",
  "color": "#F14E32",
  "commands": [
    { "name": "status", "command": "git status", "description": "working tree" },
    { "name": "commit", "command": "git commit -m", "argsPrompt": "message (e.g. fix typo)" },
    { "name": "reset", "command": "git reset --hard", "confirm": "Cannot be undone!" }
  ]
}
\`\`\`

## Platform tokens

The built-in groups are written as a single string; paths and the delete
command are resolved to the platform at run time.

| Token | macOS / Linux | Windows |
|---|---|---|
| \`{python}\` | \`python3\` | \`python\` |
| \`{venv}\` | \`.venv/bin/\` | \`.venv\\Scripts\\\` |
| \`{venvpy}\` | \`.venv/bin/python\` | \`.venv\\Scripts\\python.exe\` |
| \`{rm}\` | \`rm -rf\` | \`cmd /c rmdir /s /q\` |

\`\`\`json
{ "name": "test", "command": "{venvpy} -m pytest" }
\`\`\`

Unknown tokens (\`{anything}\`) are left as they are.

## Common problems

**"It looks like nothing changed."** You saved but did not apply. Run
\`Apply Command File\`.

**"I changed the group icon, the bar still shows the old one."** Finish the
apply; changing the setting refreshes the buttons on its own.

**"I deleted a command but it is still there."** \`Merge groups\` does not
delete. Use \`Replace list\`.

**"My group is missing."** Groups with an empty \`commands\` array are
**silently ignored** — you think you added it, but it never shows up. The file
needs at least one command; the schema marks an empty array red.

**"Content could not be read" error.** The message gives the reason: the JSON
may be broken, the file may not be an array, the command arrays may be empty,
or fields may be missing.

**"My menu is crowded."** There are \`maxGroupItems\` (default 3) and
\`hiddenGroups\` settings; run \`Cmdkit: Choose Status Bar Items\` to tick the ones
that should stay.

**"More built-in groups."** \`Cmdkit: Add Built-in Group\` — Docker, Go,
Kubernetes, PostgreSQL, GitHub CLI and five more.
`;

/**
 * Opens the guide as a previewable Markdown document.
 *
 * Writes no real file: the content goes to a virtual document, so the user can
 * copy whatever they want without littering the extension folder.
 */
export async function showUsage(): Promise<void> {
  const document = await vscode.workspace.openTextDocument({
    language: 'markdown',
    content: USAGE,
  });
  await vscode.window.showTextDocument(document, { preview: true });
}