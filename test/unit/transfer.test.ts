import { describe, expect, it } from 'vitest';
import { normalizeGroups } from '../../src/normalize';
import {
  mergeGroups,
  parseFailureReason,
  parseGroups,
  planImport,
  removedInGroup,
  serializeGroups,
  serializeJson,
  slimGroups,
} from '../../src/transfer';

const current = normalizeGroups([
  {
    name: 'A',
    commands: [
      { name: 'bir', command: 'ls' },
      { name: 'iki', command: 'pwd' },
    ],
  },
  { name: 'B', commands: [{ name: 'tek', command: 'id' }] },
]);

const incoming = normalizeGroups([
  {
    name: 'A',
    commands: [
      { name: 'bir', command: 'ls -la' },
      { name: 'üç', command: 'whoami' },
    ],
  },
  { name: 'C', commands: [{ name: 'yeni', command: 'date' }] },
]);

describe('serializeGroups', () => {
  it('parseGroups ile geri dönüş sağlar', () => {
    const text = serializeGroups(current);
    expect(parseGroups(text)).toEqual(current);
  });

  it('okunabilir biçimlendirir', () => {
    expect(serializeGroups(current).split('\n')[1]).toMatch(/^\s{2}\{?/);
  });

  it('platform belirteçlerini korur', () => {
    const withToken = normalizeGroups([
      { name: 'P', commands: [{ name: 'x', command: '{venv}pip list' }] },
    ]);
    expect(parseGroups(serializeGroups(withToken))?.[0].commands[0].command).toBe(
      '{venv}pip list'
    );
  });
});

describe('parseGroups', () => {
  it('geçersiz JSON için undefined döner', () => {
    expect(parseGroups('{bozuk')).toBeUndefined();
    expect(parseGroups('')).toBeUndefined();
  });

  it('JSON olsa da geçersiz şekilde undefined döner', () => {
    expect(parseGroups('"metin"')).toBeUndefined();
    expect(parseGroups('42')).toBeUndefined();
    expect(parseGroups('[{"name":"A"}]')).toBeUndefined();
    expect(parseGroups('[]')).toBeUndefined();
  });

  it('geçerli listeyi kabul eder', () => {
    expect(parseGroups(serializeGroups(current))).toHaveLength(2);
  });

  it('geçersiz komutları atar, geçerli olanları korur', () => {
    const parsed = parseGroups(
      JSON.stringify([
        { name: 'A', commands: [{ name: 'iyi', command: 'ls' }, { name: 'kotu' }] },
      ])
    );
    expect(parsed?.[0].commands).toHaveLength(1);
  });
});

describe('parseGroups — JSONC yorumları', () => {
  // Kılavuz ve README yorumu vaat ediyordu; dosya katmanı reddediyordu.
  // Kullanıcı yorum yazıp dosyayı uyguladığında tüm komutları sessizce
  // kaybediyordu ve hata mesajı yorumun sebebini ele vermiyordu.

  const COMMENTED = `[
  // sık kullandıklarım
  {
    "name": "Git",
    "icon": "$(source-control)",
    "color": "#F14E32", // kırmızı
    "commands": [
      /* günlük işler */
      { "name": "status", "command": "git status" }
    ]
  }
]`;

  it('yorumlu dosyayı kabul eder', () => {
    const groups = parseGroups(COMMENTED);
    expect(groups).toHaveLength(1);
    expect(groups?.[0].name).toBe('Git');
  });

  it('yorumlu dosya yorumsuzla aynı komutları verir', () => {
    const commented = parseGroups(COMMENTED);
    const plain = parseGroups(
      '[{"name":"Git","icon":"$(source-control)","color":"#F14E32","commands":[{"name":"status","command":"git status"}]}]'
    );
    expect(commented).toEqual(plain);
  });

  it('yorum komut metnindeyse dokunulmaz', () => {
    const groups = parseGroups(
      '[{"name":"G","commands":[{"name":"x","command":"git commit -m \'// sabit\'"}]}]'
    );
    expect(groups?.[0].commands[0].command).toBe("git commit -m '// sabit'");
  });

  it('yorumlu ama bozuk dosya sessizce geçmez', () => {
    expect(parseGroups('// not\n[{')).toBeUndefined();
  });

  it('yorumlu dosyanın hatası yorumu suçlamaz', () => {
    // Gerçek sorun eksik parantez; "JSON bozuk" demek doğru, "yorum geçersiz"
    // demek yanlış olurdu.
    expect(parseFailureReason('// not\n[{')).toBe(
      'The JSON may be broken — a quote, a comma or a curly brace is missing.'
    );
  });

  it('yorumlu dosya boş listede ayırt edilir', () => {
    expect(parseFailureReason('// not\n[]')).toContain('No group left');
  });

  it('yorumlu dosyada eksik alan yine ayırt edilir', () => {
    expect(parseFailureReason('// not\n[{"name":"G","commands":[]}]')).toContain(
      'are empty'
    );
  });
});

describe('mergeGroups', () => {
  it('aynı isimli komutu günceller', () => {
    const merged = mergeGroups(current, incoming);
    const a = merged.find((group) => group.name === 'A');

    expect(a?.commands.find((command) => command.name === 'bir')?.command).toBe('ls -la');
  });

  it('yeni komutu ekler', () => {
    const merged = mergeGroups(current, incoming);
    const names = merged.find((group) => group.name === 'A')?.commands.map((c) => c.name);

    expect(names).toEqual(['bir', 'iki', 'üç']);
  });

  it('yeni grubu sona ekler', () => {
    const merged = mergeGroups(current, incoming);
    expect(merged.map((group) => group.name)).toEqual(['A', 'B', 'C']);
  });

  it('dokunulmayan grubu olduğu gibi bırakır', () => {
    const merged = mergeGroups(current, incoming);
    const b = merged.find((group) => group.name === 'B');
    expect(b?.commands.map((c) => c.name)).toEqual(['tek']);
  });

  it('orijinal listeleri değiştirmez', () => {
    mergeGroups(current, incoming);
    expect(current[0].commands.map((c) => c.name)).toEqual(['bir', 'iki']);
  });

  it('gelen listede olmayan komutu birleştirmede silmez', () => {
    const merged = mergeGroups(current, incoming);
    const a = merged.find((group) => group.name === 'A');
    expect(a?.commands.map((c) => c.name)).toContain('iki');
  });
});

describe('removedInGroup', () => {
  it('gelende olmayan komutları bulur', () => {
    const removed = removedInGroup(current[0], incoming[0]);
    expect(removed.map((c) => c.name)).toEqual(['iki']);
  });
});

describe('planImport', () => {
  it('replace modunda listeyi tamamen değiştirir', () => {
    const plan = planImport(current, incoming, 'replace');

    expect(plan.result.map((group) => group.name)).toEqual(['A', 'C']);
    expect(
      plan.result.find((g) => g.name === 'A')?.commands.map((c) => c.name)
    ).toEqual(['bir', 'üç']);
  });

  it('merge modunda mevcut listeyi genişletir', () => {
    const plan = planImport(current, incoming, 'merge');
    expect(plan.result.map((group) => group.name)).toEqual(['A', 'B', 'C']);
  });

  it('özet yeni ve silinecek komutları bildirir', () => {
    const plan = planImport(current, incoming, 'replace');
    const a = plan.summary.find((line) => line.startsWith('• A'));

    expect(a).toContain('new');
    expect(a).toContain('to update');
    expect(a).toContain('to delete');
    expect(plan.summary.join('\n')).toContain('Total:');
  });

  it('merge modunda silinecek bildirmez', () => {
    const plan = planImport(current, incoming, 'merge');
    const a = plan.summary.find((line) => line.startsWith('• A'));

    expect(a).not.toContain('to delete');
    expect(a).toContain('new');
  });

  it('mevcut liste boşken özet yeni liste der', () => {
    const plan = planImport([], incoming, 'replace');
    expect(plan.summary.join('\n')).toContain('new list');
  });

  it('yeni grubu özette ayrı satır olarak gösterir', () => {
    const plan = planImport(current, incoming, 'merge');
    expect(plan.summary).toContain('• C: new group, 1 commands');
  });
});
describe('slimGroups', () => {
  const raw = [
    {
      name: 'Git',
      icon: '$(source-control)',
      color: '#F14E32',
      commands: [
        { name: 'durum', command: 'git status', description: 'çalışma ağacı' },
        { name: 'push', command: 'git push', confirm: 'Emin misin?' },
        { name: 'temizle', command: 'rm -rf x', clear: true },
        { name: 'klonla', command: 'git clone', argsPrompt: 'adres' },
        { name: 'yoksay', command: 'git fetch', icon: '$(sync)' },
      ],
    },
    { name: 'Düz', commands: [{ name: 'a', command: 'echo a' }] },
  ];

  const normalized = normalizeGroups(raw);
  const slim = slimGroups(normalized);

  it('varsayılan alanları ayıklar', () => {
    expect(Object.keys(slim[0].commands[0]).sort()).toEqual(['command', 'description', 'name']);
  });

  it('varsayılan ikonu yazmaz', () => {
    expect(slim[1].icon).toBeUndefined();
    expect(slim[1].commands[0].icon).toBeUndefined();
  });

  it('özel ikonu korur', () => {
    expect(slim[0].icon).toBe('$(source-control)');
    expect(slim[0].commands[4].icon).toBe('$(sync)');
  });

  it('grup rengini korur', () => {
    expect(slim[0].color).toBe('#F14E32');
  });

  it('confirm metnini korur', () => {
    expect(slim[0].commands[1].confirm).toBe('Emin misin?');
  });

  it('confirm false ve clear false yazılmaz', () => {
    expect('confirm' in slim[0].commands[0]).toBe(false);
    expect('clear' in slim[0].commands[0]).toBe(false);
  });

  it('clear true ve argsPrompt korunur', () => {
    expect(slim[0].commands[2].clear).toBe(true);
    expect(slim[0].commands[3].argsPrompt).toBe('adres');
  });

  it('hiçbir yerde "confirm": false kalmaz', () => {
    expect(serializeJson(slim)).not.toContain('"confirm": false');
  });

  /**
   * En önemli değişmez: ayıklama yalnızca görünümü etkiler, davranışı değil.
   * Okurken normalizeGroups geri doldurduğu için iki hâl de aynı listeye çevrilmeli.
   */
  it('normalize edilmiş hâle geri döndüğünde aynı komutları verir', () => {
    expect(normalizeGroups(slim)).toEqual(normalized);
  });

  it('serileştirilmiş çıktı normalize edilmiş hâlden kısadır', () => {
    expect(serializeJson(slim).length).toBeLessThan(serializeJson(normalized).length);
  });
});

describe('gruba ait görünüm (ikon/renk) birleştirmede', () => {
  const withLook = (icon: string, color?: string) => [
    {
      name: 'Git',
      icon,
      color,
      commands: [{ name: 'durum', command: 'git status' }],
    },
  ];

  it('değişen ikonu uygular', () => {
    const merged = mergeGroups(
      normalizeGroups(withLook('$(source-control)', '#F14E32')),
      normalizeGroups(withLook('$(git-branch)', '#F14E32'))
    );
    expect(merged[0].icon).toBe('$(git-branch)');
  });

  it('değişen rengi uygular', () => {
    const merged = mergeGroups(
      normalizeGroups(withLook('$(source-control)', '#F14E32')),
      normalizeGroups(withLook('$(source-control)', '#00FF00'))
    );
    expect(merged[0].color).toBe('#00FF00');
  });

  it('dosyadan renk kaldırıldıysa kaldırır', () => {
    const merged = mergeGroups(
      normalizeGroups(withLook('$(source-control)', '#F14E32')),
      normalizeGroups(withLook('$(source-control)'))
    );
    expect(merged[0].color).toBeUndefined();
  });

  it('komutlar aynıysa da görünümü günceller', () => {
    const merged = mergeGroups(
      normalizeGroups(withLook('$(source-control)')),
      normalizeGroups(withLook('$(rocket)'))
    );
    expect(merged[0].icon).toBe('$(rocket)');
    expect(merged[0].commands).toHaveLength(1);
  });

  it('aynı görünümde özet değişiklik bildirmez', () => {
    const plan = planImport(
      normalizeGroups(withLook('$(source-control)', '#111111')),
      normalizeGroups(withLook('$(source-control)', '#111111')),
      'merge'
    );
    expect(plan.summary.join(' ')).not.toContain('icon/colour');
  });

  it('görünüm değiştiğinde özette belirtir', () => {
    const plan = planImport(
      normalizeGroups(withLook('$(source-control)', '#111111')),
      normalizeGroups(withLook('$(rocket)', '#222222')),
      'merge'
    );
    expect(plan.summary.join(' ')).toContain('icon/colour changed');
  });
});

describe('özet, silinen grupları da bildirir', () => {
  const group = (name: string, commands = 3) =>
    normalizeGroups([
      {
        name,
        commands: Array.from({ length: commands }, (_, i) => ({ name: `k${i}`, command: 'x' })),
      },
    ]);

  it('sonuçta olmayan grup görünür', () => {
    const plan = planImport([...group('Python'), ...group('Node.js', 12)], group('Python'), 'replace');

    expect(plan.summary.join('\n')).toContain('Node.js: GROUP WILL BE DELETED');
  });

  it('kaç komutla birlikte kaybolduğunu söyler', () => {
    const plan = planImport(group('Python'), group('Node.js', 12), 'replace');

    expect(plan.summary.join('\n')).toContain('12 commands');
  });

  it('kaç grup silindiğini ve geri alınamaz olduğunu söyler', () => {
    const current = [...group('Python'), ...group('Docker', 9), ...group('Go', 10)];
    const plan = planImport(current, group('Python'), 'replace');

    expect(plan.summary.join('\n')).toContain('2 groups will be deleted entirely');
    expect(plan.summary.join('\n')).toContain('cannot be undone');
  });

  it('grup kalıyorsa uyarı vermez', () => {
    const current = [...group('Python'), ...group('Docker', 9)];
    const plan = planImport(current, current, 'replace');

    expect(plan.summary.join('\n')).not.toContain('GROUP WILL BE DELETED');
    expect(plan.summary.join('\n')).not.toContain('cannot be undone');
  });

  it('merge modunda grup silinmez, uyarı da çıkmaz', () => {
    const current = [...group('Python'), ...group('Docker', 9)];
    const plan = planImport(current, group('Python'), 'merge');

    expect(plan.result.map((g) => g.name)).toContain('Docker');
    expect(plan.summary.join('\n')).not.toContain('GROUP WILL BE DELETED');
  });

  it('silme uyarısı toplam satırından önce gelir', () => {
    const plan = planImport([...group('Python'), ...group('Docker', 9)], group('Python'), 'replace');
    const lines = plan.summary;

    const warning = lines.findIndex((line) => line.includes('cannot be undone'));
    const total = lines.findIndex((line) => line.startsWith('Total:'));

    expect(warning).toBeGreaterThanOrEqual(0);
    expect(warning).toBeLessThan(total);
  });
});

describe('parseFailureReason', () => {
  it('bozuk JSON için sözdizimi derdini söyler', () => {
    expect(parseFailureReason('{ not json')).toContain('broken');
  });

  it('dizi olmayan içerikte biçim bekliyor', () => {
    expect(parseFailureReason('"text"')).toContain('square bracket');
  });

  it('boş listede sonucun nedenini söyler', () => {
    const reason = parseFailureReason('[]');
    expect(reason).toContain('No group left');
    expect(reason).toContain('At least one group');
  });

  it('eksik alanlarda hangi alanların gerekli olduğunu söyler', () => {
    expect(parseFailureReason('[{"name":"A"}]')).toContain('"commands"');
  });

  it('geçerli listede hata vermez', () => {
    expect(parseFailureReason('[{"name":"A","commands":[{"name":"a","command":"b"}]}]')).toBeUndefined();
  });
});

describe('komutsuz grup', () => {
  it('ayarlarda sessizce düşer', () => {
    const normalized = normalizeGroups([
      { name: 'A', commands: [{ name: 'a', command: 'b' }] },
      { name: 'Bos', commands: [] },
    ]);

    expect(normalized.map((g) => g.name)).toEqual(['A']);
  });

  it('tek başına komutsuz gruptan mesaj "are empty" der, "required" değil', () => {
    const reason = parseFailureReason('[{"name":"X","commands":[]}]');

    expect(reason).toContain('are empty');
    expect(reason).not.toContain('needs "name"');
  });

  it('karışık listede komutsuz grup mesajı bozmaz', () => {
    const text = JSON.stringify([
      { name: 'A', commands: [{ name: 'a', command: 'b' }] },
      { name: 'Bos', commands: [] },
    ]);

    expect(parseGroups(text)).toHaveLength(1);
  });
});
