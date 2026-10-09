/**
 * Cmd düğmesinin altındaki yardımcı menü — grup listesinden sonra gelir.
 * Buradaki `id` doğrudan kayıtlı komut kimliğidir; seçilince doğrudan çalıştırılır.
 *
 * Sıra **kullanım sıklığına göre**, bölümler de aynı mantıkla: günlük iki komut
 * en üstte, listeyi düzenleme ortada, nadir kullanılanlar en altta. Sekiz satır
 * varken sıra okunmaz hale geliyordu — en çok kullanılan iki komut listenin
 * ortasına gömülüydü.
 */

export type MenuSection = 'run' | 'edit' | 'view' | 'help';

export interface MenuAction {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly icon: string;
  /** Menüde hangi başlığın altında görüneceği. */
  readonly section: MenuSection;
}

/** Grup listesinden yardımcı menüye geçişi işaretleyen ayraç. */
export const MENU_SEPARATOR = '—— commands and tools ——';

/** Bölüm başlığını veren ayraç etiketleri. */
export const MENU_SECTION_LABELS: Readonly<Record<MenuSection, string>> = {
  run: 'commands',
  edit: 'edit the list',
  view: 'view',
  help: 'check and help',
};

/** Bölümlerin görüneceği sıra. */
export const MENU_SECTIONS: readonly MenuSection[] = ['run', 'edit', 'view', 'help'];

export const MENU_ACTIONS: readonly MenuAction[] = [
  {
    id: 'cmdkit.search',
    label: 'Search All Commands',
    description: 'flattens every group — search by typing',
    icon: '$(search)',
    section: 'run',
  },
  {
    id: 'cmdkit.runLast',
    label: 'Run Last Command Again',
    description: 're-runs the last command you ran',
    icon: '$(debug-rerun)',
    section: 'run',
  },
  {
    id: 'cmdkit.export',
    label: 'Edit Command List',
    description: 'opens the command file for editing',
    icon: '$(json)',
    section: 'edit',
  },
  {
    id: 'cmdkit.import',
    label: 'Apply Command File',
    description: 'summarises the file, then writes it to settings',
    icon: '$(sync)',
    section: 'edit',
  },
  {
    id: 'cmdkit.addGroup',
    label: 'Add Built-in Group',
    description: 'adds a group from the built-in library',
    icon: '$(new-folder)',
    section: 'edit',
  },
  {
    id: 'cmdkit.removeGroup',
    label: 'Remove Group',
    description: 'removes a group and all its commands',
    icon: '$(trash)',
    section: 'edit',
  },
  {
    id: 'cmdkit.reload',
    label: 'Reload File From Settings',
    description: 'overwrites the file with the list from settings',
    icon: '$(refresh)',
    section: 'edit',
  },
  {
    id: 'cmdkit.statusBarItems',
    label: 'Choose Status Bar Items',
    description: 'choose which groups appear in the bar',
    icon: '$(list-selection)',
    section: 'view',
  },
  {
    id: 'cmdkit.iconCatalog',
    label: 'Icon Catalog',
    description: 'browse the available codicons',
    icon: '$(paintcan)',
    section: 'view',
  },
  {
    id: 'cmdkit.checkPlatform',
    label: 'Check Platform Compatibility',
    description: 'rewrite macOS/Linux paths for Windows',
    icon: '$(check)',
    section: 'help',
  },
  {
    id: 'cmdkit.usage',
    label: 'How to Use the Command File',
    description: 'file format, fields, apply modes',
    icon: '$(markdown)',
    section: 'help',
  },
];

/**
 * Menünün çizim satırı. `type` ayraç mı kalem mi ayırt ediyor; her iki üyede de
 * bulunduğu için TypeScript daraltmayı doğru yapabiliyor.
 */
export type MenuRow =
  | { readonly type: 'separator'; readonly label: string }
  | { readonly type: 'action'; readonly action: MenuAction };

/**
 * Menüyü çizim sırasına çevirir: her bölüm için başlık ayracı, sonra o bölümün
 * kalemleri. Bölüm sırası `MENU_SECTIONS`, iç sıra tanım yazım sırasıdır.
 * `picker.ts` bu satırları QuickPick öğelerine çeviriyor.
 */
export function menuRows(): MenuRow[] {
  const rows: MenuRow[] = [];

  for (const section of MENU_SECTIONS) {
    const actions = MENU_ACTIONS.filter((action) => action.section === section);
    if (actions.length === 0) {
      continue;
    }
    rows.push({ type: 'separator', label: `—— ${MENU_SECTION_LABELS[section]} ——` });
    for (const action of actions) {
      rows.push({ type: 'action', action });
    }
  }

  return rows;
}