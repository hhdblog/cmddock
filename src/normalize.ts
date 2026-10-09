import { parseIcon } from './style';

export interface Command {
  readonly name: string;
  readonly command: string;
  readonly description: string;
  readonly icon: string;
  readonly confirm: string | false;
  readonly argsPrompt?: string;
  /** true ise argsPrompt girdisi bölünmez, tek argüman olarak geçer. */
  readonly argsSingle?: boolean;
  readonly clear: boolean;
}

export interface Group {
  readonly name: string;
  readonly icon: string;
  /** Durum çubuğundaki bu grup düğmesinin ön plan rengi (hex veya tema rengi adı). */
  readonly color?: string;
  readonly commands: readonly Command[];
}

export const DEFAULT_ICON = '$(terminal)';

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function record(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

/** Geçersiz komut (isim veya komut metni eksik) atlanır, hata fırlatılmaz. */
export function normalizeCommand(raw: unknown): Command | undefined {
  const r = record(raw);
  if (!r) {
    return undefined;
  }

  const name = text(r.name);
  const command = text(r.command);
  if (!name || !command) {
    return undefined;
  }

  let confirm: string | false = false;
  if (typeof r.confirm === 'string' && r.confirm.length > 0) {
    confirm = r.confirm;
  } else if (r.confirm === true) {
    confirm = `'${command}' to run?`;
  }

  const argsPrompt = text(r.argsPrompt) || undefined;

  return {
    name,
    command,
    description: text(r.description),
    icon: parseIcon(r.icon),
    confirm,
    argsPrompt,
    argsSingle: r.argsSingle === true ? true : undefined,
    clear: r.clear === true,
  };
}

export function normalizeGroup(raw: unknown): Group | undefined {
  const r = record(raw);
  if (!r) {
    return undefined;
  }

  const name = text(r.name);
  const rawCommands = Array.isArray(r.commands) ? r.commands : [];
  const commands = rawCommands
    .map(normalizeCommand)
    .filter((c): c is Command => c !== undefined);

  if (!name || commands.length === 0) {
    return undefined;
  }

  return { name, icon: parseIcon(r.icon), color: text(r.color).trim() || undefined, commands };
}

export function normalizeGroups(raw: unknown): Group[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map(normalizeGroup)
    .filter((g): g is Group => g !== undefined);
}

export function countCommands(groups: readonly Group[]): number {
  return groups.reduce((total, group) => total + group.commands.length, 0);
}
