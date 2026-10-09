import data from './library.json';

/**
 * Hazır grup kütüphanesi — `CmdDock: Add Built-in Group` ile kullanıcıya sunulur.
 *
 * Varsayılanlar `configurationDefaults` içinde olduğu için her kuruluma geliyor;
 * 61 komuttan sonra listeyi büyütmek herkese her şeyi yüklerdi. Kütüphane
 * bunun yerine seçmeyi kullanıcıya bırakır.
 *
 * Veri `library.json` içinde. `scripts/sync-defaults.mjs` aynı dosyadan
 * `configurationDefaults` üretiyor, yani iki yer değil **tek kaynak** var:
 * `defaults` dizisi ilk kurulumda gelenleri belirliyor, gerisi seçime açık.
 *
 * Çalışma anında `normalizeLibrary` elemesinden geçiyor — bozuk bir kayıt
 * menüyü çökertmek yerine listeden düşer.
 */

/**
 * İlk kurulumda gelen gruplar; `configurationDefaults` bunlardan üretilir.
 * Ad listesi olduğu için kütüphanenin sırası değişse de varsayılanlar sabit.
 */
export const DEFAULT_GROUP_NAMES: readonly string[] = data.defaults;

export interface LibraryCommand {
  readonly name: string;
  readonly command: string;
  readonly description?: string;
  readonly icon?: string;
  readonly confirm?: string | true;
  readonly argsPrompt?: string;
  readonly clear?: boolean;
}

export interface LibraryGroup {
  readonly name: string;
  readonly icon: string;
  readonly color?: string;
  /** Menüde tek satırda görünen kısa açıklama. Yalnızca kütüphaneye özgü —
   *  ayarlara yazılırken atılır. */
  readonly summary: string;
  readonly commands: readonly LibraryCommand[];
}

/** Ham kayıt; doğrulama öncesi. */
export const LIBRARY_RAW: unknown = data.groups;

const FALLBACK_ICON = '$(terminal)';

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asCommand(raw: unknown): LibraryCommand | undefined {
  if (typeof raw !== 'object' || raw === null) {
    return undefined;
  }
  const r = raw as Record<string, unknown>;

  const name = asText(r.name);
  const command = asText(r.command);
  if (!name || !command) {
    return undefined;
  }

  const confirm =
    typeof r.confirm === 'string' && r.confirm.length > 0
      ? r.confirm
      : r.confirm === true
        ? `'${command}' to run?`
        : undefined;

  return {
    name,
    command,
    description: asText(r.description) || undefined,
    icon: asText(r.icon) || FALLBACK_ICON,
    confirm,
    argsPrompt: asText(r.argsPrompt) || undefined,
    clear: r.clear === true,
  };
}

function asGroup(raw: unknown): LibraryGroup | undefined {
  if (typeof raw !== 'object' || raw === null) {
    return undefined;
  }
  const r = raw as Record<string, unknown>;

  const name = asText(r.name);
  const summary = asText(r.summary);
  const rawCommands = Array.isArray(r.commands) ? r.commands : [];
  const commands = rawCommands.map(asCommand).filter((c): c is LibraryCommand => c !== undefined);

  if (!name || !summary || commands.length === 0) {
    return undefined;
  }

  const color = asText(r.color);
  const icon = asText(r.icon) || FALLBACK_ICON;

  return {
    name,
    summary,
    icon,
    ...(color ? { color } : {}),
    commands,
  };
}

/** Bozuk kayıtları düşürür; geçerli olmayan girdi çökertmez, boş listeye iner. */
export function normalizeLibrary(raw: unknown): LibraryGroup[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map(asGroup).filter((g): g is LibraryGroup => g !== undefined);
}

export const LIBRARY_GROUPS: readonly LibraryGroup[] = normalizeLibrary(LIBRARY_RAW);

/** İlk kurulumda gelen gruplar, manifestteki sırayla. */
export function defaultLibraryGroups(): LibraryGroup[] {
  const byName = new Map(LIBRARY_GROUPS.map((group) => [group.name, group]));
  return DEFAULT_GROUP_NAMES.map((name) => byName.get(name)).filter(
    (group): group is LibraryGroup => group !== undefined
  );
}

/** `summary` yalnızca kütüphaneye özgü; ayarlara yazılırken atılır. */
export function asSettingShape(group: LibraryGroup): unknown {
  const { summary: _summary, ...rest } = group;
  return rest;
}