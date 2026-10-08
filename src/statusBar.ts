import * as vscode from 'vscode';
import { getGroups } from './config';
import { countCommands } from './normalize';
import { readLast, readUsage, resolveLast } from './usage';

const OPEN_COMMAND = 'cmd-deck.open';

export interface StatusBarHandle {
  readonly item: vscode.StatusBarItem;
  refresh(): void;
}

export function createStatusBar(context: vscode.ExtensionContext): StatusBarHandle {
  const item = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  item.command = OPEN_COMMAND;

  const refresh = (): void => {
    const groups = getGroups();
    const total = countCommands(groups);
    const usage = readUsage(context.workspaceState);
    const last = resolveLast(groups, readLast(context.workspaceState));

    item.text = total > 0 ? '$(terminal) cmd' : '$(terminal) cmd!';

    if (total === 0) {
      item.tooltip = 'Cmd Deck — "cmdDeck.groups" boş, komut yok';
      return;
    }

    const runs = Object.values(usage).reduce((sum, record) => sum + record.count, 0);
    const lines = [
      `**Cmd Deck** — ${groups.length} grup, ${total} komut`,
      last ? `Son: ${last.group} › ${last.command.name}` : 'Son: henüz çalıştırılmadı',
      `${runs} çalıştırma`,
      '',
      'Tıkla: grup seç → komut çalıştır',
    ];

    item.tooltip = new vscode.MarkdownString(lines.join('\n\n'));
  };

  refresh();
  item.show();

  // dispose, deactivate içinde subscriptions tarafından otomatik yapılır.
  context.subscriptions.push(item);
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('cmdDeck')) {
        refresh();
      }
    })
  );

  // Memento üzerinde değişiklik event'i yok; çağıran taraf recordRun sonrası refresh() ile bildirir.
  return { item, refresh };
}
