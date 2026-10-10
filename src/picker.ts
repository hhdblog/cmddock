import * as vscode from 'vscode';
import { MENU_SEPARATOR, menuRows } from './menu';
import { Command, Group } from './normalize';

interface GroupItem extends vscode.QuickPickItem {
  readonly group: Group;
}

interface CommandItem extends vscode.QuickPickItem {
  readonly group: Group;
  readonly command: Command;
}

interface ActionItem extends vscode.QuickPickItem {
  readonly actionId: string;
}

interface SeparatorItem extends vscode.QuickPickItem {
  readonly kind: vscode.QuickPickItemKind.Separator;
}

/**
 * Cmd menüsünün satır tipleri. Ayraç kendi tipiyle ayrı ki daraltma
 * ('actionId' in picked) düzgün çalışsın.
 */
type MasterItem = GroupItem | ActionItem | SeparatorItem;

/** Cmd düğmesinden gelen seçim: ya bir komut, ya da listedeki bir yardımcı menü. */
export type PickResult =
  | { readonly kind: 'command'; readonly group: Group; readonly command: Command }
  | { readonly kind: 'action'; readonly id: string };

/**
 * İki kademeli menü: grup → komut.
 * Her iki çağrı da `showQuickPick` ile yapılır, ayrı `createQuickPick` örneği
 * ve `dispose()` sorumluluğu yoktur. Esc `undefined` döner, çağıran yine de temiz çıkar.
 */
export async function pickCommand(
  groups: readonly Group[]
): Promise<PickResult | undefined> {
  if (groups.length === 0) {
    void vscode.window.showWarningMessage(
      'cmddock: no command groups. Add one to the "cmddock.groups" setting.'
    );
    return undefined;
  }

  const groupItems: MasterItem[] = [
    ...groups.map((group): GroupItem => ({
      label: `${group.icon} ${group.name}`,
      description: `${group.commands.length} commands`,
      group,
    })),
    { kind: vscode.QuickPickItemKind.Separator, label: MENU_SEPARATOR } as const,
    // Bölüm başlığı ayracı, sonra o bölümün kalemleri.
    ...menuRows().map((row): MasterItem => {
      if (row.type === 'separator') {
        return { kind: vscode.QuickPickItemKind.Separator, label: row.label } as const;
      }
      const { action } = row;
      return {
        label: `${action.icon} ${action.label}`,
        description: action.description,
        actionId: action.id,
      };
    }),
  ];

  const picked = await vscode.window.showQuickPick(groupItems, {
    placeHolder: 'A command group or one of the other menus',
    matchOnDescription: true,
  });

  if (!picked) {
    return undefined;
  }

  if ('actionId' in picked && picked.actionId) {
    return { kind: 'action', id: picked.actionId };
  }

  if (!('group' in picked)) {
    return undefined;
  }

  const pickedGroup = picked;

  return pickCommandsInGroup(pickedGroup.group);
}

/** Grup seviyesini atlayıp doğrudan o grubun komutlarını listeler. */
export async function pickCommandsInGroup(
  group: Group
): Promise<PickResult | undefined> {
  const commandItems: CommandItem[] = group.commands.map((command) => ({
    label: `${command.icon} ${command.name}`,
    description: command.description || command.command,
    detail: command.description ? command.command : undefined,
    group,
    command,
  }));

  const pickedCommand = await vscode.window.showQuickPick(commandItems, {
    placeHolder: `${group.name} — pick a command`,
    matchOnDescription: true,
    matchOnDetail: true,
  });

  if (!pickedCommand) {
    return undefined;
  }

  return {
    kind: 'command',
    group: pickedCommand.group,
    command: pickedCommand.command,
  };
}

/**
 * Tüm grupları tek listede toplar — grup seviyesine inmeden arama.
 * Etikette grup adı görünür, `matchOnDetail` ile shell metnine göre de filtrelenir.
 */
export async function pickAnyCommand(
  groups: readonly Group[]
): Promise<PickResult | undefined> {
  if (groups.length === 0) {
    void vscode.window.showWarningMessage(
      'cmddock: no command groups. Add one to the "cmddock.groups" setting.'
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
    placeHolder: 'Search all commands',
    matchOnDescription: true,
    matchOnDetail: true,
  });

  return picked ? { kind: 'command', group: picked.group, command: picked.command } : undefined;
}
