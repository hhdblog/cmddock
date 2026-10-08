import { describe, expect, it } from 'vitest';
import { MENU_ACTIONS, MENU_SEPARATOR } from '../../src/menu';
import { CATALOG_ENTRIES } from '../../src/icons';

const catalog = new Set(CATALOG_ENTRIES.map((entry) => entry.name));

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
      'cmd-deck.reload',
    ]) {
      expect(ids.has(id)).toBe(true);
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
