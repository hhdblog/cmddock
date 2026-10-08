import { describe, expect, it } from 'vitest';
import { normalizeGroups } from '../../src/normalize';
import {
  MASTER_ID,
  MASTER_PRIORITY,
  planItems,
  StatusBarOptions,
} from '../../src/plan';

const groups = normalizeGroups([
  { name: 'Python', icon: '$(snake)', commands: [{ name: 'test', command: 'pytest' }] },
  { name: 'Flutter', icon: '$(device-mobile)', commands: [{ name: 'run', command: 'flutter run' }] },
  { name: 'Node.js', icon: '$(server-environment)', commands: [{ name: 'kur', command: 'npm i' }] },
]);

const base: StatusBarOptions = {
  showGroups: true,
  showMaster: true,
  hiddenGroups: [],
  masterIcon: '$(terminal)',
  groupLabel: () => '',
};

describe('planItems', () => {
  it('cmd düğmesi + her grup için bir düğme üretir', () => {
    const plan = planItems(groups, base);

    expect(plan).toHaveLength(4);
    expect(plan[0].kind).toBe('master');
    expect(plan.map((entry) => entry.id)).toEqual([
      MASTER_ID,
      'Python',
      'Flutter',
      'Node.js',
    ]);
  });

  it('grup düğmeleri yalnızca ikon gösterir', () => {
    const plan = planItems(groups, base);
    const python = plan.find((entry) => entry.id === 'Python');

    expect(python?.text).toBe('$(snake)');
  });

  it('groupLabel always ise grup adı da yazılır', () => {
    const plan = planItems(groups, { ...base, groupLabel: (group) => group.name });
    const python = plan.find((entry) => entry.id === 'Python');

    expect(python?.text).toBe('$(snake) Python');
  });

  it('öncelikler azalan sırada ve cmd en solda', () => {
    const plan = planItems(groups, base);

    expect(plan[0].priority).toBe(MASTER_PRIORITY);
    expect(plan.map((entry) => entry.priority)).toEqual([
      MASTER_PRIORITY,
      MASTER_PRIORITY - 1,
      MASTER_PRIORITY - 2,
      MASTER_PRIORITY - 3,
    ]);
  });

  it('masterPriority verilirse ona göre kayar', () => {
    const plan = planItems(groups, { ...base, masterPriority: 900 });
    expect(plan.map((entry) => entry.priority)).toEqual([900, 899, 898, 897]);
  });

  it('varsayılan bant 100 ile çakışan eklentilerden kaçınır', () => {
    // Bu makinede -1, 0, 1, 100 ve 1000 kullanılıyor; 100 (Live Server) çakışıyordu.
    expect(MASTER_PRIORITY).toBe(250);
  });

  it('showGroups false ise yalnızca cmd kalır', () => {
    const plan = planItems(groups, { ...base, showGroups: false });

    expect(plan).toHaveLength(1);
    expect(plan[0].kind).toBe('master');
  });

  it('showMaster false ise yalnızca grup düğmeleri kalır', () => {
    const plan = planItems(groups, { ...base, showMaster: false });

    expect(plan.map((entry) => entry.id)).toEqual(['Python', 'Flutter', 'Node.js']);
  });

  it('hiddenGroups listesindeki grupları gizler', () => {
    const plan = planItems(groups, { ...base, hiddenGroups: ['Flutter'] });

    expect(plan.map((entry) => entry.id)).toEqual([MASTER_ID, 'Python', 'Node.js']);
  });

  it('iki seçenek de kapalıysa hiçbir düğme üretilmez', () => {
    const plan = planItems(groups, {
      ...base,
      showGroups: false,
      showMaster: false,
    });

    expect(plan).toEqual([]);
  });

  it('Cmd etiketi ilk harf büyük ve ayarlanan ikonla kullanılır', () => {
    const plan = planItems(groups, { ...base, masterIcon: '$(zap)' });

    expect(plan[0].text).toBe('$(zap) Cmd');
  });

  it('tooltip grup adı ve komut sayısını içerir', () => {
    const plan = planItems(groups, base);
    const tooltip = plan.find((entry) => entry.id === 'Python')?.tooltipLines.join('\n');

    expect(tooltip).toContain('Python');
    expect(tooltip).toContain('1 komut');
  });

  it('en çok kullanılan komut varsa tooltipte görünür', () => {
    const plan = planItems(groups, {
      ...base,
      topCommand: (group) =>
        group.name === 'Python' ? { name: 'test', count: 5 } : undefined,
    });

    expect(plan.find((entry) => entry.id === 'Python')?.tooltipLines.join('\n')).toContain(
      'En çok: test (×5)'
    );
    expect(plan.find((entry) => entry.id === 'Node.js')?.tooltipLines.join('\n')).not.toContain(
      'En çok'
    );
  });

  it('her düğmeye ayrı durum çubuğu kimliği verir', () => {
    // id verilmezse hepsi eklenti kimliğine düşüyor ve sağ tık menüsü
    // "hepsini gizle / hepsini göster" olarak tek kalem çıkıyor.
    const ids = planItems(groups, base).map((entry) => entry.statusBarId);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids[0]).toBe('cmd-deck.cmd');
    expect(ids.slice(1)).toEqual([
      'cmd-deck.group.Python',
      'cmd-deck.group.Flutter',
      'cmd-deck.group.Node.js',
    ]);
  });

  it('aynı isimli gruplarda kimlikler çakışmaz', () => {
    const duplicated = normalizeGroups([
      { name: 'A', commands: [{ name: 'x', command: 'ls' }] },
      { name: 'A', commands: [{ name: 'y', command: 'pwd' }] },
    ]);
    const ids = planItems(duplicated, base).map((entry) => entry.statusBarId);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('cmd-deck.group.A');
    expect(ids).toContain('cmd-deck.group.A#2');
  });

  it('grup rengini düğmeye taşır', () => {
    const colored = normalizeGroups([
      { name: 'Renkli', color: '#4B8BBE', commands: [{ name: 'x', command: 'ls' }] },
      { name: 'Temalı', color: 'charts.red', commands: [{ name: 'y', command: 'pwd' }] },
      { name: 'Rengi yok', commands: [{ name: 'z', command: 'id' }] },
      { name: 'Bozuk renk', color: 'rgb(1,2,3)', commands: [{ name: 'w', command: 'ls' }] },
    ]);
    const plan = planItems(colored, base);

    expect(plan.find((e) => e.id === 'Renkli')?.color).toEqual({ hex: '#4B8BBE' });
    expect(plan.find((e) => e.id === 'Temalı')?.color).toEqual({ theme: 'charts.red' });
    expect(plan.find((e) => e.id === 'Rengi yok')?.color).toBeUndefined();
    expect(plan.find((e) => e.id === 'Bozuk renk')?.color).toBeUndefined();
  });

  it('tek kelime tema rengi kabul edilir', () => {
    // VSCode tema renkleri id ile verilir (charts.red, foreground, ...); bilinmeyen
    // id sessizce renksiz kalir, bu yuzden reddedilmiyor.
    const themed = normalizeGroups([
      { name: 'A', color: 'foreground', commands: [{ name: 'x', command: 'ls' }] },
    ]);
    expect(planItems(themed, base).find((e) => e.id === 'A')?.color).toEqual({
      theme: 'foreground',
    });
  });

  it('cmd düğmesinde grup rengi uygulanmaz', () => {
    const colored = normalizeGroups([
      { name: 'A', color: '#4B8BBE', commands: [{ name: 'x', command: 'ls' }] },
    ]);
    expect(planItems(colored, base).find((e) => e.kind === 'master')?.color).toBeUndefined();
  });

  it('menüde görünecek adlar ayrı ayrı', () => {
    // name set edilmezse menüde tüm öğeler "Cmd Deck (extension)" görünür.
    const names = planItems(groups, base).map((entry) => entry.name);

    expect(names).toEqual([
      'Cmd Deck: Tüm Gruplar',
      'Cmd Deck: Python',
      'Cmd Deck: Flutter',
      'Cmd Deck: Node.js',
    ]);
  });

  it('ad kısa ve ayırt edici kalır', () => {
    for (const entry of planItems(groups, base)) {
      expect(entry.name.length).toBeLessThan(40);
    }
  });

  it('gruplar boşsa yalnızca cmd üretilir', () => {
    expect(planItems([], base).map((entry) => entry.kind)).toEqual(['master']);
  });

  it('komutu olmayan grup (normalizasyonda elenir) düğme üretmez', () => {
    const plan = planItems(groups, { ...base, hiddenGroups: ['Python', 'Flutter', 'Node.js'] });
    expect(plan.map((entry) => entry.id)).toEqual([MASTER_ID]);
  });
});