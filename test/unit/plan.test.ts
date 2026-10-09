import { describe, expect, it } from 'vitest';
import { normalizeGroups } from '../../src/normalize';
import {
  DEFAULT_MAX_GROUP_ITEMS,
  hiddenGroupNames,
  MASTER_ID,
  MASTER_PRIORITY,
  planItems,
  StatusBarOptions,
  visibleGroupNames,
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

/** Testlerde çubuk kıtalması devre dışı; sınır kendi testleriyle var. */
const unlimited: StatusBarOptions = { ...base, maxGroupItems: 99 };

const fiveGroups = normalizeGroups(
  ['Python', 'Flutter', 'Node.js', 'Git', 'Firebase'].map((name) => ({
    name,
    commands: [{ name: 'x', command: 'ls' }],
  }))
);

describe('visibleGroupNames', () => {
  it('varsayılan sınırla ilk 3 grubu döndürür', () => {
    expect(visibleGroupNames(fiveGroups, { hiddenGroups: [] })).toEqual([
      'Python',
      'Flutter',
      'Node.js',
    ]);
  });

  it('gizlenenler listeden çıkar', () => {
    expect(
      visibleGroupNames(fiveGroups, { hiddenGroups: ['Python'], maxGroupItems: 0 })
    ).toEqual(['Flutter', 'Node.js', 'Git', 'Firebase']);
  });

  it('sıfır sınırsız demek', () => {
    expect(visibleGroupNames(fiveGroups, { hiddenGroups: [], maxGroupItems: 0 })).toHaveLength(5);
  });
});

describe('hiddenGroupNames', () => {
  it('seçilmeyenleri döndürür', () => {
    expect(
      hiddenGroupNames(fiveGroups, ['Python', 'Flutter', 'Node.js', 'Git', 'Firebase'])
    ).toEqual([]);
  });

  it('kullanıcı 3 grup seçtiyse 2 grup gizlenir', () => {
    expect(hiddenGroupNames(fiveGroups, ['Python', 'Flutter', 'Node.js'])).toEqual([
      'Git',
      'Firebase',
    ]);
  });

  it('hepsini seçerse hiçbiri gizlenmez', () => {
    expect(hiddenGroupNames(fiveGroups, fiveGroups.map((g) => g.name))).toEqual([]);
  });
});

describe('planItems', () => {
  it('cmd düğmesi + her grup için bir düğme üretir', () => {
    const plan = planItems(groups, unlimited);

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
    const plan = planItems(groups, unlimited);
    const python = plan.find((entry) => entry.id === 'Python');

    expect(python?.text).toBe('$(snake)');
  });

  it('groupLabel always ise grup adı da yazılır', () => {
    const plan = planItems(groups, { ...base, groupLabel: (group) => group.name });
    const python = plan.find((entry) => entry.id === 'Python');

    expect(python?.text).toBe('$(snake) Python');
  });

  it('öncelikler azalan sırada ve cmd en solda', () => {
    const plan = planItems(groups, unlimited);

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
    const plan = planItems(groups, unlimited);
    const tooltip = plan.find((entry) => entry.id === 'Python')?.tooltipLines.join('\n');

    expect(tooltip).toContain('Python');
    expect(tooltip).toContain('1 commands');
  });

  it('en çok kullanılan komut varsa tooltipte görünür', () => {
    const plan = planItems(groups, {
      ...base,
      topCommand: (group) =>
        group.name === 'Python' ? { name: 'test', count: 5 } : undefined,
    });

    expect(plan.find((entry) => entry.id === 'Python')?.tooltipLines.join('\n')).toContain(
      'Most used: test (×5)'
    );
    expect(plan.find((entry) => entry.id === 'Node.js')?.tooltipLines.join('\n')).not.toContain(
      'Most used'
    );
  });

  it('her düğmeye ayrı durum çubuğu kimliği verir', () => {
    // id verilmezse hepsi eklenti kimliğine düşüyor ve sağ tık menüsü
    // "hepsini gizle / hepsini göster" olarak tek kalem çıkıyor.
    const ids = planItems(groups, unlimited).map((entry) => entry.statusBarId);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids[0]).toBe('cmdkit.cmd');
    expect(ids.slice(1)).toEqual([
      'cmdkit.group.Python',
      'cmdkit.group.Flutter',
      'cmdkit.group.Node.js',
    ]);
  });

  it('aynı isimli gruplarda kimlikler çakışmaz', () => {
    const duplicated = normalizeGroups([
      { name: 'A', commands: [{ name: 'x', command: 'ls' }] },
      { name: 'A', commands: [{ name: 'y', command: 'pwd' }] },
    ]);
    const ids = planItems(duplicated, base).map((entry) => entry.statusBarId);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('cmdkit.group.A');
    expect(ids).toContain('cmdkit.group.A#2');
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
    // name set edilmezse menüde tüm öğeler "Cmdkit (extension)" görünür.
    const names = planItems(groups, unlimited).map((entry) => entry.name);

    expect(names).toEqual([
      'Cmdkit: All Groups',
      'Cmdkit: Python',
      'Cmdkit: Flutter',
      'Cmdkit: Node.js',
    ]);
  });

  it('ad kısa ve ayırt edici kalır', () => {
    for (const entry of planItems(groups, unlimited)) {
      expect(entry.name.length).toBeLessThan(40);
    }
  });

  it('varsayılan olarak ilk 3 grup görünür, hepsi oluşturulur', () => {
    const many = normalizeGroups(
      Array.from({ length: 7 }, (_, i) => ({
        name: `G${i + 1}`,
        commands: [{ name: 'x', command: 'ls' }],
      }))
    );
    const plan = planItems(many, base);
    const groupItems = plan.filter((entry) => entry.kind === 'group');

    // Sınırın ötesindekiler de planda: sağ tık menüsünde listelensin diye.
    expect(groupItems).toHaveLength(7);
    expect(groupItems.filter((entry) => entry.visible).map((e) => e.id)).toEqual([
      'G1',
      'G2',
      'G3',
    ]);
    expect(groupItems.filter((entry) => !entry.visible).map((e) => e.id)).toEqual([
      'G4',
      'G5',
      'G6',
      'G7',
    ]);
  });

  it('sınırdaki gruplar doğru öncelik alır', () => {
    const many = normalizeGroups(
      Array.from({ length: 5 }, (_, i) => ({
        name: `G${i + 1}`,
        commands: [{ name: 'x', command: 'ls' }],
      }))
    );
    const priorities = planItems(many, base).map((entry) => entry.priority);

    expect(priorities).toEqual([MASTER_PRIORITY, 249, 248, 247, 246, 245]);
  });

  it('maxGroupItems artırılırsa daha çok grup gösterilir', () => {
    const many = normalizeGroups(
      Array.from({ length: 7 }, (_, i) => ({
        name: `G${i + 1}`,
        commands: [{ name: 'x', command: 'ls' }],
      }))
    );

    expect(
      planItems(many, { ...base, maxGroupItems: 7 }).filter((e) => e.kind === 'group')
    ).toHaveLength(7);
  });

  it('maxGroupItems 0 ise sınırsız: tüm gruplar görünür', () => {
    const many = normalizeGroups(
      Array.from({ length: 7 }, (_, i) => ({
        name: `G${i + 1}`,
        commands: [{ name: 'x', command: 'ls' }],
      }))
    );
    const groupItems = planItems(many, { ...base, maxGroupItems: 0 }).filter(
      (entry) => entry.kind === 'group'
    );

    expect(groupItems).toHaveLength(7);
    expect(groupItems.every((entry) => entry.visible)).toBe(true);
  });

  it('negatif değer de sınırsız sayılır', () => {
    const many = normalizeGroups(
      Array.from({ length: 4 }, (_, i) => ({
        name: `G${i + 1}`,
        commands: [{ name: 'x', command: 'ls' }],
      }))
    );

    expect(planItems(many, { ...base, maxGroupItems: -2 })).toHaveLength(5);
  });

  it('hiç grup düğmesi isteniyorsa showGroups false kullanılır', () => {
    expect(
      planItems(groups, { ...base, showGroups: false }).map((e) => e.kind)
    ).toEqual(['master']);
  });

  it('sınır bozuk değerlerde varsayılana döner', () => {
    const many = normalizeGroups(
      Array.from({ length: 7 }, (_, i) => ({
        name: `G${i + 1}`,
        commands: [{ name: 'x', command: 'ls' }],
      }))
    );

    for (const value of [NaN, Infinity]) {
      expect(
        planItems(many, { ...base, maxGroupItems: value }).filter(
          (e) => e.kind === 'group' && e.visible
        )
      ).toHaveLength(DEFAULT_MAX_GROUP_ITEMS);
    }
  });

  it('sınır ondalıktan tamsayıya kırpılır', () => {
    const visible = planItems(groups, { ...base, maxGroupItems: 2.9 }).filter(
      (e) => e.kind === 'group' && e.visible
    );
    expect(visible).toHaveLength(2);
  });

  it('hiddenGroups düğmesi hiç oluşturulmaz', () => {
    // Gizlemek için ayar kullanıldıysa menüde de görünmemeli — "Show" deyince
    // geri gelmesin, tekrar ayardan açılır.
    const plan = planItems(groups, { ...base, hiddenGroups: ['Python'] });
    expect(plan.map((entry) => entry.id)).toEqual([MASTER_ID, 'Flutter', 'Node.js']);
  });

  it('gruplar boşsa yalnızca cmd üretilir', () => {
    expect(planItems([], base).map((entry) => entry.kind)).toEqual(['master']);
  });

  it('komutu olmayan grup (normalizasyonda elenir) düğme üretmez', () => {
    const plan = planItems(groups, { ...base, hiddenGroups: ['Python', 'Flutter', 'Node.js'] });
    expect(plan.map((entry) => entry.id)).toEqual([MASTER_ID]);
  });
});