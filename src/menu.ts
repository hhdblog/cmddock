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
    label: 'Komutları Dışa Aktar',
    description: 'panoya kopyala veya dosyaya kaydet',
    icon: '$(json)',
    runnable: true,
  },
  {
    id: 'cmd-deck.import',
    label: 'Komutları İçe Aktar',
    description: 'panodan veya dosyadan oku',
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
    id: 'cmd-deck.iconCatalog',
    label: 'İkon Kataloğu',
    description: 'kullanılabilir kodikonları gör',
    icon: '$(paintcan)',
    runnable: true,
  },
  {
    id: 'cmd-deck.reload',
    label: 'Komut Listesini Yenile',
    description: 'ayarları yeniden oku',
    icon: '$(refresh)',
    runnable: true,
  },
];