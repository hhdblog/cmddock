import * as vscode from 'vscode';
import { ICON_CATALOG } from './icons';

interface CatalogItem extends vscode.QuickPickItem {
  readonly iconName?: string;
}

/**
 * Kodikon kataloğu. Her satırda ikon canlı çizilir; seçilen ad panoya kopyalanır.
 * VSCode ikonları listeleme API'si sunmadığı için liste `icons.ts` içinde elle tutuluyor.
 */
export async function showIconCatalog(): Promise<void> {
  const items: CatalogItem[] = ICON_CATALOG.flatMap((group) => [
    { label: group.title, kind: vscode.QuickPickItemKind.Separator },
    ...group.entries.map(
      (entry): CatalogItem => ({
        label: `$(${entry.name}) ${entry.name}`,
        description: entry.hint,
        iconName: entry.name,
      })
    ),
  ]);

  const picked = await vscode.window.showQuickPick(items, {
    placeHolder: 'Pick an icon — its name is copied to the clipboard',
    matchOnDescription: true,
  });

  if (!picked?.iconName) {
    return;
  }

  await vscode.env.clipboard.writeText(picked.iconName);
  void vscode.window.showInformationMessage(
    `cmdkit: copied "${picked.iconName}" — ` +
      'Write it into cmdkit.statusBar.icon or the icon field of a group or command.'
  );
}