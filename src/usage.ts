import * as vscode from 'vscode';
import { Command, Group } from './normalize';

const USAGE_KEY = 'cmddock.usage';
const LAST_KEY = 'cmddock.last';

export interface UsageRecord {
  readonly count: number;
  readonly lastRun: number;
}

export interface LastCommand {
  readonly group: string;
  readonly name: string;
}

export type UsageMap = Readonly<Record<string, UsageRecord>>;

const SEPARATOR = '\u001f';

export function keyOf(groupName: string, commandName: string): string {
  return `${groupName}${SEPARATOR}${commandName}`;
}

export function countOf(usage: UsageMap, groupName: string, commandName: string): number {
  return usage[keyOf(groupName, commandName)]?.count ?? 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Bozuk state içeriği varsa boş harita döner, uzantı çökmez. */
export function readUsage(state: vscode.Memento): UsageMap {
  const raw = state.get<unknown>(USAGE_KEY);
  if (!isRecord(raw)) {
    return {};
  }

  const usage: Record<string, UsageRecord> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!isRecord(value)) {
      continue;
    }
    const count = typeof value.count === 'number' && value.count > 0 ? value.count : 0;
    const lastRun = typeof value.lastRun === 'number' ? value.lastRun : 0;
    usage[key] = { count, lastRun };
  }
  return usage;
}

export function readLast(state: vscode.Memento): LastCommand | undefined {
  const raw = state.get<unknown>(LAST_KEY);
  if (!isRecord(raw)) {
    return undefined;
  }
  const group = typeof raw.group === 'string' ? raw.group : '';
  const name = typeof raw.name === 'string' ? raw.name : '';
  return group && name ? { group, name } : undefined;
}

export async function recordRun(
  state: vscode.Memento,
  group: Group,
  command: Command
): Promise<void> {
  const usage: Record<string, UsageRecord> = { ...readUsage(state) };
  const key = keyOf(group.name, command.name);
  const previous = usage[key];

  usage[key] = { count: (previous?.count ?? 0) + 1, lastRun: Date.now() };
  await state.update(USAGE_KEY, usage);
  await state.update(LAST_KEY, { group: group.name, name: command.name });
}

/** En çok kullanılan üstte; eşitlikte ayardaki sıra korunur (stable sort). */
export function sortCommands(
  commands: readonly Command[],
  usage: UsageMap,
  groupName: string
): Command[] {
  return commands
    .map((command, index) => ({ command, index, count: countOf(usage, groupName, command.name) }))
    .sort((a, b) => b.count - a.count || a.index - b.index)
    .map((entry) => entry.command);
}

/** Grup sırası ayardaki gibi kalır, yalnızca grup içindeki komutlar sıralanır. */
export function rankGroups(groups: readonly Group[], usage: UsageMap): Group[] {
  return groups.map((group) => ({
    ...group,
    commands: sortCommands(group.commands, usage, group.name),
  }));
}

/** Ayar değişmiş olsa da son çalışan komut hâlâ tanımlıysa bulunur. */
export function resolveLast(
  groups: readonly Group[],
  last: LastCommand | undefined
): { group: Group; command: Command } | undefined {
  if (!last) {
    return undefined;
  }

  const group = groups.find((candidate) => candidate.name === last.group);
  const command = group?.commands.find((candidate) => candidate.name === last.name);

  return group && command ? { group, command } : undefined;
}

export function findCommand(
  groups: readonly Group[],
  groupName: string,
  commandName: string
): { group: Group; command: Command } | undefined {
  return resolveLast(groups, { group: groupName, name: commandName });
}
