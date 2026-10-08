import * as vscode from 'vscode';
import { DeckCommand, DeckGroup, PickedCommand } from './normalize';

interface GroupItem extends vscode.QuickPickItem {
  readonly group: DeckGroup;
}

interface CommandItem extends vscode.QuickPickItem {
  readonly group: DeckGroup;
  readonly command: DeckCommand;
}

/**
 * İki kademeli menü: grup → komut.
 * Her iki çağrı da `showQuickPick` ile yapılır, ayrı `createQuickPick` örneği
 * ve `dispose()` sorumluluğu yoktur. Esc `undefined` döner, çağıran yine de temiz çıkar.
 */
export async function pickCommand(
  groups: readonly DeckGroup[]
): Promise<PickedCommand | undefined> {
  if (groups.length === 0) {
    void vscode.window.showWarningMessage(
      'cmd-deck: komut grubu yok. "cmdDeck.groups" ayarına grup ekle.'
    );
    return undefined;
  }

  const groupItems: GroupItem[] = groups.map((group) => ({
    label: `${group.icon} ${group.name}`,
    description: `${group.commands.length} komut`,
    group,
  }));

  const pickedGroup = await vscode.window.showQuickPick(groupItems, {
    placeHolder: 'Komut grubu',
    matchOnDescription: true,
  });

  if (!pickedGroup) {
    return undefined;
  }

  const commandItems: CommandItem[] = pickedGroup.group.commands.map((command) => ({
    label: `${command.icon} ${command.name}`,
    description: command.description || command.command,
    detail: command.description ? command.command : undefined,
    group: pickedGroup.group,
    command,
  }));

  const pickedCommand = await vscode.window.showQuickPick(commandItems, {
    placeHolder: `${pickedGroup.group.name} — komut seç`,
    matchOnDescription: true,
    matchOnDetail: true,
  });

  if (!pickedCommand) {
    return undefined;
  }

  return { group: pickedCommand.group, command: pickedCommand.command };
}

/**
 * Tüm grupları tek listede toplar — grup seviyesine inmeden arama.
 * Etikette grup adı görünür, `matchOnDetail` ile shell metnine göre de filtrelenir.
 */
export async function pickAnyCommand(
  groups: readonly DeckGroup[]
): Promise<PickedCommand | undefined> {
  if (groups.length === 0) {
    void vscode.window.showWarningMessage(
      'cmd-deck: komut grubu yok. "cmdDeck.groups" ayarına grup ekle.'
    );
    return undefined;
  }

  const items: CommandItem[] = groups.flatMap((group) =>
    group.commands.map((command) => ({
      label: `${command.icon} ${command.name}`,
      description: `${group.icon} ${group.name}`,
      detail: command.command,
      group,
      command,
    }))
  );

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: 'Tüm komutlarda ara',
    matchOnDescription: true,
    matchOnDetail: true,
  });

  return picked ? { group: picked.group, command: picked.command } : undefined;
}
