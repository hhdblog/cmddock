import * as vscode from 'vscode';
import { getGroups } from './config';
import { DeckGroup, PickedCommand } from './normalize';
import { checkPlatform, maybeShowPlatformNotice } from './platform';
import { pickAnyCommand, pickCommand } from './picker';
import { runCommand } from './runner';
import { createStatusBar, StatusBarHandle } from './statusBar';
import { rankGroups, readLast, readUsage, recordRun, resolveLast } from './usage';

function ranked(context: vscode.ExtensionContext): DeckGroup[] {
  return rankGroups(getGroups(), readUsage(context.workspaceState));
}

/** Komut gerçekten görev olarak başlatıldıysa kullanım sayacı artar. */
async function launch(
  context: vscode.ExtensionContext,
  statusBar: StatusBarHandle,
  picked: PickedCommand
): Promise<void> {
  if (await runCommand(picked.group, picked.command)) {
    await recordRun(context.workspaceState, picked.group, picked.command);
    statusBar.refresh();
  }
}

export function activate(context: vscode.ExtensionContext): void {
  const statusBar = createStatusBar(context);

  context.subscriptions.push(
    vscode.commands.registerCommand('cmd-deck.open', async () => {
      const picked = await pickCommand(ranked(context));
      if (picked) {
        await launch(context, statusBar, picked);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('cmd-deck.search', async () => {
      const picked = await pickAnyCommand(ranked(context));
      if (picked) {
        await launch(context, statusBar, picked);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('cmd-deck.runLast', async () => {
      const groups = ranked(context);
      const last = readLast(context.workspaceState);
      const resolved = resolveLast(groups, last);

      if (!resolved) {
        void vscode.window.showInformationMessage(
          last
            ? 'cmd-deck: son çalışan komut artık ayarlarda yok.'
            : 'cmd-deck: henüz komut çalıştırılmadı.'
        );
        return;
      }

      await launch(context, statusBar, resolved);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('cmd-deck.reload', () => {
      void vscode.window.showInformationMessage(
        'cmd-deck: ayarlar her açılışta yeniden okunur.'
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('cmd-deck.checkPlatform', () => checkPlatform(context))
  );

  maybeShowPlatformNotice(context);
}

export function deactivate(): void {
  // StatusBarItem ve komut kayıtları context.subscriptions üzerinden dispose edilir.
}
