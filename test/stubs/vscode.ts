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
  constructor(public readonly value: string) {}
}

export enum StatusBarAlignment {
  Left = 1,
  Right = 2,
}

export class TaskPanelKind {
  static readonly Shared = 1;
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
  configuration.set(
    section,
    new Map(Object.entries(values))
  );
}

export function resetConfiguration(): void {
  configuration.clear();
}

export const workspace = {
  getConfiguration(section: string) {
    return {
      get<T>(key: string, defaultValue?: T): T | undefined {
        const value = configuration.get(section)?.get(key);
        return (value === undefined ? defaultValue : value) as T | undefined;
      },
    };
  },
  onDidChangeConfiguration(_listener: unknown) {
    return { dispose(): void {} };
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
};

export const tasks = {};