import { beforeEach, describe, expect, it } from 'vitest';
import {
  messages,
  QuickPickItemKind,
  queueQuickPick,
  quickPickCalls,
  resetConfiguration,
} from '../stubs/vscode';
import { pickAnyCommand, pickCommand, pickCommandsInGroup } from '../../src/picker';
import { MENU_SEPARATOR } from '../../src/menu';
import { DeckCommand, DeckGroup } from '../../src/normalize';

/**
 * `picker` testleri iki soruya bakıyor:
 *
 *  1. **Listede ne vardı?** — `showQuickPick`'e sunulan öğeler, kullanıcının
 *     gördüğü şeydir. `quickPickCalls` bunu kaydediyor.
 *  2. **Seçim ne döndürdü?** — çağıran kod yalnızca `PickResult`'a bakıyor;
 *     ayrımın kendisi doğruysa yeter.
 *
 * İkisi birbirinin yerine geçmez: menüye "Tüm Komutlarda Ara" yazmış da
 * `matchOnDetail` yoksa kullanıcı shell metnine göre arayamaz.
 */

interface ItemLike {
  label?: string;
  description?: string;
  detail?: string;
  kind?: QuickPickItemKind;
  group?: unknown;
  command?: unknown;
  actionId?: string;
}

function command(overrides: Partial<DeckCommand> = {}): DeckCommand {
  return {
    name: 'status',
    command: 'git status',
    description: 'çalışma ağacı',
    icon: '$(terminal)',
    confirm: false,
    clear: false,
    ...overrides,
  };
}

function group(overrides: Partial<DeckGroup> = {}): DeckGroup {
  return {
    name: 'Git',
    icon: '$(source-control)',
    commands: [command()],
    ...overrides,
  };
}

/** Sunulan öğeleri okunabilir biçime getirir. */
function shownItems(callIndex = 0): ItemLike[] {
  const call = quickPickCalls[callIndex];
  return Array.isArray(call?.items) ? (call.items as ItemLike[]) : [];
}

function labels(callIndex = 0): string[] {
  return shownItems(callIndex).map((item) => item.label ?? '');
}

beforeEach(() => {
  resetConfiguration();
});

describe('pickCommand — grup listesi', () => {
  it('grup yoksa uyarır ve hiçbir şey göstermez', async () => {
    const result = await pickCommand([]);

    expect(result).toBeUndefined();
    expect(quickPickCalls).toHaveLength(0);
    expect(messages.at(-1)?.kind).toBe('warning');
  });

  it('uyarı hangi ayarın düzenleneceğini söyler', async () => {
    await pickCommand([]);

    expect(messages.at(-1)?.text).toContain('cmdkit.groups');
  });

  it('her grubu ikonu ve komut sayısıyla listeler', async () => {
    queueQuickPick(undefined);

    await pickCommand([
      group({ name: 'Git', icon: '$(source-control)', commands: [command(), command({ name: 'log' })] }),
      group({ name: 'Node', icon: '$(server)' }),
    ]);

    expect(labels()[0]).toBe('$(source-control) Git');
    expect(shownItems()[0]?.description).toBe('2 komut');
    expect(labels()[1]).toBe('$(server) Node');
  });

  it('grup listesinin altında yardımcı menü ayracı var', async () => {
    queueQuickPick(undefined);

    await pickCommand([group()]);

    const separator = shownItems().find((item) => item.kind === QuickPickItemKind.Separator);
    expect(separator?.label).toBe(MENU_SEPARATOR);
  });

  it('yardımcı menü kalemleri seçilebilir', async () => {
    queueQuickPick(undefined);

    await pickCommand([group()]);

    const actions = shownItems().filter((item) => item.actionId);
    expect(actions.length).toBeGreaterThan(0);
    expect(labels().some((l) => l.includes('Tüm Komutlarda Ara'))).toBe(true);
  });

  it('arama kutusu grup ve menü adlarını önerir', async () => {
    queueQuickPick(undefined);

    await pickCommand([group()]);

    expect((quickPickCalls[0]?.options as { matchOnDescription?: boolean })?.matchOnDescription).toBe(true);
  });
});

describe('pickCommand — seçim sonucu', () => {
  it('yardımcı menü seçilirse eylem döner', async () => {
    const item = shownItemsLike({ actionId: 'cmdkit.search' });
    queueQuickPick(item);

    const result = await pickCommand([group()]);

    expect(result).toEqual({ kind: 'action', id: 'cmdkit.search' });
  });

  it('grup seçilirse ikinci menü açılır', async () => {
    const target = group();
    queueQuickPick(shownItemsLike({ group: target }));
    queueQuickPick(shownItemsLike({ group: target, command: target.commands[0] }));

    const result = await pickCommand([target]);

    expect(quickPickCalls).toHaveLength(2);
    expect(result?.kind).toBe('command');
  });

  it('Esc grup listesinde seçim yapmadan çıkar', async () => {
    queueQuickPick(undefined);

    expect(await pickCommand([group()])).toBeUndefined();
  });

  it('ayraç seçilirse ikinci menü açılmaz', async () => {
    queueQuickPick(shownItemsLike({ kind: QuickPickItemKind.Separator, label: MENU_SEPARATOR }));

    const result = await pickCommand([group()]);

    expect(result).toBeUndefined();
    expect(quickPickCalls).toHaveLength(1);
  });
});

describe('pickCommandsInGroup — grup seviyesini atlayan menü', () => {
  it('komutları isim, ikon ve açıklayla listeler', async () => {
    const g = group({
      commands: [
        command({ name: 'status', icon: '$(source-control)', description: 'çalışma ağacı' }),
        command({ name: 'fetch', icon: '$(cloud-download)', description: 'uzak güncelle' }),
      ],
    });
    queueQuickPick(undefined);

    await pickCommandsInGroup(g);

    expect(labels()).toEqual(['$(source-control) status', '$(cloud-download) fetch']);
    expect(shownItems()[0]?.description).toBe('çalışma ağacı');
  });

  it('shell metni ayrıntıda görünür', async () => {
    queueQuickPick(undefined);

    await pickCommandsInGroup(group({ commands: [command({ description: 'çalışma ağacı' })] }));

    expect(shownItems()[0]?.detail).toBe('git status');
  });

  it('açıklamasız komutta shell metni açıklama yerine geçer', async () => {
    queueQuickPick(undefined);

    await pickCommandsInGroup(group({ commands: [command({ description: '' })] }));

    expect(shownItems()[0]?.description).toBe('git status');
    expect(shownItems()[0]?.detail).toBeUndefined();
  });

  it('shell metnine göre arama açıktır', async () => {
    queueQuickPick(undefined);

    await pickCommandsInGroup(group());

    const options = quickPickCalls[0]?.options as { matchOnDetail?: boolean };
    expect(options.matchOnDetail).toBe(true);
  });

  it('komut seçilince grup ve komut birlikte döner', async () => {
    const g = group();
    const target = g.commands[0];
    queueQuickPick({ group: g, command: target });

    const result = await pickCommandsInGroup(g);

    expect(result).toEqual({ kind: 'command', group: g, command: target });
  });

  it('Esc komut menüsünde çıkış demektir', async () => {
    queueQuickPick(undefined);

    expect(await pickCommandsInGroup(group())).toBeUndefined();
  });
});

describe('pickAnyCommand — tüm komutlar tek listede', () => {
  const GIT = group({
    name: 'Git',
    icon: '$(source-control)',
    commands: [command({ name: 'status', command: 'git status' })],
  });

  const NODE = group({
    name: 'Node.js',
    icon: '$(server)',
    commands: [command({ name: 'test', command: 'npm test' })],
  });

  it('grup yoksa uyarır', async () => {
    expect(await pickAnyCommand([])).toBeUndefined();
    expect(quickPickCalls).toHaveLength(0);
  });

  it('tüm grupların komutlarını düz listeye koyar', async () => {
    queueQuickPick(undefined);

    await pickAnyCommand([GIT, NODE]);

    expect(shownItems()).toHaveLength(2);
    expect(labels()).toEqual(['$(terminal) status', '$(terminal) test']);
  });

  it('hangi gruptan geldiğini her satırda yazar', async () => {
    queueQuickPick(undefined);

    await pickAnyCommand([GIT, NODE]);

    expect(shownItems()[0]?.description).toBe('$(source-control) Git');
    expect(shownItems()[1]?.description).toBe('$(server) Node.js');
  });

  it('arama kutusu hangi gruptan olduğunu söyler', async () => {
    queueQuickPick(undefined);

    await pickAnyCommand([GIT, NODE]);

    const options = quickPickCalls[0]?.options as { placeHolder?: string };
    expect(options.placeHolder).toContain('ara');
  });

  it('shell metnine göre arama açıktır — "git log" yazarak bulabilirsin', async () => {
    queueQuickPick(undefined);

    await pickAnyCommand([GIT, NODE]);

    expect((quickPickCalls[0]?.options as { matchOnDetail?: boolean })?.matchOnDetail).toBe(true);
    expect(shownItems()[0]?.detail).toBe('git status');
  });

  it('komut seçilince doğru grup döner — karışmamalı', async () => {
    const nodeCommand = NODE.commands[0];
    queueQuickPick({ group: NODE, command: nodeCommand });

    const result = await pickAnyCommand([GIT, NODE]);

    expect(result).toEqual({ kind: 'command', group: NODE, command: nodeCommand });
  });

  it('Esc seçim yapmadan çıkar', async () => {
    queueQuickPick(undefined);

    expect(await pickAnyCommand([GIT])).toBeUndefined();
  });
});

/** QuickPick'in kullanıcıya sunduğu bir öğeyi taklit eder. */
function shownItemsLike(extra: ItemLike): ItemLike {
  return extra;
}