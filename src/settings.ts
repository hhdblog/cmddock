import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { CONFIG_SECTION, GROUPS_KEY, getGroups, readRawGroups } from './config';
import { countCommands } from './normalize';
import { hiddenGroupNames, visibleGroupNames } from './plan';
import {
  ImportMode,
  parseGroups,
  planImport,
  serializeGroups,
  serializeJson,
} from './transfer';

const WRITE_LABEL = 'Yaz';

const DEFAULT_FILE_NAME = 'cmd-deck-groups.json';

/**
 * Düzenleme dosyasının yolu. Proje bazlı tutuluyor (workspaceState) çünkü dosya
 * genelde proje kökünde; globalState'de tutulsaydı başka projeye de taşınırdı.
 */
const FILE_PATH_KEY = 'cmdDeck.groupFilePath';

async function recallPath(context: vscode.ExtensionContext): Promise<string | undefined> {
  const value = context.workspaceState.get<string>(FILE_PATH_KEY);
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

async function rememberPath(
  context: vscode.ExtensionContext,
  target: string
): Promise<void> {
  await context.workspaceState.update(FILE_PATH_KEY, target);
}

async function exists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function writeFile(target: string, text: string): Promise<boolean> {
  try {
    await fs.writeFile(target, text, 'utf8');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    void vscode.window.showErrorMessage(`cmd-deck: dosyaya yazılamadı — ${message}`);
    return false;
  }
}

async function openFile(target: string): Promise<void> {
  const document = await vscode.workspace.openTextDocument(vscode.Uri.file(target));
  await vscode.window.showTextDocument(document);
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

function defaultFilePath(): string {
  const folder = vscode.workspace.workspaceFolders?.[0]?.uri;
  const base = folder?.scheme === 'file' ? folder : vscode.Uri.file(os.homedir());
  return vscode.Uri.joinPath(base, DEFAULT_FILE_NAME).fsPath;
}

/**
 * Kaydedilecek ham liste.
 *
 * Ham ayar değeri tercih edilir: `getGroups()` her komuta varsayılan alanları
 * doldurur, elle düzenlenen dosyada ise o alanlar çoğunlukla yoktur. Ham değer
 * geçerli değilse (ayar boş, sadece manifest varsayılanı) normalize edilmiş
 * hâle düşülür ki dosya hiçbir zaman boş yazılmasın.
 */
function exportPayload(): string {
  const raw = readRawGroups();
  return Array.isArray(raw) && raw.length > 0 ? serializeJson(raw) : serializeGroups(getGroups());
}

/**
 * Komut listesinin düzenlendiği dosyayı açar; dosya yoksa mevcut ayarlardan yazar.
 *
 * Soru sormaz. Dosya varsa **üzerine yazılmaz** — kullanıcının kaydedilmemiş
 * düzenlemesi bozulur. Üzerine yazmak isteyen için ayrı bir komut var
 * (`cmd-deck.reload`).
 */
export async function editGroupFile(context: vscode.ExtensionContext): Promise<void> {
  if (getGroups().length === 0) {
    void vscode.window.showWarningMessage('cmd-deck: düzenlenecek komut yok.');
    return;
  }

  const target = (await recallPath(context)) ?? defaultFilePath();

  if (!(await exists(target))) {
    if (!(await writeFile(target, exportPayload()))) {
      return;
    }
    await rememberPath(context, target);
  }

  await openFile(target);
}

/** Düzenleme dosyasını ayarlardaki güncel liste ile üzerine yazar. */
export async function reloadGroupFile(context: vscode.ExtensionContext): Promise<void> {
  const target = await recallPath(context);

  if (!target) {
    void vscode.window.showInformationMessage(
      'cmd-deck: önce "Komut Listesini Düzenle" ile dosyayı oluştur.'
    );
    return;
  }

  const groups = getGroups();
  if (groups.length === 0) {
    void vscode.window.showWarningMessage('cmd-deck: ayarlarda komut yok.');
    return;
  }

  if (!(await writeFile(target, serializeGroups(groups)))) {
    return;
  }

  await rememberPath(context, target);
  await openFile(target);

  void vscode.window.showInformationMessage(
    `cmd-deck: ${path.basename(target)} ayarlardaki listeyle yenilendi.`
  );
}

/** Dosyada olmayan tek yol: başka birinin gönderdiği listeyi almak isteyenler. */
async function pickFile(): Promise<string | undefined> {
  const files = await vscode.window.showOpenDialog({
    canSelectMany: false,
    filters: { JSON: ['json'] },
    openLabel: 'Aktar',
  });

  return files?.[0]?.fsPath;
}

export async function applyGroupFile(context: vscode.ExtensionContext): Promise<void> {
  const source = (await recallPath(context)) ?? (await pickFile());
  if (!source) {
    return;
  }

  let text: string;
  try {
    text = await fs.readFile(source, 'utf8');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    void vscode.window.showErrorMessage(`cmd-deck: dosya okunamadı — ${message}`);
    return;
  }

  const incoming = parseGroups(text);
  if (!incoming) {
    void vscode.window.showErrorMessage(
      'cmd-deck: içerik okunamadı. Beklenen biçim cmd-deck-groups.json dosyasındaki komut dizisi.'
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
    void vscode.window.showErrorMessage('cmd-deck: uygulanacak geçerli grup kalmadı.');
    return;
  }

  // Özet normalize edilmiş alanları karşılaştırdığı için, gerçekten hiçbir şey
  // değişmiyorsa ayarlar dosyasını yeniden biçimlendirmenin anlamı yok.
  if (serializeGroups(current) === serializeGroups(plan.result)) {
    void vscode.window.showInformationMessage(
      'cmd-deck: dosyadaki liste ayarlarla aynı, hiçbir şey yazılmadı.'
    );
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

  const destination = await pickTarget();
  if (!destination) {
    return;
  }

  await vscode.workspace
    .getConfiguration(CONFIG_SECTION)
    .update(GROUPS_KEY, plan.result, destination);

  // Dosya hatırlansın: düzenlemeye döndüğünde aynı dosya açılsın.
  await rememberPath(context, source);

  void vscode.window.showInformationMessage(
    `cmd-deck: ${plan.result.length} grup, ${countCommands(plan.result)} komut ` +
      `${targetName(destination)} yazıldı.`
  );
}

interface StatusBarItemPick extends vscode.QuickPickItem {
  readonly isMaster?: boolean;
  readonly groupName?: string;
}

/**
 * Durum çubuğunda hangi düğmelerin görüneceğini seçtirir.
 *
 * VSCode'un kendi "Hide Status Bar Items" menüsü yalnızca **ekranda çizilen**
 * öğeleri listelediği için, bizim gizli başlattığımız gruplar orada görünmüyor.
 * Bu yüzden seçim kendi arayüzümüzde yapılıyor ve `hiddenGroups` + sınır ayarına yazılıyor.
 */
export async function pickStatusBarItems(): Promise<void> {
  const groups = getGroups();

  if (groups.length === 0) {
    void vscode.window.showWarningMessage('cmd-deck: komut grubu yok.');
    return;
  }

  const config = vscode.workspace.getConfiguration('cmdDeck.statusBar');
  const masterVisible = config.get<boolean>('showMaster') !== false;
  const hidden = config.get<unknown>('hiddenGroups');
  const hiddenGroups = Array.isArray(hidden)
    ? hidden.filter((item): item is string => typeof item === 'string')
    : [];

  const visible = new Set(
    visibleGroupNames(groups, { hiddenGroups, maxGroupItems: config.get('maxGroupItems') })
  );

  const items: StatusBarItemPick[] = [
    {
      label: '$(terminal) Cmd — tüm gruplardan seç',
      description: 'her zaman açık kalsın',
      picked: masterVisible,
      isMaster: true,
    },
    ...groups.map((group) => ({
      label: `${group.icon} ${group.name}`,
      description: `${group.commands.length} komut`,
      picked: visible.has(group.name),
      groupName: group.name,
    })),
  ];

  const picked = await vscode.window.showQuickPick(items, {
    canPickMany: true,
    title: 'Durum çubuğunda görünecek düğmeler',
    placeHolder: 'İşaretli olanlar görünür',
  });

  if (!picked) {
    return;
  }

  const selectedGroups = picked
    .map((item) => item.groupName)
    .filter((name): name is string => typeof name === 'string');

  const newHidden = hiddenGroupNames(groups, selectedGroups);

  // Sınırı kaldırıyoruz: artık kullanıcının seçimi geçerli olsun, yoksa
  // "5 grup seçtim" deyip ilk 3'ü gizli kalmaya devam ederdi.
  await config.update('maxGroupItems', 0, vscode.ConfigurationTarget.Global);
  await config.update('hiddenGroups', newHidden, vscode.ConfigurationTarget.Global);
  await config.update(
    'showMaster',
    picked.some((item) => item.isMaster),
    vscode.ConfigurationTarget.Global
  );

  void vscode.window.showInformationMessage(
    `cmd-deck: durum çubuğunda ${picked.length} düğme açık ` +
      `(${newHidden.length} grup gizlendi) — kullanıcı ayarlarına yazıldı.`
  );
}
