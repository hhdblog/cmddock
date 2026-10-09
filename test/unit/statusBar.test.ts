import { beforeEach, describe, expect, it } from 'vitest';
import {
  MarkdownString,
  MemoryMemento,
  resetConfiguration,
  resetStatusBarItems,
  setConfiguration,
  StatusBarItem,
  statusBarItems,
} from '../stubs/vscode';
import { createStatusBar } from '../../src/statusBar';

interface FakeContext {
  readonly subscriptions: { dispose(): void }[];
  readonly workspaceState: MemoryMemento;
  readonly globalState: MemoryMemento;
}

function createContext(): FakeContext {
  return { subscriptions: [], workspaceState: new MemoryMemento(), globalState: new MemoryMemento() };
}

function activate(context: FakeContext) {
  return createStatusBar(context as never);
}

function tooltipOf(item: StatusBarItem): string {
  return (item.tooltip as { value: string }).value;
}

function masterOf(handle: { items: readonly StatusBarItem[] }): StatusBarItem {
  return handle.items[0];
}

const PYTHON = {
  name: 'Python',
  icon: '$(snake)',
  color: '#4B8BBE',
  commands: [
    { name: 'test', command: 'pytest' },
    { name: 'lint', command: 'ruff check .' },
  ],
};

const FLUTTER = {
  name: 'Flutter',
  icon: '$(device-mobile)',
  commands: [{ name: 'pub get', command: 'flutter pub get' }],
};

describe('statusBar', () => {
  let context: FakeContext;

  beforeEach(() => {
    resetStatusBarItems();
    resetConfiguration();
    context = createContext();
  });

  describe('master tooltip', () => {
    beforeEach(() => {
      setConfiguration('cmddock', { groups: [PYTHON] });
      setConfiguration('cmddock.statusBar', {});
    });

    it('henüz komut çalıştırılmadıysa bunu yazar', () => {
      const handle = activate(context);

      expect(tooltipOf(masterOf(handle))).toContain('Last: nothing has been run yet');
    });

    it('son komut ayarlardaysa grup › komut biçiminde yazar', () => {
      context.workspaceState.update('cmddock.last', { group: 'Python', name: 'test' });
      const handle = activate(context);

      expect(tooltipOf(masterOf(handle))).toContain('Last: Python › test');
    });

    it('son komut ayarlardan silinmişse "null" yazmaz', () => {
      context.workspaceState.update('cmddock.last', { group: 'Python', name: 'eski-komut' });
      const handle = activate(context);

      const tooltip = tooltipOf(masterOf(handle));
      expect(tooltip).not.toContain('null');
      expect(tooltip).toContain('Last: no longer in your settings');
    });

    it('son komutun grubu silinmişse de "null" yazmaz', () => {
      context.workspaceState.update('cmddock.last', { group: 'Git', name: 'status' });
      const handle = activate(context);

      const tooltip = tooltipOf(masterOf(handle));
      expect(tooltip).not.toContain('null');
      expect(tooltip).toContain('Last: no longer in your settings');
    });

    it('grup ve komut sayısını yazar', () => {
      const handle = activate(context);

      expect(tooltipOf(masterOf(handle))).toContain('1 groups, 2 commands');
    });

    it('toplam çalıştırma sayısını yazar', () => {
      context.workspaceState.update('cmddock.usage', {
        ['Pythontest']: { count: 3, lastRun: 1 },
        ['Pythonlint']: { count: 2, lastRun: 1 },
      });
      const handle = activate(context);

      expect(tooltipOf(masterOf(handle))).toContain('5 runs');
    });

    it('gruplar boşken boş listede olduğunu söyler', () => {
      setConfiguration('cmddock', { groups: [] });
      const handle = activate(context);

      expect(tooltipOf(masterOf(handle))).toContain('"cmddock.groups" is empty');
    });

    it('gruplar boşken düğme metnine "!" ekler', () => {
      setConfiguration('cmddock', { groups: [] });
      const handle = activate(context);

      expect(masterOf(handle).text.endsWith('!')).toBe(true);
    });
  });

  describe('gizli başlatılan düğmeler', () => {
    beforeEach(() => {
      setConfiguration('cmddock', { groups: [PYTHON, FLUTTER, PYTHON, PYTHON] });
      // maxGroupItems 1: diğer gruplar oluşturulur ama gizli başlar.
      setConfiguration('cmddock.statusBar', { maxGroupItems: 1 });
    });

    it('sınırın ötesindeki düğmeleri yine de oluşturur', () => {
      const handle = activate(context);

      // master + 4 grup
      expect(handle.items).toHaveLength(5);
    });

    it('sınırın ötesindeki düğmeler gizli başlar', () => {
      const handle = activate(context);

      expect(handle.items.filter((item) => item.visible)).toHaveLength(2);
    });

    it('gizli düğmelere de metin yazar — sağ tıkla Show açınca boş görünmesin', () => {
      const handle = activate(context);
      const hidden = handle.items.filter((item) => !item.visible);

      expect(hidden).toHaveLength(3);
      for (const item of hidden) {
        expect(item.text).not.toBe('');
      }
    });

    it('gizli düğmelere de tooltip yazar', () => {
      const handle = activate(context);
      const hidden = handle.items.filter((item) => !item.visible);

      for (const item of hidden) {
        expect(tooltipOf(item)).toContain('Click for the commands in this group');
      }
    });

    it('gizli düğmenin grubu renkliyse rengi de yazılır', () => {
      const handle = activate(context);
      const hiddenPython = handle.items.find(
        (item) => item.id === 'cmddock.group.Python#3'
      );

      expect(hiddenPython?.color).toBe('#4B8BBE');
    });

    it('aynı grubun gizli düğmesi görünür düğmesiyle aynı metni taşır', () => {
      const handle = activate(context);
      const pythonTexts = handle.items
        .filter((item) => item.id.startsWith('cmddock.group.Python'))
        .map((item) => item.text);

      // Biri görünür, ikisi gizli — metin hepsinde aynı olmalı.
      expect(pythonTexts).toEqual(['$(snake)', '$(snake)', '$(snake)']);
    });
  });

  describe('hiddenGroups', () => {
    beforeEach(() => {
      setConfiguration('cmddock', { groups: [PYTHON, FLUTTER] });
      setConfiguration('cmddock.statusBar', { hiddenGroups: ['Python'] });
    });

    it('gizlenen grubun düğmesini hiç oluşturmaz', () => {
      const handle = activate(context);

      expect(handle.items.map((item) => item.id)).toEqual(['cmddock.cmd', 'cmddock.group.Flutter']);
    });

    it('gizlenen grup hiç oluşturulmadığı için "gizli düğme" sayısına girmez', () => {
      const handle = activate(context);

      expect(tooltipOf(masterOf(handle))).not.toContain('gizli');
    });

    it('sınırdan fazla kalan düğmeleri Cmd tooltip\'inde sayar', () => {
      setConfiguration('cmddock', { groups: [PYTHON, FLUTTER, PYTHON] });
      setConfiguration('cmddock.statusBar', { maxGroupItems: 1 });

      const handle = activate(context);

      expect(tooltipOf(masterOf(handle))).toContain('2 group buttons hidden');
    });
  });

  describe('yeniden kurulum', () => {
    beforeEach(() => {
      setConfiguration('cmddock', { groups: [PYTHON] });
      setConfiguration('cmddock.statusBar', {});
    });

    it('yapı değişmedikçe düğmeleri yeniden oluşturmaz', () => {
      const handle = activate(context);
      // statusBarItems her createStatusBarItem çağrısında büyür; yeniden kurulum
      // olsaydı sayı artardı.
      const created = statusBarItems.length;

      handle.refresh();
      handle.refresh();

      expect(statusBarItems.length).toBe(created);
    });

    it('kullanım sayacı artsa da düğmeleri yeniden oluşturmaz', () => {
      const handle = activate(context);
      const before = handle.items.length;

      context.workspaceState.update('cmddock.usage', { ['Pythontest']: { count: 9, lastRun: 1 } });
      handle.refresh();

      expect(handle.items).toHaveLength(before);
    });

    it('ayar değişimi yapıyı değiştiriyorsa düğmeleri yeniden oluşturur', () => {
      const handle = activate(context);

      setConfiguration('cmddock', { groups: [PYTHON, FLUTTER] });
      handle.refresh();

      expect(handle.items).toHaveLength(3);
    });

    it('yeniden kurarken eski düğmeleri dispose eder', () => {
      const handle = activate(context);
      const old = [...handle.items];

      setConfiguration('cmddock', { groups: [PYTHON, FLUTTER] });
      handle.refresh();

      for (const item of old) {
        expect(item.disposed).toBe(true);
      }
    });
  });

  describe('düğme bağlantıları', () => {
    beforeEach(() => {
      setConfiguration('cmddock', { groups: [PYTHON, FLUTTER] });
      setConfiguration('cmddock.statusBar', {});
    });

    it('master düğmesi tüm grupları açar', () => {
      const handle = activate(context);

      expect(masterOf(handle).command).toBe('cmddock.open');
    });

    it('grup düğmesi grup adını argüman olarak geçer', () => {
      const handle = activate(context);

      expect(handle.items[1].command).toEqual({
        command: 'cmddock.openGroup',
        title: 'Python commands',
        arguments: ['Python'],
      });
    });

    it('her düğmeye ayrı kimlik verir', () => {
      const handle = activate(context);

      const ids = handle.items.map((item) => item.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('her düğmenin sağ tık menüsünde görünecek adı vardır', () => {
      const handle = activate(context);

      expect(handle.items.map((item) => item.name)).toEqual([
        'CmdDock: All Groups',
        'CmdDock: Python',
        'CmdDock: Flutter',
      ]);
    });
  });

  describe('gruptaki en çok kullanılan komut', () => {
    beforeEach(() => {
      setConfiguration('cmddock', { groups: [PYTHON] });
      setConfiguration('cmddock.statusBar', {});
    });

    it('tooltip\'te kullanım sayısıyla birlikte yazar', () => {
      context.workspaceState.update('cmddock.usage', {
        ['Pythontest']: { count: 5, lastRun: 1 },
        ['Pythonlint']: { count: 2, lastRun: 1 },
      });
      const handle = activate(context);

      expect(tooltipOf(handle.items[1])).toContain('Most used: test (×5)');
    });

    it('hiç komut çalıştırılmadıysa bu satırı yazmaz', () => {
      const handle = activate(context);

      expect(tooltipOf(handle.items[1])).not.toContain('Most used');
    });
  });

  describe('görünürlük ayarları', () => {
    beforeEach(() => {
      setConfiguration('cmddock', { groups: [PYTHON, FLUTTER] });
    });

    it('showGroups false ise yalnızca master kalır', () => {
      setConfiguration('cmddock.statusBar', { showGroups: false });
      const handle = activate(context);

      expect(handle.items).toHaveLength(1);
    });

    it('showMaster false ise yalnızca grup düğmeleri kalır', () => {
      setConfiguration('cmddock.statusBar', { showMaster: false });
      const handle = activate(context);

      expect(handle.items).toHaveLength(2);
    });

    it('maxGroupItems 0 ise sınır uygulanmaz', () => {
      setConfiguration('cmddock.statusBar', { maxGroupItems: 0 });
      const handle = activate(context);

      expect(handle.items.every((item) => item.visible)).toBe(true);
    });
  });
});
describe('tooltip ikonları', () => {
  const PYTHON_GROUP = {
    name: 'Git',
    icon: '$(source-control)',
    color: '#F14E32',
    commands: [{ name: 'durum', command: 'git status' }],
  };

  it('tooltip kodikonları çizdirir', () => {
    setConfiguration('cmddock', { groups: [PYTHON_GROUP] });
    setConfiguration('cmddock.statusBar', { showMaster: false });

    const handle = activate(createContext());

    // MarkdownString.supportThemeIcons varsayılan false; açılmazsa tooltip'ta
    // "$(source-control)" ham metin olarak görünüyor.
    expect((handle.items[0].tooltip as MarkdownString).supportThemeIcons).toBe(true);
  });

  it('tooltip metninde ham ikon söz dizimi kalır (VSCode çizer)', () => {
    setConfiguration('cmddock', { groups: [PYTHON_GROUP] });
    setConfiguration('cmddock.statusBar', { showMaster: false });

    const handle = activate(createContext());

    expect(tooltipOf(handle.items[0])).toContain('$(source-control)');
  });

  it('master tooltip de kodikon çizdirir', () => {
    setConfiguration('cmddock', { groups: [PYTHON_GROUP] });

    const handle = activate(createContext());

    expect((handle.items[0].tooltip as MarkdownString).supportThemeIcons).toBe(true);
  });
});
