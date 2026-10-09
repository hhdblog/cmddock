import { beforeEach, describe, expect, it } from 'vitest';
import { normalizeGroups } from '../../src/normalize';
import {
  countOf,
  keyOf,
  rankGroups,
  readLast,
  readUsage,
  recordRun,
  resolveLast,
  sortCommands,
} from '../../src/usage';

type Store = Map<string, unknown>;

function fakeState(initial: Record<string, unknown> = {}) {
  const store: Store = new Map(Object.entries(initial));

  return {
    store,
    get: <T>(key: string, defaultValue?: T): T | undefined =>
      store.has(key) ? (store.get(key) as T) : defaultValue,
    update: async (key: string, value: unknown): Promise<void> => {
      store.set(key, value);
    },
    keys: () => [...store.keys()],
  };
}

const groups = normalizeGroups([
  {
    name: 'A',
    commands: [
      { name: 'bir', command: 'ls' },
      { name: 'iki', command: 'pwd' },
      { name: 'üç', command: 'id' },
    ],
  },
  { name: 'B', commands: [{ name: 'bir', command: 'echo' }] },
]);

const commandOf = (group: string, name: string) =>
  groups.find((g) => g.name === group)!.commands.find((c) => c.name === name)!;

describe('keyOf', () => {
  it('aynı isimli komutları farklı anahtarlara ayırır', () => {
    expect(keyOf('A', 'bir')).not.toBe(keyOf('B', 'bir'));
  });
});

describe('readUsage', () => {
  it('state boşken boş harita döner', () => {
    expect(readUsage(fakeState())).toEqual({});
  });

  it('bozuk state çökmez', () => {
    expect(readUsage(fakeState({ 'cmddock.usage': 'çöp' }))).toEqual({});
    expect(readUsage(fakeState({ 'cmddock.usage': [1, 2] }))).toEqual({});
    expect(readUsage(fakeState({ 'cmddock.usage': { anahtar: 'çöp' } }))).toEqual({});
  });

  it('eksik alanları varsayılana düşürür', () => {
    const usage = readUsage(fakeState({ 'cmddock.usage': { anahtar: { count: -3 } } }));
    expect(usage['anahtar']).toEqual({ count: 0, lastRun: 0 });
  });
});

describe('recordRun', () => {
  it('sayacı artırır ve son komutu yazar', async () => {
    const state = fakeState();

    await recordRun(state, groups[0], commandOf('A', 'bir'));
    await recordRun(state, groups[0], commandOf('A', 'bir'));
    await recordRun(state, groups[0], commandOf('A', 'iki'));

    const usage = readUsage(state);
    expect(countOf(usage, 'A', 'bir')).toBe(2);
    expect(countOf(usage, 'A', 'iki')).toBe(1);
    expect(readLast(state)).toEqual({ group: 'A', name: 'iki' });
  });

  it('son çalışma zamanını kaydeder', async () => {
    const state = fakeState();
    const before = Date.now();

    await recordRun(state, groups[0], commandOf('A', 'bir'));

    const usage = readUsage(state);
    expect(usage[keyOf('A', 'bir')].lastRun).toBeGreaterThanOrEqual(before);
  });

  it('mevcut sayaçları silmez', async () => {
    const state = fakeState({
      'cmddock.usage': { [keyOf('A', 'bir')]: { count: 7, lastRun: 1 } },
    });

    await recordRun(state, groups[0], commandOf('A', 'bir'));

    expect(readUsage(state)[keyOf('A', 'bir')].count).toBe(8);
  });
});

describe('readLast', () => {
  it('geçersiz değerlerde undefined döner', () => {
    expect(readLast(fakeState())).toBeUndefined();
    expect(readLast(fakeState({ 'cmddock.last': 42 }))).toBeUndefined();
    expect(readLast(fakeState({ 'cmddock.last': { group: 'A' } }))).toBeUndefined();
    expect(readLast(fakeState({ 'cmddock.last': { group: '', name: 'bir' } }))).toBeUndefined();
  });
});

describe('sortCommands', () => {
  it('en çok kullanılanı üste alır', () => {
    const usage = {
      [keyOf('A', 'üç')]: { count: 5, lastRun: 0 },
      [keyOf('A', 'bir')]: { count: 2, lastRun: 0 },
    };

    const sorted = sortCommands(groups[0].commands, usage, 'A');
    expect(sorted.map((c) => c.name)).toEqual(['üç', 'bir', 'iki']);
  });

  it('eşitlikte ayar sırasını korur', () => {
    const usage = {
      [keyOf('A', 'bir')]: { count: 2, lastRun: 0 },
      [keyOf('A', 'iki')]: { count: 2, lastRun: 0 },
    };

    const sorted = sortCommands(groups[0].commands, usage, 'A');
    expect(sorted.map((c) => c.name)).toEqual(['bir', 'iki', 'üç']);
  });

  it('bir kez kullanılan komut kullanılmayanların üstüne geçer', () => {
    const usage = { [keyOf('A', 'üç')]: { count: 1, lastRun: 0 } };

    const sorted = sortCommands(groups[0].commands, usage, 'A');
    expect(sorted.map((c) => c.name)).toEqual(['üç', 'bir', 'iki']);
  });

  it('kullanılmayan komutlarda sıra değişmez', () => {
    expect(sortCommands(groups[0].commands, {}, 'A').map((c) => c.name)).toEqual([
      'bir',
      'iki',
      'üç',
    ]);
  });

  it('başka grubun sayacı karıştırmaz', () => {
    const usage = { [keyOf('B', 'bir')]: { count: 99, lastRun: 0 } };
    expect(sortCommands(groups[0].commands, usage, 'A').map((c) => c.name)).toEqual([
      'bir',
      'iki',
      'üç',
    ]);
  });
});

describe('rankGroups', () => {
  it('grup sırasını korur, komutları sıralar', () => {
    const usage = { [keyOf('A', 'üç')]: { count: 9, lastRun: 0 } };
    const ranked = rankGroups(groups, usage);

    expect(ranked.map((g) => g.name)).toEqual(['A', 'B']);
    expect(ranked[0].commands.map((c) => c.name)).toEqual(['üç', 'bir', 'iki']);
  });

  it('orijinal grubu değiştirmez', () => {
    const usage = { [keyOf('A', 'üç')]: { count: 9, lastRun: 0 } };
    rankGroups(groups, usage);
    expect(groups[0].commands.map((c) => c.name)).toEqual(['bir', 'iki', 'üç']);
  });
});

describe('resolveLast', () => {
  it('güncel ayarlardan komutu bulur', () => {
    const resolved = resolveLast(groups, { group: 'A', name: 'iki' });
    expect(resolved?.command.command).toBe('pwd');
    expect(resolved?.group.name).toBe('A');
  });

  it('son komut yoksa undefined döner', () => {
    expect(resolveLast(groups, undefined)).toBeUndefined();
  });

  it('ayar silinmişse undefined döner', () => {
    expect(resolveLast(groups, { group: 'Silinen', name: 'x' })).toBeUndefined();
    expect(resolveLast(groups, { group: 'A', name: 'silinen' })).toBeUndefined();
  });
});
