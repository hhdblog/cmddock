import * as vscode from 'vscode';
import { getGroups } from './config';
import { DeckCommand, DeckGroup } from './normalize';
import { expandTokens, isPosixOnly } from './tokens';

const NOTICE_KEY = 'cmdDeck.platformNoticeShown';

interface Offending {
  readonly group: DeckGroup;
  readonly command: DeckCommand;
}

function findPosixOnly(groups: readonly DeckGroup[]): Offending[] {
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
      placeHolder: 'Windows karşılığı seç — panoya kopyalanır',
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
    'cmd-deck: panoya kopyalandı — cmdDeck.groups içindeki komutu bununla değiştir.'
  );
}

/** Windows'ta POSIX yolu içeren komutları tek tek düzeltmek için. */
export async function checkPlatform(context: vscode.ExtensionContext): Promise<void> {
  const offending = findPosixOnly(getGroups());

  if (offending.length === 0) {
    void vscode.window.showInformationMessage(
      `cmd-deck: ${process.platform} için sorunlu komut yok.`
    );
    return;
  }

  const choice = await vscode.window.showWarningMessage(
    `${offending.length} komut POSIX yolu içeriyor (.venv/bin, rm -rf). ` +
      `Bu platform: ${process.platform}.`,
    'Windows karşılığını kopyala',
    'Bir daha gösterme'
  );

  if (choice === 'Windows karşılığını kopyala') {
    await copyWindowsVersion(offending);
  } else if (choice === 'Bir daha gösterme') {
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
      `cmd-deck: ${count} komut macOS/Linux yolu içeriyor, Windows'ta çalışmaz.`,
      'Windows karşılığını kopyala'
    )
    .then((choice) => {
      if (choice === 'Windows karşılığını kopyala') {
        return copyWindowsVersion(findPosixOnly(getGroups()));
      }
      return undefined;
    });
}
