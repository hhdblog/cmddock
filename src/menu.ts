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
export const MENU_SEPARATOR = '—— komutlar ve araçlar ——';

/** Bölüm başlığını veren ayraç etiketleri. */
export const MENU_SECTION_LABELS: Readonly<Record<MenuSection, string>> = {
  run: 'komutlar',
  edit: 'listeyi düzenle',
  view: 'görünüm',
  help: 'denetle ve yardım',
};

/** Bölümlerin görüneceği sıra. */
export const MENU_SECTIONS: readonly MenuSection[] = ['run', 'edit', 'view', 'help'];

export const MENU_ACTIONS: readonly MenuAction[] = [
  {
    id: 'cmdkit.search',
    label: 'Tüm Komutlarda Ara',
    description: 'grupları düzleştirir, yazarak ararsın',
    icon: '$(search)',
    section: 'run',
  },
  {
    id: 'cmdkit.runLast',
    label: 'Son Komutu Tekrar Çalıştır',
    description: 'en son çalıştığın komutu tekrar çalıştırır',
    icon: '$(debug-rerun)',
    section: 'run',
  },
  {
    id: 'cmdkit.export',
    label: 'Komut Listesini Düzenle',
    description: 'komut dosyasını açar, düzenle',
    icon: '$(json)',
    section: 'edit',
  },
  {
    id: 'cmdkit.import',
    label: 'Komut Dosyasını Uygula',
    description: 'dosyadaki listeyi özetleyip ayarlara yazar',
    icon: '$(sync)',
    section: 'edit',
  },
  {
    id: 'cmdkit.addGroup',
    label: 'Hazır Grup Ekle',
    description: 'kütüphaneden komut grubu ekle',
    icon: '$(new-folder)',
    section: 'edit',
  },
  {
    id: 'cmdkit.removeGroup',
    label: 'Grup Kaldır',
    description: 'komut grubunu ve içindeki tüm komutları siler',
    icon: '$(trash)',
    section: 'edit',
  },
  {
    id: 'cmdkit.reload',
    label: 'Dosyayı Ayarlardan Yenile',
    description: 'dosyayı ayarlardaki liste ile üzerine yazar',
    icon: '$(refresh)',
    section: 'edit',
  },
  {
    id: 'cmdkit.statusBarItems',
    label: 'Durum Çubuğu Düğmelerini Seç',
    description: 'hangi grupların çubukta görüneceğini işaretle',
    icon: '$(list-selection)',
    section: 'view',
  },
  {
    id: 'cmdkit.iconCatalog',
    label: 'İkon Kataloğu',
    description: 'kullanılabilir kodikonları gör',
    icon: '$(paintcan)',
    section: 'view',
  },
  {
    id: 'cmdkit.checkPlatform',
    label: 'Platform Uyumluluğunu Kontrol Et',
    description: 'macOS/Linux yollarını Windows için düzelt',
    icon: '$(check)',
    section: 'help',
  },
  {
    id: 'cmdkit.usage',
    label: 'Komut Dosyası Nasıl Kullanılır',
    description: 'dosya formatı, alanlar, uygulama modları',
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