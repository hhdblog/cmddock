import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { CONFIG_SECTION, GROUPS_KEY, getGroups, readRawGroups } from './config';
import { countCommands, Group, normalizeGroups } from './normalize';
import { LIBRARY_GROUPS, LibraryGroup } from './library';
import { hiddenGroupNames, visibleGroupNames } from './plan';
import {
  ImportMode,
  parseFailureReason,
  parseGroups,
  planImport,
  serializeGroups,
  serializeJson,
  slimGroups,
} from './transfer';

const WRITE_LABEL = 'Yaz';

const DEFAULT_FILE_NAME = 'cmddock-groups.json';

/**
 * Düzenleme dosyasının yolu. Proje bazlı tutuluyor (workspaceState) çünkü dosya
 * genelde proje kökünde; globalState'de tutulsaydı başka projeye de taşınırdı.
 */
const FILE_PATH_KEY = 'cmddock.groupFilePath';

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
    // Varsayılan yer .vscode/ altında; proje o klasörü içermeyebilir.
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, text, 'utf8');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    void vscode.window.showErrorMessage(`cmddock: could not write the file — ${message}`);
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
        label: '$(git-merge) Merge groups',
        description: 'same-named commands are updated, new commands are added',
        detail: 'Gelen listede olmayan komutlar silinmez.',
        mode: 'merge' as const,
      },
      {
        label: '$(replace) Replace list',
        description: `All ${commandCount} current commands are replaced by the incoming list`,
        detail: 'Commands missing from the incoming list are DELETED.',
        mode: 'replace' as const,
      },
    ],
    { placeHolder: 'How should it be applied?' }
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
        label: 'User',
        description: 'valid for every project (global settings.json)',
        target: vscode.ConfigurationTarget.Global,
      },
    ],
    { placeHolder: 'Where should it be written?' }
  );

  return picked?.target;
}

function targetName(target: vscode.ConfigurationTarget): string {
  return target === vscode.ConfigurationTarget.Workspace ? 'this project' : 'user settings';
}

/**
 * Düzenleme dosyasının varsayılan yeri.
 *
 * `.vscode/` altı seçildi çünkü dosyanın uygulandığı yer de orası: kaynak ve
 * hedef aynı klasörde durunca ikisi aynı commit'te yaşar ve "ekipte nasıl
 * paylaşıyorum" sorusu tek yere düşer. Depo kökü izlenmeyen dosya bırakıyordu.
 *
 * `cmddock.groupFile` ile monorepo gibi durumlarda alt pakete yönlendirilebilir;
 * göreli yollar ilk çalışma alanı köküne göre çözülür.
 */
function defaultFilePath(): string {
  const folder = vscode.workspace.workspaceFolders?.[0]?.uri;
  const base = folder?.scheme === 'file' ? folder : vscode.Uri.file(os.homedir());
  const root = base.fsPath;

  const configured = vscode.workspace
    .getConfiguration(CONFIG_SECTION)
    .get<string>('groupFile');

  if (typeof configured === 'string' && configured.trim().length > 0) {
    const value = configured.trim();
    return path.isAbsolute(value) ? value : path.join(root, value);
  }

  // Klasör açılmadıysa ev dizinine düşüyoruz; orada .vscode/ kurmak tuhaf olurdu.
  return folder?.scheme === 'file'
    ? path.join(root, '.vscode', DEFAULT_FILE_NAME)
    : path.join(root, DEFAULT_FILE_NAME);
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
  return Array.isArray(raw) && raw.length > 0
    ? serializeJson(raw)
    : serializeJson(slimGroups(getGroups()));
}

/**
 * Komut listesinin düzenlendiği dosyayı açar; dosya yoksa mevcut ayarlardan yazar.
 *
 * Soru sormaz. Dosya varsa **üzerine yazılmaz** — kullanıcının kaydedilmemiş
 * düzenlemesi bozulur. Üzerine yazmak isteyen için ayrı bir komut var
 * (`cmddock.reload`).
 */
export async function editGroupFile(context: vscode.ExtensionContext): Promise<void> {
  if (getGroups().length === 0) {
    void vscode.window.showWarningMessage('cmddock: there is no command to edit.');
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
      'cmddock: create the file first with "CmdDock: Edit Command List".'
    );
    return;
  }

  const groups = getGroups();
  if (groups.length === 0) {
    void vscode.window.showWarningMessage('cmddock: ayarlarda komut yok.');
    return;
  }

  // Dosya elle düzenlendiği için normalize dolguları yazılmaz; aynı ayıklama
  // ayarlara yazarken de geçerli.
  if (!(await writeFile(target, serializeJson(slimGroups(groups))))) {
    return;
  }

  await rememberPath(context, target);
  await openFile(target);

  void vscode.window.showInformationMessage(
    `cmddock: ${path.basename(target)} ayarlardaki listeyle yenilendi.`
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
    void vscode.window.showErrorMessage(`cmddock: could not read the file — ${message}`);
    return;
  }

  const incoming = parseGroups(text);
  if (!incoming) {
    void vscode.window.showErrorMessage(
      `cmddock: could not read the content — ${parseFailureReason(text) ?? 'unexpected format.'}`
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
    void vscode.window.showErrorMessage('cmddock: no valid group left to apply.');
    return;
  }

  // Özet normalize edilmiş alanları karşılaştırdığı için, gerçekten hiçbir şey
  // değişmiyorsa ayarlar dosyasını yeniden biçimlendirmenin anlamı yok.
  if (serializeGroups(current) === serializeGroups(plan.result)) {
    void vscode.window.showInformationMessage(
      'cmddock: the file already matches your settings, nothing was written.'
    );
    return;
  }

  const body = [
    `${countCommands(plan.result)} commands will be written:`,
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
    // Normalize dolguları ayıklanır: ayarlar okunurken zaten geri doluyor,
    // ama dosyada `confirm: false` gibi alanlar gürültüden başka bir işe yaramıyor.
    .update(GROUPS_KEY, slimGroups(plan.result), destination);

  // Dosya hatırlansın: düzenlemeye döndüğünde aynı dosya açılsın.
  await rememberPath(context, source);

  void vscode.window.showInformationMessage(
    `cmddock: ${plan.result.length} groups, ${countCommands(plan.result)} commands ` +
      `written to ${targetName(destination)}.`
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
    void vscode.window.showWarningMessage('cmddock: komut grubu yok.');
    return;
  }

  const config = vscode.workspace.getConfiguration('cmddock.statusBar');
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
      label: '$(terminal) Cmd — pick from every group',
      description: 'always visible',
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
    title: 'Status bar items to show',
    placeHolder: 'The ticked ones are shown',
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
    `cmddock: ${picked.length} status bar items shown ` +
      `(${newHidden.length} groups hidden) — written to user settings.`
  );
}

/* ------------------------------------------------------------------ *
 * Hazır grup kütüphanesi
 * ------------------------------------------------------------------ */

interface LibraryPick extends vscode.QuickPickItem {
  readonly group: LibraryGroup;
}

/**
 * Düzenleme dosyasının ayarlarla aynı olduğunu doğrular.
 *
 * Adding a group from the library left the file behind; with a stale file,
 * `Apply Command File` → `Replace list` also silently dropped the new group
 * because it was not in the file. Senkronlamak bu sorunu bitiriyor, ama dosyada
 * kullanıcının **uygulanmamış** düzenlemesi varsa onu ezmek de veri kaybı.
 * O yüzden üç durumu ayırt ediyoruz: dosya yok (senkronlanacak şey yok),
 * dosyada kaydedilmemiş düzenleme var, dosyanın içeriği ayarlardan farklı.
 */
async function isFileInSync(target: string): Promise<boolean> {
  const open = vscode.workspace.textDocuments.find(
    (document) => document.uri.fsPath === target
  );
  if (open?.isDirty) {
    return false;
  }

  let text: string;
  try {
    text = await fs.readFile(target, 'utf8');
  } catch {
    return true;
  }

  const fromFile = parseGroups(text);
  if (!fromFile) {
    return false;
  }

  return serializeGroups(fromFile) === serializeGroups(getGroups());
}

/**
 * Kütüphaneden grup ekler.
 *
 * Yalnızca ekler, silmez: mevcut komutlara dokunmaz. Ad çakışması olamaz —
 * zaten ekli olan gruplar listede hiç gösterilmez. Silme zaten
 * `Apply Command File` → `Replace list` route.
 */
export async function addLibraryGroup(context: vscode.ExtensionContext): Promise<void> {
  const existing = new Set(getGroups().map((group) => group.name));
  const available = LIBRARY_GROUPS.filter((group) => !existing.has(group.name));

  if (available.length === 0) {
    void vscode.window.showInformationMessage(
      `cmddock: all ${LIBRARY_GROUPS.length} library groups are already added.`
    );
    return;
  }

  const picked = (await vscode.window.showQuickPick(
    available.map(
      (group): LibraryPick => ({
        label: `${group.icon} ${group.name}`,
        description: group.summary,
        detail: `${group.commands.length} komut`,
        group,
      })
    ),
    { placeHolder: 'Pick the built-in group to add', matchOnDescription: true }
  )) as LibraryPick | undefined;

  if (!picked) {
    return;
  }

  const destination = await pickTarget();
  if (!destination) {
    return;
  }

  const chosen = picked.group;
  const current = getGroups();
  // Kütüphane girdisi cmddock.groups ile aynı şema; normalizeGroups alan
  // eşlemesinin tamamını yapıyor, elle yazmaya gerek yok.
  const incoming = normalizeGroups([
    {
      name: chosen.name,
      icon: chosen.icon,
      color: chosen.color,
      commands: chosen.commands,
    },
  ]);

  const total = countCommands(current);
  const added = countCommands(incoming);

  const confirmation = await vscode.window.showWarningMessage(
    `"${chosen.name}" will be added: ${added} commands (total ${total} → ${total + added}), ` +
      `written to ${targetName(destination)}.`,
    { modal: true },
    WRITE_LABEL
  );

  if (confirmation !== WRITE_LABEL) {
    return;
  }

  // Karar yazmadan ÖNCE veriliyor; yazdıktan sonra sorulursa dosya "farklı"
  // görünür ve senkron hiç olmazdı.
  const plan = await planFileSync(context);

  await vscode.workspace
    .getConfiguration(CONFIG_SECTION)
    .update(GROUPS_KEY, slimGroups([...current, ...incoming]), destination);

  await applyFileSync(
    plan,
    'cmddock: the editing file differs from your settings (unsaved, or ' +
      'there are unapplied changes) — the file was left alone. The new group is not in the file; ' +
      ' Add it with "CmdDock: Edit Command List".'
  );

  void vscode.window.showInformationMessage(
    `cmddock: "${chosen.name}" eklendi — ${added} komut, ${targetName(destination)}.`
  );
}

/**
 * Ayar yazıldıktan sonra düzenleme dosyasına ne olacağının planı.
 *
 * Karar **yazmadan önce** verilmeli: yazdıktan sonra sorulursa ayarlar
 * değişmiş olduğu için dosya "farklı" görünür ve senkron hiç gerçekleşmez.
 */
interface FileSyncPlan {
  readonly target?: string;
  /** Dosya ayarlarla aynı mı; false ise dokunulmayacak. */
  readonly inSync: boolean;
}

async function planFileSync(context: vscode.ExtensionContext): Promise<FileSyncPlan> {
  const target = await recallPath(context);
  if (!target || !(await exists(target))) {
    return { inSync: true };
  }
  return { target, inSync: await isFileInSync(target) };
}

/**
 * Planı uygular. Senkronlanamıyorsa `skipped` uyarısını gösterir — çağıran
 * ne yapılması gerektiğini bilmeli.
 */
async function applyFileSync(plan: FileSyncPlan, skipped: string): Promise<boolean> {
  if (!plan.target) {
    return true;
  }

  if (!plan.inSync) {
    void vscode.window.showWarningMessage(skipped);
    return false;
  }

  await writeFile(plan.target, serializeJson(slimGroups(getGroups())));
  return true;
}

interface GroupPick extends vscode.QuickPickItem {
  readonly group: Group;
}

/**
 * Bir grubu hedefli siler.
 *
 * Alternatifi dosyadan elle silip "Listeyi değiştir" uygulamak; o yol tüm
 * listeyi gelen dosyayla değiştirdiği için dosya bayattaysa (ör. kütüphaneden
 * eklenmiş ama dosyaya geçmemiş grup) istemediğin gruplar da gidiyordu.
 * Burada yalnızca seçilen grubu çıkarıyoruz.
 */
export async function removeGroup(context: vscode.ExtensionContext): Promise<void> {
  const current = getGroups();

  if (current.length === 0) {
    void vscode.window.showWarningMessage('cmddock: silinecek grup yok.');
    return;
  }

  const picked = (await vscode.window.showQuickPick(
    current.map(
      (group): GroupPick => ({
        label: `${group.icon} ${group.name}`,
        description: `${group.commands.length} komut`,
        group,
      })
    ),
    { placeHolder: 'Pick the group to remove', matchOnDescription: true }
  )) as GroupPick | undefined;

  if (!picked) {
    return;
  }

  const doomed = picked.group;
  const remaining = current.filter((group) => group.name !== doomed.name);

  // Hedef sorusu boşa gitmesin diye bu kontrol ondan önce: sorup reddetmek
  // kullanıcıya anlamsız bir adım attırıyor.
  if (remaining.length === 0) {
    void vscode.window.showWarningMessage(
      'cmddock: cannot remove the only group — nothing would be left to run. ' +
        'Add another group with "Add Built-in Group" first.'
    );
    return;
  }

  const destination = await pickTarget();
  if (!destination) {
    return;
  }

  const confirmation = await vscode.window.showWarningMessage(
    `The group "${doomed.name}" will be deleted: ${doomed.commands.length} commands, its icon and colour go too. ` +
      `Written to ${targetName(destination)}. This cannot be undone.`,
    { modal: true },
    WRITE_LABEL
  );

  if (confirmation !== WRITE_LABEL) {
    return;
  }

  const plan = await planFileSync(context);

  await vscode.workspace
    .getConfiguration(CONFIG_SECTION)
    .update(GROUPS_KEY, slimGroups(remaining), destination);

  const synced = await applyFileSync(
    plan,
    `cmddock: "${doomed.name}" was removed from your settings but is still in the editing file. ` +
      'If you do not delete it from the file either it comes back at the "Apply Command File" step.'
  );

  void vscode.window.showInformationMessage(
    `cmddock: "${doomed.name}" silindi — ${doomed.commands.length} komut, ` +
      `${targetName(destination)}.` +
      (synced ? '' : ' The editing file was not updated.')
  );
}
