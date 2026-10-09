import { parseJsonc } from './jsonc';
import { Command, Group, countCommands, normalizeGroups } from './normalize';

export type ImportMode = 'replace' | 'merge';

export interface ImportPlan {
  readonly mode: ImportMode;
  readonly result: Group[];
  readonly summary: string[];
}

/**
 * Aynı şema: doğrudan `cmddock.groups` içine yapıştırılabilir.
 * Belirteçler ({venv}, {venvpy}, {rm}, {python}) olduğu gibi korunur,
 * platforma göre çözümleme çalıştırma anında olur.
 */
export function serializeJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function serializeGroups(groups: readonly Group[]): string {
  return serializeJson(groups);
}

const FALLBACK_ICON = '$(terminal)';

interface LooseCommand {
  name: string;
  command: string;
  icon?: string;
  description?: string;
  confirm?: string | false;
  argsPrompt?: string;
  argsSingle?: boolean;
  clear?: boolean;
}

interface LooseGroup {
  name: string;
  icon?: string;
  color?: string;
  commands: LooseCommand[];
}

/**
 * Normalizasyonun doldurduğu varsayılanları ayıklar — `settings.json`'a yazmadan
 * önce kullanılır.
 *
 * Normalize edilmiş her komut `confirm: false`, `clear: false`, `icon: "$(terminal)"`
 * ve çoğu zaman `description: ""` taşır. Bunlar okurken `normalizeGroups` tarafından
 * zaten geri doldurulduğu için **davranış değişmez**; kazanç, üretilen dosyanın
 * gerçekte ne ayarlandığını göstermesi. 61 komutta ~106 satır gürültü gider.
 *
 * Önemli: bu yalnızca serileştirmede kullanılır. `planImport` ve `isSameCommand`
 * normalize edilmiş alanlar üzerinden karşılaştırma yapmaya devam eder —
 * değiştirilirse "hiçbir şey değişmedi" algılaması bozulur.
 */
export function slimGroups(groups: readonly Group[]): LooseGroup[] {
  return groups.map((group) => {
    const slim: LooseGroup = { name: group.name, commands: [] };

    if (group.icon && group.icon !== FALLBACK_ICON) {
      slim.icon = group.icon;
    }
    if (group.color) {
      slim.color = group.color;
    }

    slim.commands = group.commands.map((command) => {
      const entry: LooseCommand = { name: command.name, command: command.command };

      if (command.icon && command.icon !== FALLBACK_ICON) {
        entry.icon = command.icon;
      }
      if (command.description) {
        entry.description = command.description;
      }
      if (command.confirm) {
        entry.confirm = command.confirm;
      }
      if (command.argsPrompt) {
        entry.argsPrompt = command.argsPrompt;
      }
      if (command.argsSingle) {
        entry.argsSingle = true;
      }
      if (command.clear) {
        entry.clear = true;
      }

      return entry;
    });

    return slim;
  });
}

/**
 * Okuma hatasının nedenini söyler.
 *
 * `parseGroups` hem bozuk JSON'da hem de boş listede `undefined` dönüyor. Tek
 * mesaj verilirse kullanıcı listenin boş olduğunu anlamıyor, var olmayan bir
 * sözdizimi hatası arıyor.
 */
export function parseFailureReason(input: string): string | undefined {
  const result = parseJsonc(input);
  if (!result.ok) {
    // Yorum temizlendikten sonra da hata varsa gerçek sorun yorum değil —
    // kullanıcının aradığı cevap "tırnak, virgül ya da parantez eksik".
    return 'The JSON may be broken — a quote, a comma or a curly brace is missing.';
  }

  const parsed = result.value;

  if (!Array.isArray(parsed)) {
    return 'The file must be an array of commands — it should start with a square bracket.';
  }

  if (parsed.length === 0) {
    return 'No group left in the file. At least one group is required — if you remove the last one there ' +
      'is nothing left to run.';
  }

  // commands alanı var ama boşsa "eksik" demek yanlış olur; grup sessizce
  // düşüyor ve kullanıcı nedenini bulamıyor.
  const onlyEmpty = (parsed as Record<string, unknown>[]).every(
    (group) => Array.isArray(group?.commands) && group.commands.length === 0
  );
  if (onlyEmpty) {
    return 'The "commands" arrays of the groups are empty. Add a group with at least one command — ' +
      'a group without commands is ignored silently.';
  }

  // Dizi ve boş değil; gerçekten geçersizse normalizasyon boş döner.
  if (normalizeGroups(parsed).length === 0) {
    return 'Some group or command fields are missing. Every group needs "name" and "commands", ' +
      'and every command needs "name" and "command".';
  }

  return undefined;
}

/** Geçersiz JSON veya geçerli ama boş liste → undefined. */
export function parseGroups(input: string): Group[] | undefined {
  const result = parseJsonc(input);
  if (!result.ok) {
    return undefined;
  }

  const groups = normalizeGroups(result.value);
  return groups.length > 0 ? groups : undefined;
}

/**
 * Birleştirme: aynı isimli grupta aynı isimli komut güncellenir, yeni komutlar
 * sona eklenir. Gelen listede olmayan komutlar **silinmez** (silmek için
 * "değiştir" modu kullanılır).
 */
export function mergeGroups(
  current: readonly Group[],
  incoming: readonly Group[]
): Group[] {
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

    // Grup seviyesindeki alanlar da gelen dosyadan gelir. Yalnızca komutlar
    // güncelleniyordu; dosyada ikonu ya da rengi değişen kullanıcının düzenlemesi
    // sessizce kayboluyordu.
    target.icon = group.icon;
    target.color = group.color;

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
  current: Group,
  incoming: Group
): Command[] {
  return current.commands.filter(
    (command) => !incoming.commands.some((candidate) => candidate.name === command.name)
  );
}

function describe(
  current: readonly Group[],
  result: readonly Group[]
): string[] {
  if (result.length === 0) {
    return [];
  }

  if (current.length === 0) {
    return [`Result: ${result.length} groups, ${countCommands(result)} commands (new list)`];
  }

  const names = new Set(result.map((group) => group.name));

  const lines = result.map((group) => {
    const before = current.find((candidate) => candidate.name === group.name);

    if (!before) {
      return `• ${group.name}: new group, ${group.commands.length} commands`;
    }

    const added = group.commands.filter(
      (command) => !before.commands.some((c) => c.name === command.name)
    ).length;
    const changed = group.commands.filter((command) => {
      const previous = before.commands.find((c) => c.name === command.name);
      return previous !== undefined && !isSameCommand(previous, command);
    }).length;
    const removed = removedInGroup(before, group).length;
    // Komut değişmese bile ikon/renk değişmiş olabilir; özet bunu söylemezse
    // kullanıcı hiçbir şey olmadığını sanır.
    const appearance = before.icon !== group.icon || before.color !== group.color;

    const parts = [`${group.commands.length} commands`];
    if (added > 0) parts.push(`${added} new`);
    if (changed > 0) parts.push(`${changed} to update`);
    if (removed > 0) parts.push(`${removed} to delete`);
    if (appearance) parts.push('icon/colour changed');

    return `• ${group.name}: ${parts.join(', ')}`;
  });

  // Sonuçta hiç bulunmayan gruplar yukarıdaki gezinmede hiç görünmezdi: kullanıcı
  // "Listeyi değiştir" ile bir grubu sildiğinde özet sessizce geçiyordu. Oysa
  // grup komutlarıyla birlikte kayboluyor, bu da dosyadan bir grup silmenin
  // tek yolu.
  const dropped = current.filter((group) => !names.has(group.name));
  for (const group of dropped) {
    lines.push(
      `• ${group.name}: GROUP WILL BE DELETED (${group.commands.length} commands, icon and colour go too)`
    );
  }

  if (dropped.length > 0) {
    lines.push(
      `${dropped.length} groups will be deleted entirely. This cannot be undone — before you continue ` +
        `consider moving the commands to another group.`
    );
  }

  lines.push(`Total: ${countCommands(current)} → ${countCommands(result)} commands`);

  return lines;
}

function isSameCommand(a: Command, b: Command): boolean {
  return (
    a.command === b.command &&
    a.description === b.description &&
    a.confirm === b.confirm &&
    a.argsPrompt === b.argsPrompt &&
    a.argsSingle === b.argsSingle &&
    a.clear === b.clear &&
    a.icon === b.icon
  );
}

export function planImport(
  current: readonly Group[],
  incoming: readonly Group[],
  mode: ImportMode
): ImportPlan {
  const result = mode === 'replace' ? [...incoming] : mergeGroups(current, incoming);
  return { mode, result, summary: describe(current, result) };
}