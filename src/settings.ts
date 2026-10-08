import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { CONFIG_SECTION, GROUPS_KEY, getGroups } from './config';
import { countCommands } from './normalize';
import {
  ImportMode,
  parseGroups,
  planImport,
  serializeGroups,
} from './transfer';

const WRITE_LABEL = 'Yaz';

type Source = 'clipboard' | 'file' | undefined;

async function pickSource(): Promise<Source> {
  const picked = await vscode.window.showQuickPick(
    [
      {
        label: '$(json) Panodan oku',
        description: 'Panoya kopyaladığın JSON',
      },
      {
        label: '$(file-directory) Dosyadan seç',
        description: '*.json dosyası seç',
      },
    ],
    { placeHolder: 'Nereden içe aktarılacak?' }
  );

  if (!picked) {
    return undefined;
  }
  return picked.label.includes('Dosyadan') ? 'file' : 'clipboard';
}

async function readSource(source: Exclude<Source, undefined>): Promise<string | undefined> {
  if (source === 'clipboard') {
    const text = await vscode.env.clipboard.readText();
    if (text.trim().length === 0) {
      void vscode.window.showWarningMessage('cmd-deck: pano boş.');
      return undefined;
    }
    return text;
  }

  const files = await vscode.window.showOpenDialog({
    canSelectMany: false,
    filters: { JSON: ['json'] },
    openLabel: 'Aktar',
  });

  const file = files?.[0];
  if (!file) {
    return undefined;
  }

  try {
    return await fs.readFile(file.fsPath, 'utf8');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    void vscode.window.showErrorMessage(`cmd-deck: dosya okunamadı — ${message}`);
    return undefined;
  }
}

async function pickMode(commandCount: number): Promise<ImportMode | undefined> {
  const picked = await vscode.window.showQuickPick(
    [
      {
        label: '$(git-merge) Grupları birleştir',
        description: 'Aynı isimli komutlar güncellenir, yeni komutlar eklenir',
        detail: 'Gelen listede olmayan komutlar silinmez.',
        mode: 'merge' as const,
      },
      {
        label: '$(replace) Listeyi değiştir',
        description: `Mevcut ${commandCount} komutun tamamı gelen listeyle değiştirilir`,
        detail: 'Gelen listede olmayan komutlar SİLİNİR.',
        mode: 'replace' as const,
      },
    ],
    { placeHolder: 'Nasıl uygulansın?' }
  );

  return picked?.mode;
}

async function pickTarget(): Promise<vscode.ConfigurationTarget | undefined> {
  const hasWorkspace = (vscode.workspace.workspaceFolders?.length ?? 0) > 0;

  if (!hasWorkspace) {
    return vscode.ConfigurationTarget.Global;
  }

  const picked = await vscode.window.showQuickPick(
    [
      {
        label: 'Bu proje',
        description: '.vscode/settings.json',
        target: vscode.ConfigurationTarget.Workspace,
      },
      {
        label: 'Kullanıcı',
        description: 'tüm projeler için geçerli (global settings.json)',
        target: vscode.ConfigurationTarget.Global,
      },
    ],
    { placeHolder: 'Nereye yazılsın?' }
  );

  return picked?.target;
}

function targetName(target: vscode.ConfigurationTarget): string {
  return target === vscode.ConfigurationTarget.Workspace ? 'bu proje' : 'kullanıcı ayarları';
}

const DEFAULT_FILE_NAME = 'cmd-deck-groups.json';

function defaultSaveUri(): vscode.Uri {
  const folder = vscode.workspace.workspaceFolders?.[0]?.uri;
  const base = folder?.scheme === 'file' ? folder : vscode.Uri.file(os.homedir());
  return vscode.Uri.joinPath(base, DEFAULT_FILE_NAME);
}

async function saveToFile(text: string, commandCount: number): Promise<void> {
  const uri = await vscode.window.showSaveDialog({
    defaultUri: defaultSaveUri(),
    filters: { JSON: ['json'] },
    saveLabel: 'Kaydet',
    title: 'Komut listesini kaydet',
  });

  if (!uri) {
    return;
  }

  try {
    await fs.writeFile(uri.fsPath, text, 'utf8');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    void vscode.window.showErrorMessage(`cmd-deck: dosyaya yazılamadı — ${message}`);
    return;
  }

  const open = await vscode.window.showInformationMessage(
    `cmd-deck: ${commandCount} komut kaydedildi — ${path.basename(uri.fsPath)}`,
    'Aç'
  );

  if (open === 'Aç') {
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document);
  }
}

export async function exportCommands(): Promise<void> {
  const groups = getGroups();

  if (groups.length === 0) {
    void vscode.window.showWarningMessage('cmd-deck: aktarılacak komut yok.');
    return;
  }

  const text = serializeGroups(groups);
  const total = countCommands(groups);

  const how = await vscode.window.showQuickPick(
    [
      {
        label: 'Panoya kopyala',
        description: 'settings.json içindeki "cmdDeck.groups" değerine yapıştırılabilir',
        toFile: false,
      },
      {
        label: 'Dosyaya kaydet',
        description: 'daha sonra içe aktarmak için (varsayılan: cmd-deck-groups.json)',
        toFile: true,
      },
    ],
    { placeHolder: 'Nasıl dışa aktarılsın?' }
  );

  if (!how) {
    return;
  }

  if (how.toFile) {
    await saveToFile(text, total);
    return;
  }

  await vscode.env.clipboard.writeText(text);

  void vscode.window.showInformationMessage(
    `cmd-deck: ${groups.length} grup, ${total} komut panoya kopyalandı.`
  );
}

export async function importCommands(): Promise<void> {
  const source = await pickSource();
  if (!source) {
    return;
  }

  const text = await readSource(source);
  if (text === undefined) {
    return;
  }

  const incoming = parseGroups(text);
  if (!incoming) {
    void vscode.window.showErrorMessage(
      'cmd-deck: içerik okunamadı. Beklenen biçim "cmdDeck.groups" değerindeki JSON dizisi.'
    );
    return;
  }

  const current = getGroups();
  const mode = await pickMode(countCommands(current));
  if (!mode) {
    return;
  }

  const plan = planImport(current, incoming, mode);
  if (plan.result.length === 0) {
    void vscode.window.showErrorMessage('cmd-deck: içe aktarılacak geçerli grup kalmadı.');
    return;
  }

  const body = [
    `${countCommands(plan.result)} komut yazılacak:`,
    ...plan.summary,
  ].join('\n');

  const confirmation = await vscode.window.showWarningMessage(
    body,
    { modal: true },
    WRITE_LABEL
  );
  if (confirmation !== WRITE_LABEL) {
    return;
  }

  const target = await pickTarget();
  if (!target) {
    return;
  }

  await vscode.workspace
    .getConfiguration(CONFIG_SECTION)
    .update(GROUPS_KEY, plan.result, target);

  void vscode.window.showInformationMessage(
    `cmd-deck: ${plan.result.length} grup, ${countCommands(plan.result)} komut ` +
      `${targetName(target)} yazıldı.`
  );
}