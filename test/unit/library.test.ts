import { describe, expect, it } from 'vitest';
import { LIBRARY_GROUPS, LibraryGroup, normalizeLibrary } from '../../src/library';
import { CATALOG_ENTRIES } from '../../src/icons';
import { normalizeGroups } from '../../src/normalize';

const catalog = new Set(CATALOG_ENTRIES.map((entry) => entry.name));

function iconName(value: string): string {
  return value.replace(/^\$\(/, '').replace(/\)$/, '');
}

/** Kütüphane elle yazıldığı için iç bütünlüğünü otomatik denetliyoruz. */
describe('hazır grup kütüphanesi', () => {
  it('on grup var', () => {
    expect(LIBRARY_GROUPS).toHaveLength(10);
  });

  it('grup adları benzersiz', () => {
    const names = LIBRARY_GROUPS.map((group) => group.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('hiçbir grup adı varsayılanlarla çakışmıyor', () => {
    // Çakışırsa "Hazır Grup Ekle" kullanıcının grubunu ezmek zorunda kalırdı.
    const defaults = ['Python', 'Flutter', 'Node.js', 'Git', 'Firebase'];
    for (const group of LIBRARY_GROUPS) {
      expect(defaults).not.toContain(group.name);
    }
  });

  it('her grubun ikonu katalogda', () => {
    for (const group of LIBRARY_GROUPS) {
      expect(catalog.has(iconName(group.icon)), `${group.name}: ${group.icon}`).toBe(true);
    }
  });

  it('her komutun ikonu katalogda', () => {
    for (const group of LIBRARY_GROUPS) {
      for (const command of group.commands) {
        const icon = command.icon ?? '$(terminal)';
        expect(catalog.has(iconName(icon)), `${group.name}/${command.name}: ${icon}`).toBe(true);
      }
    }
  });

  it('her komutun açıklaması var', () => {
    for (const group of LIBRARY_GROUPS) {
      for (const command of group.commands) {
        expect(command.description, `${group.name}/${command.name}`).toBeTruthy();
      }
    }
  });

  it('gruplar 5–15 komut arasında', () => {
    for (const group of LIBRARY_GROUPS) {
      expect(group.commands.length, group.name).toBeGreaterThanOrEqual(5);
      expect(group.commands.length, group.name).toBeLessThanOrEqual(15);
    }
  });

  it('grup içi komut adları benzersiz', () => {
    for (const group of LIBRARY_GROUPS) {
      const names = group.commands.map((command) => command.name);
      expect(new Set(names).size, group.name).toBe(names.length);
    }
  });

  it('her grubun rengi 6 haneli hex', () => {
    for (const group of LIBRARY_GROUPS) {
      expect(group.color, group.name).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('argsPrompt isteyen komutlar ne sorulacağını anlatır', () => {
    for (const group of LIBRARY_GROUPS) {
      for (const command of group.commands) {
        if (command.argsPrompt) {
          const prompt = command.argsPrompt.trim();
          expect(prompt.length, `${group.name}/${command.name}`).toBeGreaterThanOrEqual(5);
        }
      }
    }
  });

  /**
   * Yıkıcı komutların `confirm` olmaması en pahalı hatadır: kullanıcı bir
   * tıkla imajları, verileri ya da hedefleri siler.
   */
  it('yıkıcı komutlar onay istiyor', () => {
    // Geniş bir regex yerine açık liste: `mvn clean install` yıkıcı değil ama
    // `cargo clean` öyle, kelimeye bakarak karar vermek yanıltıcı.
    const destructive = [
      'docker system prune',
      'docker compose down -v',
      'redis-cli flushall',
      'adb uninstall',
      'kubectl delete',
      'cargo clean',
      'go clean -cache',
      'gh release create',
      'vercel --prod',
    ];

    for (const group of LIBRARY_GROUPS) {
      for (const command of group.commands) {
        if (destructive.some((needle) => command.command.startsWith(needle))) {
          expect(command.confirm, `${group.name}/${command.name}: ${command.command}`).toBeTruthy();
        }
      }
    }
  });

  it('onay metni geri alınamaz olduğunda uyarıyor', () => {
    const dangerous = /flushall|prune -a|uninstall/;

    for (const group of LIBRARY_GROUPS) {
      for (const command of group.commands) {
        if (dangerous.test(command.command)) {
          expect(command.confirm, command.command).toMatch(/geri alınamaz|alınamaz|silinecek/);
        }
      }
    }
  });

  it('uzun süreli komutlar Ctrl+C ile durulacağını söylüyor', () => {
    // `psql -l` çıkar ve kapanır, `psql -U postgres` kabuktur; geniş bir regex
    // ikisini ayırt edemiyor, açık liste ediyor.
    const longRunning = [
      'psql -U postgres',
      'adb shell',
      'adb logcat',
      'redis-cli monitor',
      'vercel dev',
      'vercel logs',
      'cargo run',
    ];

    for (const group of LIBRARY_GROUPS) {
      for (const command of group.commands) {
        if (longRunning.some((needle) => command.command.startsWith(needle))) {
          expect(command.description, `${group.name}/${command.name}`).toMatch(/Ctrl\+C/);
        }
      }
    }
  });

  it('kütüphane doğrudan cmdDeck.groups biçimine çevrilebiliyor', () => {
    const converted = normalizeGroups(
      LIBRARY_GROUPS.map((group) => ({
        name: group.name,
        icon: group.icon,
        color: group.color,
        commands: group.commands,
      }))
    );

    expect(converted).toHaveLength(LIBRARY_GROUPS.length);
    for (const group of LIBRARY_GROUPS) {
      const target = converted.find((candidate) => candidate.name === group.name);
      expect(target, group.name).toBeDefined();
      expect(target?.commands).toHaveLength(group.commands.length);
    }
  });
});

describe('normalizeLibrary', () => {
  const good: LibraryGroup = {
    name: 'G',
    icon: '$(terminal)',
    summary: 's',
    commands: [{ name: 'a', command: 'echo' }],
  };

  it('geçerlisteyi olduğu gibi geçirir', () => {
    expect(normalizeLibrary([{ name: 'G', summary: 's', commands: [{ name: 'a', command: 'echo' }] }])).toHaveLength(1);
  });

  it('dizi değilse boş döner', () => {
    expect(normalizeLibrary('metin')).toEqual([]);
    expect(normalizeLibrary(undefined)).toEqual([]);
  });

  it('özeti olmayan grubu düşürür', () => {
    expect(normalizeLibrary([{ name: 'G', commands: [{ name: 'a', command: 'echo' }] }])).toEqual([]);
  });

  it('komutu olmayan grubu düşürür', () => {
    expect(normalizeLibrary([{ name: 'G', summary: 's', commands: [] }])).toEqual([]);
  });

  it('command boş komutu düşürür', () => {
    const result = normalizeLibrary([
      { name: 'G', summary: 's', commands: [{ name: 'a', command: 'echo' }, { name: 'b', command: '' }] },
    ]);
    expect(result[0].commands).toHaveLength(1);
  });

  it('normalize edilmemiş girdiyi de tamamlar', () => {
    const result = normalizeLibrary([
      { name: 'G', summary: 's', commands: [{ name: 'a', command: 'rm -rf x' }] },
    ]);
    expect(result[0].icon).toBe('$(terminal)');
    expect(result[0].color).toBeUndefined();
  });

  it('confirm: true ise metne çevrilir', () => {
    const result = normalizeLibrary([
      { name: 'G', summary: 's', commands: [{ name: 'a', command: 'rm -rf x', confirm: true }] },
    ]);
    expect(result[0].commands[0].confirm).toBe("'rm -rf x' çalıştırılsın mı?");
  });

  it('geçerli referans testte kullanılıyor', () => {
    expect(good.commands).toHaveLength(1);
  });
});