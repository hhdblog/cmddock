import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CATALOG_ENTRIES } from '../../src/icons';
import { normalizeGroups } from '../../src/normalize';
import { parseIcon } from '../../src/style';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

function readJson(relative: string): unknown {
  return JSON.parse(readFileSync(resolve(root, relative), 'utf8'));
}

const library = readJson('src/library.json') as {
  defaults: string[];
  groups: { name: string }[];
};
const manifest = readJson('package.json') as {
  contributes: { configurationDefaults: Record<string, unknown> };
};

const defaults = manifest.contributes.configurationDefaults['cmdDeck.groups'];

/** Kütüphanedeki varsayılan işaretli gruplar — manifestin kaynağı. */
const examples = library.defaults.map(
  (name) => library.groups.find((group) => group.name === name)
);
const groups = normalizeGroups(examples);
const catalogNames = new Set(CATALOG_ENTRIES.map((entry) => entry.name));

describe('varsayılan komut listesi', () => {
  it('kütüphane ve package.json aynı listeyi üretiyor', () => {
    // İki kaynak ayrı ayrı düzenlenirse manifest bayat kalıyordu; artık
    // library.json tek kaynak, sync-defaults bunu package.json'a yazıyor.
    expect(examples.every((group) => group !== undefined)).toBe(true);
    // summary yalnızca kütüphane seçicisinde kullanılıyor, manifestte olmamalı.
    const stripped = examples.map(({ summary: _summary, ...rest }) => rest);
    expect(defaults).toEqual(stripped);
  });

  it('manifest summary alanı taşımıyor', () => {
    // summary yalnızca kütüphane seçicisi için; Settings arayüzünde
    // anlamsız bir alan olarak görünürdü.
    for (const group of defaults as Record<string, unknown>[]) {
      expect(group).not.toHaveProperty('summary');
    }
  });

  it('5 grup içerir', () => {
    expect(groups.map((group) => group.name)).toEqual([
      'Python',
      'Flutter',
      'Node.js',
      'Git',
      'Firebase',
    ]);
  });

  it('her grupta 10-15 komut var', () => {
    for (const group of groups) {
      expect(group.commands.length, group.name).toBeGreaterThanOrEqual(10);
      expect(group.commands.length, group.name).toBeLessThanOrEqual(15);
    }
  });

  it('toplam komut sayısı', () => {
    expect(groups.reduce((sum, group) => sum + group.commands.length, 0)).toBe(61);
  });

  it('grup adları benzersiz', () => {
    const names = groups.map((group) => group.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('komut adları grup içinde benzersiz', () => {
    // Farklı gruplarda aynı adlar serbest (Python/Flutter/Node'da "test" gibi):
    // kullanım anahtarı grup + komut adından oluşuyor, çakışma olmuyor.
    for (const group of groups) {
      const names = group.commands.map((command) => command.name);
      expect(new Set(names).size, group.name).toBe(names.length);
    }
  });

  it('farklı gruplarda aynı ad kullanılabiliyor', () => {
    const names = new Set(groups.map((group) => group.name));
    const testers = groups
      .filter((group) => group.commands.some((command) => command.name === 'test'))
      .map((group) => group.name);

    expect(testers.length).toBeGreaterThan(1);
    expect(names.size).toBe(groups.length);
  });

  it('her komutun doğrulanmış bir ikonu var', () => {
    for (const group of groups) {
      expect(catalogNames.has(group.icon.slice(2, -1))).toBe(true);
      for (const command of group.commands) {
        expect(
          catalogNames.has(command.icon.slice(2, -1)),
          `${group.name} / ${command.name}: ${command.icon}`
        );
      }
    }
  });

  it('varsayılan grupların rengi geçerli hex', () => {
    for (const group of groups) {
      expect(group.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('git grubunda push/pull/reset onay ister', () => {
    const git = groups.find((group) => group.name === 'Git');
    const confirmed = git?.commands
      .filter((command) => command.confirm !== false)
      .map((command) => command.name);

    expect(confirmed).toEqual(
      expect.arrayContaining(['push', 'pull', "son commit'i geri al"])
    );
  });

  it('her grupta en az bir komut yıkıcı işaretli', () => {
    for (const group of groups) {
      expect(
        group.commands.some((command) => command.confirm !== false)
      ).toBe(true);
    }
  });

  it('platform belirteçleri korunur', () => {
    const commands = groups.flatMap((group) => group.commands).map((c) => c.command);
    expect(commands.some((command) => command.includes('{venvpy}'))).toBe(true);
    expect(commands.some((command) => command.includes('{rm}'))).toBe(true);
    expect(commands.some((command) => command.includes('{python}'))).toBe(true);
    expect(commands.some((command) => command.includes('{venv}'))).toBe(true);
  });

  it('POSIX ham yol kalmamış', () => {
    const commands = groups.flatMap((group) => group.commands).map((c) => c.command);
    for (const command of commands) {
      expect(command).not.toContain('.venv/bin');
      expect(command).not.toContain('rm -rf');
      expect(command).not.toContain('python3 ');
    }
  });

  it('ikonlar kodikon biçiminde', () => {
    for (const group of groups) {
      expect(parseIcon(group.icon)).toBe(group.icon);
      for (const command of group.commands) {
        expect(parseIcon(command.icon)).toBe(command.icon);
      }
    }
  });
});