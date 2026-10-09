/**
 * Birim testlerinin `vscode` modülünü çalışma anında yüklemesini engeller.
 *
 * Saf modüller (normalize, args, tokens, transfer, style) vscode'u yalnızca tip
 * olarak kullanır; bu takma onlar için güvenlik ağıdır. `statusBar` gibi vscode'a
 * bağlı modüller ise aşağıdaki sahte API'yi kullanır, böylece gerçek VSCode
 * olmadan da test edilebilirler.
 *
 * Takma yalnızca statusBar.test.ts'nin ihtiyaç duyduğu yüzeyi içerir; eksik bir
 * üye ancak yeni bir modül test edilmeye çalışıldığında hataya yol açar.
 */

export class Memento {
  get<T>(_key: string, defaultValue?: T): T | undefined {
    return defaultValue;
  }

  update(_key: string, _value: unknown): Thenable<void> {
    return Promise.resolve();
  }

  keys(): readonly string[] {
    return [];
  }
}

/** workspaceState/globalState taklidi: gerçekten saklayıp geri verir. */
export class MemoryMemento extends Memento {
  private readonly data = new Map<string, unknown>();

  override get<T>(key: string, defaultValue?: T): T | undefined {
    return this.data.has(key) ? (this.data.get(key) as T) : defaultValue;
  }

  override update(key: string, value: unknown): Thenable<void> {
    this.data.set(key, value);
    return Promise.resolve();
  }

  override keys(): readonly string[] {
    return [...this.data.keys()];
  }
}

export class ThemeColor {
  constructor(public readonly id: string) {}
}

export class MarkdownString {
  /** VSCode'da varsayılan false: $(ikon) düz metin görünür. */
  supportThemeIcons = false;

  constructor(public readonly value: string) {}
}

export enum StatusBarAlignment {
  Left = 1,
  Right = 2,
}

export class TaskPanelKind {
  static readonly Shared = 1;
}

export enum TaskRevealKind {
  Always = 1,
  Silent = 2,
  Never = 3,
}

export class TaskScope {
  static readonly Global = 1;
  static readonly Workspace = 2;
}

/** VSCode'da Separator = -1, diğerleri 0. Değer farkı ayraç ayrımında önemli. */
export enum QuickPickItemKind {
  Separator = -1,
  Default = 0,
}

export interface CommandLike {
  readonly command: string;
  readonly title: string;
  readonly arguments?: unknown[];
}

export class StatusBarItem {
  text = '';
  tooltip: MarkdownString | string | undefined = undefined;
  color: string | ThemeColor | undefined = undefined;
  backgroundColor: string | ThemeColor | undefined = undefined;
  command: string | CommandLike | undefined = undefined;
  name: string | undefined = undefined;
  visible = false;
  disposed = false;

  constructor(
    readonly id: string,
    readonly alignment: StatusBarAlignment = StatusBarAlignment.Left,
    readonly priority = 0
  ) {}

  show(): void {
    this.visible = true;
  }

  hide(): void {
    this.visible = false;
  }

  dispose(): void {
    this.disposed = true;
  }
}

/** createStatusBarItem'in ürettiği her öğe burada sırayla toplanır. */
export const statusBarItems: StatusBarItem[] = [];

export function resetStatusBarItems(): void {
  statusBarItems.length = 0;
}

/** Bölüm → ayar değerleri. Test doğrudan bu nesneyi doldurur. */
const configuration = new Map<string, Map<string, unknown>>();

export function setConfiguration(section: string, values: Record<string, unknown>): void {
  configuration.set(section, new Map(Object.entries(values)));
}

export function resetConfiguration(): void {
  configuration.clear();
  writes.length = 0;
  quickPickQueue.length = 0;
  messageQueue.length = 0;
  fileDialogQueue.length = 0;
  messages.length = 0;
  openedDocuments.length = 0;
  quickPickCalls.length = 0;
  workspaceFolders = [];
  openDocuments.length = 0;
  executedTasks.length = 0;
  taskFailure.message = '';
  inputBoxQueue.length = 0;
  inputBoxCalls.length = 0;
}

/** getConfiguration().update() çağrıları — ne yazıldı, nereye. */
export interface ConfigWrite {
  readonly section: string;
  readonly key: string;
  readonly value: unknown;
  readonly target: ConfigurationTarget | undefined;
}
export const writes: ConfigWrite[] = [];

/* ------------------------------------------------------------------ *
 * URI ve ayar hedefleri
 * ------------------------------------------------------------------ */

export enum ConfigurationTarget {
  Global = 1,
  Workspace = 2,
  WorkspaceFolder = 3,
}

export interface UriLike {
  readonly scheme: string;
  readonly path: string;
  readonly fsPath: string;
}

export const Uri = {
  file(p: string): UriLike {
    return { scheme: 'file', path: p, fsPath: p };
  },
  joinPath(base: UriLike, ...segments: string[]): UriLike {
    const joined = [base.fsPath, ...segments].join('/');
    return { scheme: base.scheme, path: joined, fsPath: joined };
  },
};

/** VSCode'da workspaceFolders[i] bir { uri, name, index } nesnesidir. */
export interface WorkspaceFolderLike {
  readonly uri: UriLike;
  readonly name: string;
  readonly index: number;
}

let workspaceFolders: WorkspaceFolderLike[] = [];

export function setWorkspaceFolders(...paths: string[]): void {
  workspaceFolders = paths.map((p, index) => ({
    uri: Uri.file(p),
    name: p.split('/').pop() ?? p,
    index,
  }));
}

/* ------------------------------------------------------------------ *
 * Kullanıcı arayüzü — yanıtlar kuyruktan beslenir
 *
 * showQuickPick birden çok kez çağrılabilir (mod, sonra hedef) ve her çağrıda
 * testin farklı bir yanıt vermesi gerekir. Bu yüzden yanıtlar kuyruğa yazılır,
 * çağrı sırasıyla tüketilir; kuyruk boşsa kullanıcı vazgeçmiş sayılır.
 * ------------------------------------------------------------------ */

const quickPickQueue: unknown[] = [];
const messageQueue: unknown[] = [];
const fileDialogQueue: (UriLike | undefined)[] = [];

/** `vscode.workspace.textDocuments` — açık editör belgeleri. */
export const openDocuments: { uri: UriLike; isDirty: boolean }[] = [];

export function setOpenDocument(fsPath: string, isDirty: boolean): void {
  openDocuments.push({ uri: Uri.file(fsPath), isDirty });
}

export interface RecordedMessage {
  readonly kind: 'info' | 'warning' | 'error';
  readonly text: string;
}
export const messages: RecordedMessage[] = [];

export const openedDocuments: UriLike[] = [];

/** showQuickPick'e sunulan öğeler; "menüde ne vardı" sorusunu yanıtlamak için. */
export const quickPickCalls: { items?: unknown; options?: unknown }[] = [];

/** showQuickPick'in sırayla döndüreceği yanıtlar. */
export function queueQuickPick(...responses: unknown[]): void {
  quickPickQueue.push(...responses);
}

/** showWarningMessage'in sırayla döndüreceği yanıtlar (modal onayı için). */
export function queueMessage(...responses: unknown[]): void {
  messageQueue.push(...responses);
}

/** showOpenDialog'in sırayla döndüreceği dosyalar. */
export function queueOpenDialog(...responses: (UriLike | undefined)[]): void {
  fileDialogQueue.push(...responses);
}

/* ------------------------------------------------------------------ */

export const workspace = {
  get textDocuments() {
    return openDocuments;
  },

  get workspaceFolders() {
    return workspaceFolders.length > 0 ? workspaceFolders : undefined;
  },

  getConfiguration(section: string) {
    return {
      get<T>(key: string, defaultValue?: T): T | undefined {
        const value = configuration.get(section)?.get(key);
        return (value === undefined ? defaultValue : value) as T | undefined;
      },
      async update(key: string, value: unknown, target?: ConfigurationTarget): Promise<void> {
        writes.push({ section, key, value, target });
        // Yazılan değer hemen okunabilir olsun (gidiş-dönüş testleri için).
        const bucket = configuration.get(section) ?? new Map<string, unknown>();
        bucket.set(key, value);
        configuration.set(section, bucket);
      },
    };
  },

  onDidChangeConfiguration(_listener: unknown) {
    return { dispose(): void {} };
  },

  async openTextDocument(uri: UriLike) {
    openedDocuments.push(uri);
    return { uri };
  },
};

export const window = {
  createStatusBarItem(
    id: string,
    alignment?: StatusBarAlignment,
    priority?: number
  ): StatusBarItem {
    const item = new StatusBarItem(id, alignment, priority);
    statusBarItems.push(item);
    return item;
  },

  showQuickPick(items?: unknown, options?: unknown): Promise<unknown> {
    quickPickCalls.push({ items, options });
    return Promise.resolve(quickPickQueue.length > 0 ? quickPickQueue.shift() : undefined);
  },

  showInputBox(options?: {
    prompt?: string;
    placeHolder?: string;
    ignoreFocusOut?: boolean;
  }): Promise<string | undefined> {
    inputBoxCalls.push({ options });
    return Promise.resolve(inputBoxQueue.length > 0 ? inputBoxQueue.shift() : undefined);
  },

  showOpenDialog(_options?: unknown): Promise<(UriLike | undefined)[] | undefined> {
    const next = fileDialogQueue.length > 0 ? fileDialogQueue.shift() : undefined;
    return Promise.resolve(next ? [next] : undefined);
  },

  showInformationMessage(text: string, ..._items: string[]): Promise<unknown> {
    messages.push({ kind: 'info', text });
    return Promise.resolve(undefined);
  },

  showWarningMessage(text: string, ..._items: unknown[]): Promise<unknown> {
    messages.push({ kind: 'warning', text });
    return Promise.resolve(messageQueue.length > 0 ? messageQueue.shift() : undefined);
  },

  showErrorMessage(text: string, ..._items: string[]): Promise<unknown> {
    messages.push({ kind: 'error', text });
    return Promise.resolve(undefined);
  },

  async showTextDocument(document: { uri: UriLike }): Promise<void> {
    if (!openedDocuments.includes(document.uri)) {
      openedDocuments.push(document.uri);
    }
  },
};

/* ------------------------------------------------------------------ *
 * Görev çalıştırma (runner.ts)
 *
 * VSCode 1.141'de ShellExecution(command, args) overload'ı komutun kendisini
 * tırnaklıyor. Takma yalnızca tek dize overload'ını tutuyor ve çağrılan
 * satırı kaydediyor — hangi biçimin geçtiğini görebilmek için.
 * ------------------------------------------------------------------ */

export interface ShellExecutionOptions {
  cwd?: string;
}

export class ShellExecution {
  constructor(
    readonly commandLine: string,
    readonly options?: ShellExecutionOptions
  ) {}
}

export interface TaskPresentationOptions {
  reveal: TaskRevealKind;
  focus: boolean;
  panel: number;
  clear?: boolean;
}

export class Task {
  presentationOptions: TaskPresentationOptions | undefined = undefined;

  constructor(
    readonly definition: unknown,
    readonly scope: unknown,
    readonly name: string,
    readonly source: string,
    readonly execution: ShellExecution
  ) {}
}

/** executeTask'e giden görevler, sırayla. */
export const executedTasks: Task[] = [];

/** true ise executeTask hata fırlatır — runner'ın hata yolunu sınamak için. */
export const taskFailure = { message: '' };

export function failNextTask(message: string): void {
  taskFailure.message = message;
}

export const tasks = {
  async executeTask(task: Task): Promise<Task> {
    if (taskFailure.message) {
      const message = taskFailure.message;
      taskFailure.message = '';
      throw new Error(message);
    }
    executedTasks.push(task);
    return task;
  },
};

/** showInputBox'in sırayla döndüreceği yanıtlar (undefined = kullanıcı Esc). */
export const inputBoxQueue: (string | undefined)[] = [];
export const inputBoxCalls: { options?: { prompt?: string; placeHolder?: string } }[] = [];

export function queueInputBox(...responses: (string | undefined)[]): void {
  inputBoxQueue.push(...responses);
}
