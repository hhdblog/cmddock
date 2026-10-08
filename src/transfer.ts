import { DeckCommand, DeckGroup, countCommands, normalizeGroups } from './normalize';

export type ImportMode = 'replace' | 'merge';

export interface ImportPlan {
  readonly mode: ImportMode;
  readonly result: DeckGroup[];
  readonly summary: string[];
}

/**
 * Aynı şema: doğrudan `cmdDeck.groups` içine yapıştırılabilir.
 * Belirteçler ({venv}, {venvpy}, {rm}, {python}) olduğu gibi korunur,
 * platforma göre çözümleme çalıştırma anında olur.
 */
export function serializeGroups(groups: readonly DeckGroup[]): string {
  return JSON.stringify(groups, null, 2);
}

/** Geçersiz JSON veya geçerli ama boş liste → undefined. */
export function parseGroups(input: string): DeckGroup[] | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    return undefined;
  }

  const groups = normalizeGroups(parsed);
  return groups.length > 0 ? groups : undefined;
}

/**
 * Birleştirme: aynı isimli grupta aynı isimli komut güncellenir, yeni komutlar
 * sona eklenir. Gelen listede olmayan komutlar **silinmez** (silmek için
 * "değiştir" modu kullanılır).
 */
export function mergeGroups(
  current: readonly DeckGroup[],
  incoming: readonly DeckGroup[]
): DeckGroup[] {
  const merged = current.map((group) => ({
    ...group,
    commands: [...group.commands],
  }));

  for (const group of incoming) {
    const target = merged.find((candidate) => candidate.name === group.name);

    if (!target) {
      merged.push({ ...group, commands: [...group.commands] });
      continue;
    }

    for (const command of group.commands) {
      const index = target.commands.findIndex(
        (candidate) => candidate.name === command.name
      );
      if (index >= 0) {
        target.commands[index] = command;
      } else {
        target.commands.push(command);
      }
    }
  }

  return merged;
}

/** Gelen grupta aynı isimli komut bulunmayan mevcut komutlar. */
export function removedInGroup(
  current: DeckGroup,
  incoming: DeckGroup
): DeckCommand[] {
  return current.commands.filter(
    (command) => !incoming.commands.some((candidate) => candidate.name === command.name)
  );
}

function describe(
  current: readonly DeckGroup[],
  result: readonly DeckGroup[]
): string[] {
  if (result.length === 0) {
    return [];
  }

  if (current.length === 0) {
    return [`Sonuç: ${result.length} grup, ${countCommands(result)} komut (yeni liste)`];
  }

  const lines = result.map((group) => {
    const before = current.find((candidate) => candidate.name === group.name);

    if (!before) {
      return `• ${group.name}: yeni grup, ${group.commands.length} komut`;
    }

    const added = group.commands.filter(
      (command) => !before.commands.some((c) => c.name === command.name)
    ).length;
    const changed = group.commands.filter((command) => {
      const previous = before.commands.find((c) => c.name === command.name);
      return previous !== undefined && !isSameCommand(previous, command);
    }).length;
    const removed = removedInGroup(before, group).length;

    const parts = [`${group.commands.length} komut`];
    if (added > 0) parts.push(`${added} yeni`);
    if (changed > 0) parts.push(`${changed} güncellenecek`);
    if (removed > 0) parts.push(`${removed} silinecek`);

    return `• ${group.name}: ${parts.join(', ')}`;
  });

  lines.push(`Toplam: ${countCommands(current)} → ${countCommands(result)} komut`);

  return lines;
}

function isSameCommand(a: DeckCommand, b: DeckCommand): boolean {
  return (
    a.command === b.command &&
    a.description === b.description &&
    a.confirm === b.confirm &&
    a.argsPrompt === b.argsPrompt &&
    a.clear === b.clear &&
    a.icon === b.icon
  );
}

export function planImport(
  current: readonly DeckGroup[],
  incoming: readonly DeckGroup[],
  mode: ImportMode
): ImportPlan {
  const result = mode === 'replace' ? [...incoming] : mergeGroups(current, incoming);
  return { mode, result, summary: describe(current, result) };
}