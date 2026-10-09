import { describe, expect, it } from 'vitest';
import {
  countCommands,
  normalizeCommand,
  normalizeGroup,
  normalizeGroups,
} from '../../src/normalize';

describe('normalizeCommand', () => {
  it('geçerli komutu doldurur', () => {
    const command = normalizeCommand({ name: 'status', command: 'git status' });

    expect(command).toEqual({
      name: 'status',
      command: 'git status',
      description: '',
      icon: '$(terminal)',
      confirm: false,
      argsPrompt: undefined,
      clear: false,
    });
  });

  it('isim veya komut eksikse atlanır', () => {
    expect(normalizeCommand({ name: 'a' })).toBeUndefined();
    expect(normalizeCommand({ command: 'ls' })).toBeUndefined();
    expect(normalizeCommand({ name: 'a', command: '' })).toBeUndefined();
  });

  it('metin olmayan alanları yok sayar', () => {
    const command = normalizeCommand({
      name: 'a',
      command: 'ls',
      description: 42,
      icon: {},
      clear: 'evet',
    });

    expect(command?.description).toBe('');
    expect(command?.icon).toBe('$(terminal)');
    expect(command?.clear).toBe(false);
  });

  it('confirm: true otomatik metne dönüşür', () => {
    const command = normalizeCommand({ name: 'rm', command: 'rm -rf /', confirm: true });

    expect(command?.confirm).toBe("'rm -rf /' çalıştırılsın mı?");
  });

  it('confirm metni aynen korunur', () => {
    const command = normalizeCommand({
      name: 'rm',
      command: 'rm -rf /',
      confirm: 'Emin misin?',
    });

    expect(command?.confirm).toBe('Emin misin?');
  });

  it('confirm: false onay istemez', () => {
    expect(normalizeCommand({ name: 'a', command: 'ls', confirm: false })?.confirm).toBe(false);
  });

  it('boş string confirm, false sayılır', () => {
    expect(normalizeCommand({ name: 'a', command: 'ls', confirm: '' })?.confirm).toBe(false);
  });
});

describe('normalizeGroup', () => {
  it('geçerli komutları alır', () => {
    const group = normalizeGroup({
      name: 'Git',
      icon: '$(source-control)',
      commands: [
        { name: 'status', command: 'git status' },
        { name: 'bozuk' },
      ],
    });

    expect(group?.commands).toHaveLength(1);
    expect(group?.icon).toBe('$(source-control)');
  });

  it('grup rengini ham string olarak koruyor (JSON serileştirmesi)', () => {
    const group = normalizeGroup({
      name: 'A',
      color: '  #4B8BBE  ',
      commands: [{ name: 'x', command: 'ls' }],
    });

    // parse edilmiş nesne degil string: boylece disa/ice aktarimda bozulmaz.
    expect(group?.color).toBe('#4B8BBE');
    expect(JSON.parse(JSON.stringify(group))?.color).toBe('#4B8BBE');
  });

  it('grup rengi bos veya hataliysa undefined', () => {
    const base = { name: 'A', commands: [{ name: 'x', command: 'ls' }] };

    expect(normalizeGroup(base)?.color).toBeUndefined();
    expect(normalizeGroup({ ...base, color: '   ' })?.color).toBeUndefined();
    expect(normalizeGroup({ ...base, color: 42 })?.color).toBeUndefined();
  });

  it('komutsuz veya isimsiz grubu atlar', () => {
    expect(normalizeGroup({ name: 'Boş', commands: [] })).toBeUndefined();
    expect(normalizeGroup({ commands: [{ name: 'a', command: 'ls' }] })).toBeUndefined();
  });
});

describe('normalizeGroups', () => {
  it('dizi değilse boş liste döner, çökmez', () => {
    expect(normalizeGroups(undefined)).toEqual([]);
    expect(normalizeGroups(null)).toEqual([]);
    expect(normalizeGroups('metin')).toEqual([]);
    expect(normalizeGroups(42)).toEqual([]);
    expect(normalizeGroups({})).toEqual([]);
  });

  it('karışık dizide yalnızca geçerli grupları alır', () => {
    const groups = normalizeGroups([
      { name: 'A', commands: [{ name: 'a1', command: 'ls' }] },
      null,
      'çöp',
      { name: 'B', commands: [] },
      { name: 'C', commands: [{ name: 'c1', command: 'pwd' }] },
    ]);

    expect(groups.map((group) => group.name)).toEqual(['A', 'C']);
  });
});

describe('countCommands', () => {
  it('tüm grupların komutlarını toplar', () => {
    const groups = normalizeGroups([
      { name: 'A', commands: [{ name: 'a1', command: 'ls' }, { name: 'a2', command: 'pwd' }] },
      { name: 'B', commands: [{ name: 'b1', command: 'id' }] },
    ]);

    expect(countCommands(groups)).toBe(3);
    expect(countCommands([])).toBe(0);
  });
});

describe('argsSingle', () => {
  it('yalnızca true iken işaretlenir', () => {
    expect(normalizeCommand({ name: 'a', command: 'b', argsSingle: true })?.argsSingle).toBe(true);
    expect(normalizeCommand({ name: 'a', command: 'b', argsSingle: false })?.argsSingle).toBeUndefined();
    expect(normalizeCommand({ name: 'a', command: 'b' })?.argsSingle).toBeUndefined();
  });

  it('gerçek dışında her şeyi yutuyor', () => {
    expect(normalizeCommand({ name: 'a', command: 'b', argsSingle: 'evet' })?.argsSingle).toBeUndefined();
  });
});
