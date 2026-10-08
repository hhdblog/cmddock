import * as vscode from 'vscode';
import { getGroups } from './config';
import { showIconCatalog } from './iconCatalog';
import { showUsage } from './help';
import { DeckGroup } from './normalize';
import { checkPlatform, maybeShowPlatformNotice } from './platform';
import { pickAnyCommand, pickCommand, pickCommandsInGroup } from './picker';
import { runCommand } from './runner';
import {
  addLibraryGroup,
  applyGroupFile,
  editGroupFile,
  pickStatusBarItems,
  reloadGroupFile,
} from './settings';
import { createStatusBar, StatusBarHandle } from './statusBar';
import { rankGroups, readLast, readUsage, recordRun, resolveLast } from './usage';
import { DeckCommand as Command } from './normalize';
import { PickResult } from './picker';

function ranked(context: vscode.ExtensionContext): DeckGroup[] {
  return rankGroups(getGroups(), readUsage(context.workspaceState));
}

/** Komut gerçekten görev olarak başlatıldıysa kullanım sayacı artar. */
async function launch(
  context: vscode.ExtensionContext,
  statusBar: StatusBarHandle,
  picked: { group: DeckGroup; command: Command }
): Promise<void> {
  if (await runCommand(picked.group, picked.command)) {
    await recordRun(context.workspaceState, picked.group, picked.command);
    statusBar.refresh();
  }
}

/** Cmd menüsünde "diğer menüler" satırı seçilince ilgili komutu çalıştırır. */
async function handle(
  context: vscode.ExtensionContext,
  statusBar: StatusBarHandle,
  picked: PickResult | undefined
): Promise<void> {
  if (!picked) {
    return;
  }

  if (picked.kind === 'action') {
    await vscode.commands.executeCommand(picked.id);
    return;
  }

  await launch(context, statusBar, picked);
}

export function activate(context: vscode.ExtensionContext): void {
  const statusBar = createStatusBar(context);

  // Durum çubuğundaki grup düğmesi: grup seviyesini atlayıp o grubu açar.
  context.subscriptions.push(
    vscode.commands.registerCommand('cmd-deck.openGroup', async (groupName: string) => {
      const groups = getGroups();
      const group = groups.find((candidate) => candidate.name === groupName);

      if (!group) {
        void vscode.window.showWarningMessage(
          `cmd-deck: "${groupName}" grubu artık ayarlarda yok.`
        );
        return;
      }

      await handle(context, statusBar, await pickCommandsInGroup(group));
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('cmd-deck.open', async () => {
      await handle(context, statusBar, await pickCommand(ranked(context)));
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('cmd-deck.search', async () => {
      await handle(context, statusBar, await pickAnyCommand(ranked(context)));
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
    vscode.commands.registerCommand('cmd-deck.reload', () => reloadGroupFile(context))
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('cmd-deck.checkPlatform', () => checkPlatform(context))
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('cmd-deck.export', () => editGroupFile(context))
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('cmd-deck.import', () => applyGroupFile(context))
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('cmd-deck.statusBarItems', () => pickStatusBarItems())
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('cmd-deck.addGroup', async () => {
      await addLibraryGroup(context);
      // Yeni grubun durum çubuğu düğmesi anında görünsün.
      statusBar.refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('cmd-deck.usage', () => showUsage())
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('cmd-deck.iconCatalog', () => showIconCatalog())
  );

  maybeShowPlatformNotice(context);
}

export function deactivate(): void {
  // StatusBarItem ve komut kayıtları context.subscriptions üzerinden dispose edilir.
}
