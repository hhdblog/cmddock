export interface DeckCommand {
  readonly name: string;
  readonly command: string;
  readonly description: string;
  readonly icon: string;
  readonly confirm: string | false;
  readonly argsPrompt?: string;
  readonly clear: boolean;
}

export interface DeckGroup {
  readonly name: string;
  readonly icon: string;
  readonly commands: readonly DeckCommand[];
}

export interface PickedCommand {
  readonly group: DeckGroup;
  readonly command: DeckCommand;
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
export function normalizeCommand(raw: unknown): DeckCommand | undefined {
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
    confirm = `'${command}' çalıştırılsın mı?`;
  }

  const argsPrompt = text(r.argsPrompt) || undefined;

  return {
    name,
    command,
    description: text(r.description),
    icon: text(r.icon, DEFAULT_ICON),
    confirm,
    argsPrompt,
    clear: r.clear === true,
  };
}

export function normalizeGroup(raw: unknown): DeckGroup | undefined {
  const r = record(raw);
  if (!r) {
    return undefined;
  }

  const name = text(r.name);
  const rawCommands = Array.isArray(r.commands) ? r.commands : [];
  const commands = rawCommands
    .map(normalizeCommand)
    .filter((c): c is DeckCommand => c !== undefined);

  if (!name || commands.length === 0) {
    return undefined;
  }

  return { name, icon: text(r.icon, DEFAULT_ICON), commands };
}

export function normalizeGroups(raw: unknown): DeckGroup[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map(normalizeGroup)
    .filter((g): g is DeckGroup => g !== undefined);
}

export function countCommands(groups: readonly DeckGroup[]): number {
  return groups.reduce((total, group) => total + group.commands.length, 0);
}
