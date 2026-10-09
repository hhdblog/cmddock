import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MENU_ACTIONS, MENU_SECTIONS, MENU_SEPARATOR, menuRows } from '../../src/menu';
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
      'cmddock.search',
      'cmddock.runLast',
      'cmddock.export',
      'cmddock.import',
      'cmddock.checkPlatform',
      'cmddock.iconCatalog',
      'cmddock.statusBarItems',
      'cmddock.reload',
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

describe('menü bölümleri', () => {
  it('her bölüm başlığı ayracı olarak çizilir', () => {
    const separators = menuRows().filter((row) => row.type === 'separator');
    expect(separators).toHaveLength(MENU_SECTIONS.length);
  });

  it('her ayraçtan sonra o bölümün kalemleri gelir', () => {
    const rows = menuRows();
    const firstAction = rows.findIndex((row) => row.type === 'action');
    expect(rows[firstAction - 1]).toEqual({ type: 'separator', label: expect.any(String) });
  });

  it('her kalem tanımlı bir bölümde', () => {
    for (const action of MENU_ACTIONS) {
      expect(MENU_SECTIONS).toContain(action.section);
    }
  });

  it('hiçbir kalem iki bölümde birden görünmüyor', () => {
    const ids = menuRows().filter((row) => row.type === 'action').map((row) => row.action.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(MENU_ACTIONS.length);
  });

  it('en çok kullanılan komutlar üstte', () => {
    const first = MENU_ACTIONS.slice(0, 2).map((action) => action.id);
    expect(first).toEqual(['cmddock.search', 'cmddock.runLast']);
  });

  it('günlük komutlar aynı bölümde', () => {
    const [search, runLast] = MENU_ACTIONS;
    expect(search?.section).toBe('run');
    expect(runLast?.section).toBe('run');
  });

  it('düzenleme komutları bir arada', () => {
    const edit = MENU_ACTIONS.filter((action) => action.section === 'edit').map((a) => a.id);
    expect(edit).toContain('cmddock.export');
    expect(edit).toContain('cmddock.import');
    expect(edit).toContain('cmddock.addGroup');
  });

  it('ayraç etiketleri boş değil', () => {
    for (const row of menuRows()) {
      if (row.type === 'separator') {
        expect(row.label.length).toBeGreaterThan(0);
      }
    }
  });
});
