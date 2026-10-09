import * as vscode from 'vscode';
import { getGroups } from './config';
import { Command, Group } from './normalize';
import { expandTokens, isPosixOnly } from './tokens';

const NOTICE_KEY = 'cmdkit.platformNoticeShown';

interface Offending {
  readonly group: Group;
  readonly command: Command;
}

function findPosixOnly(groups: readonly Group[]): Offending[] {
  return groups.flatMap((group) =>
    group.commands
      .filter((command) => isPosixOnly(command.command))
      .map((command) => ({ group, command }))
  );
}

async function copyWindowsVersion(offending: readonly Offending[]): Promise<void> {
  const picked = await vscode.window.showQuickPick(
    offending.map((entry) => ({
      label: `${entry.command.name}`,
      description: entry.group.name,
      detail: expandTokens(entry.command.command, 'win32'),
    })),
    {
      placeHolder: 'Pick the Windows equivalent — it is copied to the clipboard',
      matchOnDescription: true,
      matchOnDetail: true,
    }
  );

  if (!picked) {
    return;
  }

  const source = offending.find(
    (entry) => entry.command.name === picked.label && entry.group.name === picked.description
  );

  if (!source) {
    return;
  }

  await vscode.env.clipboard.writeText(expandTokens(source.command.command, 'win32'));
  void vscode.window.showInformationMessage(
    'cmdkit: copied — replace the command in cmdkit.groups with this.'
  );
}

/** Windows'ta POSIX yolu içeren komutları tek tek düzeltmek için. */
export async function checkPlatform(context: vscode.ExtensionContext): Promise<void> {
  const offending = findPosixOnly(getGroups());

  if (offending.length === 0) {
    void vscode.window.showInformationMessage(
      `cmdkit: no problematic commands for ${process.platform}.`
    );
    return;
  }

  const choice = await vscode.window.showWarningMessage(
    `${offending.length} commands contain POSIX paths (.venv/bin, rm -rf). ` +
      `Bu platform: ${process.platform}.`,
    'Copy the Windows equivalent',
    'Do not show again'
  );

  if (choice === 'Copy the Windows equivalent') {
    await copyWindowsVersion(offending);
  } else if (choice === 'Do not show again') {
    await context.globalState.update(NOTICE_KEY, true);
  }
}

/** Windows'ta bir kez uyarır; macOS/Linux'da varsayılanlar zaten doğru. */
export function maybeShowPlatformNotice(context: vscode.ExtensionContext): void {
  if (process.platform !== 'win32' || context.globalState.get(NOTICE_KEY) === true) {
    return;
  }

  void context.globalState.update(NOTICE_KEY, true);

  const count = findPosixOnly(getGroups()).length;
  if (count === 0) {
    return;
  }

  void vscode.window
    .showInformationMessage(
      `cmdkit: ${count} commands contain macOS/Linux paths and will not run on Windows.`,
      'Copy the Windows equivalent'
    )
    .then((choice) => {
      if (choice === 'Copy the Windows equivalent') {
        return copyWindowsVersion(findPosixOnly(getGroups()));
      }
      return undefined;
    });
}
