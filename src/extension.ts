import * as vscode from 'vscode';
import { getGroups } from './config';
import { showIconCatalog } from './iconCatalog';
import { showUsage } from './help';
import { Command, Group } from './normalize';
import { checkPlatform, maybeShowPlatformNotice } from './platform';
import { pickAnyCommand, pickCommand, pickCommandsInGroup, PickResult } from './picker';
import { runCommand } from './runner';
import {
  addLibraryGroup,
  applyGroupFile,
  editGroupFile,
  pickStatusBarItems,
  reloadGroupFile,
  removeGroup,
} from './settings';
import { createStatusBar, StatusBarHandle } from './statusBar';
import { rankGroups, readLast, readUsage, recordRun, resolveLast } from './usage';

function ranked(context: vscode.ExtensionContext): Group[] {
  return rankGroups(getGroups(), readUsage(context.workspaceState));
}

/** Komut gerçekten görev olarak başlatıldıysa kullanım sayacı artar. */
async function launch(
  context: vscode.ExtensionContext,
  statusBar: StatusBarHandle,
  picked: { group: Group; command: Command }
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
    vscode.commands.registerCommand('cmdkit.openGroup', async (groupName: string) => {
      const groups = getGroups();
      const group = groups.find((candidate) => candidate.name === groupName);

      if (!group) {
        void vscode.window.showWarningMessage(
          `cmdkit: the group "${groupName}" is no longer in your settings.`
        );
        return;
      }

      await handle(context, statusBar, await pickCommandsInGroup(group));
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('cmdkit.open', async () => {
      await handle(context, statusBar, await pickCommand(ranked(context)));
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('cmdkit.search', async () => {
      await handle(context, statusBar, await pickAnyCommand(ranked(context)));
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('cmdkit.runLast', async () => {
      const groups = ranked(context);
      const last = readLast(context.workspaceState);
      const resolved = resolveLast(groups, last);

      if (!resolved) {
        void vscode.window.showInformationMessage(
          last
            ? 'cmdkit: the last run command is no longer in your settings.'
            : 'cmdkit: no command has been run yet.'
        );
        return;
      }

      await launch(context, statusBar, resolved);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('cmdkit.reload', () => reloadGroupFile(context))
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('cmdkit.checkPlatform', () => checkPlatform(context))
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('cmdkit.export', () => editGroupFile(context))
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('cmdkit.import', () => applyGroupFile(context))
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('cmdkit.statusBarItems', () => pickStatusBarItems())
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('cmdkit.addGroup', async () => {
      await addLibraryGroup(context);
      // Yeni grubun durum çubuğu düğmesi anında görünsün.
      statusBar.refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('cmdkit.removeGroup', async () => {
      await removeGroup(context);
      statusBar.refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('cmdkit.usage', () => showUsage())
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('cmdkit.iconCatalog', () => showIconCatalog())
  );

  maybeShowPlatformNotice(context);
}

export function deactivate(): void {
  // StatusBarItem ve komut kayıtları context.subscriptions üzerinden dispose edilir.
}
