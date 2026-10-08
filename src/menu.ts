/**
 * Cmd düğmesinin altındaki "diğer menüler" — grup listesinden sonra ayraçla gelir.
 * Buradaki `id` doğrudan kayıtlı komut kimliğidir; seçilince doğrudan çalıştırılır.
 */
export interface MenuAction {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly icon: string;
  /** Gerçekten çalıştırılabilecek komut mu, yoksa yalnızca bilgi mi. */
  readonly runnable: boolean;
}

export const MENU_SEPARATOR = '—— diğer ——';

export const MENU_ACTIONS: readonly MenuAction[] = [
  {
    id: 'cmd-deck.search',
    label: 'Tüm Komutlarda Ara',
    description: 'grupları düzleştirir, yazarak ararsın',
    icon: '$(search)',
    runnable: true,
  },
  {
    id: 'cmd-deck.runLast',
    label: 'Son Komutu Tekrar Çalıştır',
    description: 'en son çalıştığın komutu tekrar çalıştırır',
    icon: '$(debug-rerun)',
    runnable: true,
  },
  {
    id: 'cmd-deck.export',
    label: 'Komut Listesini Düzenle',
    description: 'komut dosyasını açar, düzenle',
    icon: '$(json)',
    runnable: true,
  },
  {
    id: 'cmd-deck.import',
    label: 'Komut Dosyasını Uygula',
    description: 'dosyadaki listeyi özetleyip ayarlara yazar',
    icon: '$(sync)',
    runnable: true,
  },
  {
    id: 'cmd-deck.checkPlatform',
    label: 'Platform Uyumluluğunu Kontrol Et',
    description: 'macOS/Linux yollarını Windows için düzelt',
    icon: '$(check)',
    runnable: true,
  },
  {
    id: 'cmd-deck.addGroup',
    label: 'Hazır Grup Ekle',
    description: 'kütüphaneden komut grubu ekle',
    icon: '$(new-folder)',
    runnable: true,
  },
  {
    id: 'cmd-deck.usage',
    label: 'Komut Dosyası Nasıl Kullanılır',
    description: 'dosya formatı, alanlar, uygulama modları',
    icon: '$(markdown)',
    runnable: true,
  },
  {
    id: 'cmd-deck.statusBarItems',
    label: 'Durum Çubuğu Düğmelerini Seç',
    description: 'hangi grupların çubukta görüneceğini işaretle',
    icon: '$(list-selection)',
    runnable: true,
  },
  {
    id: 'cmd-deck.iconCatalog',
    label: 'İkon Kataloğu',
    description: 'kullanılabilir kodikonları gör',
    icon: '$(paintcan)',
    runnable: true,
  },
  {
    id: 'cmd-deck.reload',
    label: 'Dosyayı Ayarlardan Yenile',
    description: 'dosyayı ayarlardaki liste ile üzerine yazar',
    icon: '$(refresh)',
    runnable: true,
  },
];