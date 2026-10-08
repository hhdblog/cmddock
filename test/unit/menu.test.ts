import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MENU_ACTIONS, MENU_SEPARATOR } from '../../src/menu';
import { CATALOG_ENTRIES } from '../../src/icons';

const catalog = new Set(CATALOG_ENTRIES.map((entry) => entry.name));

const manifest = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../package.json', import.meta.url)), 'utf8')
) as {
  contributes: { commands: { command: string; title: string }[] };
};

describe('yardımcı menü', () => {
  it('komut kimlikleri benzersiz', () => {
    const ids = MENU_ACTIONS.map((action) => action.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('tanımlı komutların hepsini kapsar', () => {
    const ids = new Set(MENU_ACTIONS.map((action) => action.id));
    for (const id of [
      'cmd-deck.search',
      'cmd-deck.runLast',
      'cmd-deck.export',
      'cmd-deck.import',
      'cmd-deck.checkPlatform',
      'cmd-deck.iconCatalog',
      'cmd-deck.statusBarItems',
      'cmd-deck.reload',
    ]) {
      expect(ids.has(id)).toBe(true);
    }
  });

  /**
   * Etiketler iki yerde yaşıyor: menüde ve Komut Paleti'nde (package.json).
   * Biri değişip öteki değişmezse kullanıcı aynı işlemi iki farklı isimle görür.
   */
  it('etiketler Komut Paleti ile aynı', () => {
    const titles = new Map(
      manifest.contributes.commands.map((entry) => [entry.command, entry.title])
    );

    for (const action of MENU_ACTIONS) {
      expect(titles.get(action.id), action.id).toBe(action.label);
    }
  });

  it('her satırda etiket ve açıklama var', () => {
    for (const action of MENU_ACTIONS) {
      expect(action.label.length).toBeGreaterThan(0);
      expect(action.description.length).toBeGreaterThan(0);
    }
  });

  it('ikonlar katalogdaki doğrulanmış adlardan', () => {
    for (const action of MENU_ACTIONS) {
      const name = action.icon.replace(/^\$\(|\)$/g, '');
      expect(catalog.has(name), `${action.id}: ${action.icon}`).toBe(true);
    }
  });

  it('ayraç etiketi boş değil', () => {
    expect(MENU_SEPARATOR.length).toBeGreaterThan(0);
  });
});
