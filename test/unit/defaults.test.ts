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

const examples = readJson('examples/default-groups.json');
const manifest = readJson('package.json') as {
  contributes: { configurationDefaults: Record<string, unknown> };
};

const defaults = manifest.contributes.configurationDefaults['cmdDeck.groups'];
const groups = normalizeGroups(examples);
const catalogNames = new Set(CATALOG_ENTRIES.map((entry) => entry.name));

describe('varsayılan komut listesi', () => {
  it('examples ve package.json aynı listeyi içerir', () => {
    // Ayrı ayrı elle düzenlenirse iki yer birbirinden kopuyordu.
    expect(defaults).toEqual(examples);
  });

  it('3 grup ve 36 komut içerir', () => {
    expect(groups.map((group) => group.name)).toEqual(['Python', 'Flutter', 'Node.js']);
    expect(groups.every((group) => group.commands.length === 12)).toBe(true);
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