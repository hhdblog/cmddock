/**
 * Durum çubuğu düğmesi için kullanışlı kodikon kataloğu.
 *
 * Buradaki adların tamamı VSCode'un kendi ikon kayıt defterinde doğrulanmıştır
 * (`fe("ad", id)` kayıtları taranarak). VSCode ikonları listeleme API'si
 * sunmadığı için katalog elle tutuluyor — yeni ikon eklenmek istenirse
 * önce adın gerçekten var olduğu doğrulanmalı.
 */
export interface CatalogEntry {
  readonly name: string;
  readonly hint: string;
}

export interface CatalogGroup {
  readonly title: string;
  readonly entries: readonly CatalogEntry[];
}

export const ICON_CATALOG: readonly CatalogGroup[] = [
  {
    title: 'Genel',
    entries: [
      { name: 'terminal', hint: 'terminal / komut' },
      { name: 'zap', hint: 'hızlı eylem' },
      { name: 'rocket', hint: 'çalıştır / yayınla' },
      { name: 'play', hint: 'çalıştır' },
      { name: 'tools', hint: 'araçlar / ayar' },
      { name: 'gear', hint: 'ayar' },
      { name: 'star', hint: 'favori' },
      { name: 'lightbulb', hint: 'fikir / ipucu' },
      { name: 'clock', hint: 'zaman / son çalışma' },
      { name: 'history', hint: 'geçmiş' },
      { name: 'link', hint: 'bağlantı' },
      { name: 'paintcan', hint: 'renk / ikon' },
    ],
  },
  {
    title: 'Git',
    entries: [
      { name: 'source-control', hint: 'git / kaynak kontrolü' },
      { name: 'repo', hint: 'depo' },
      { name: 'repo-forked', hint: 'çatal' },
      { name: 'git-branch', hint: 'dal' },
      { name: 'git-commit', hint: 'commit' },
      { name: 'git-merge', hint: 'birleştirme' },
      { name: 'git-pull-request', hint: 'pull request' },
      { name: 'git-compare', hint: 'karşılaştır' },
      { name: 'git-stash', hint: 'stash' },
      { name: 'tag', hint: 'etiket / sürüm' },
      { name: 'cloud-upload', hint: 'gönder / push' },
      { name: 'cloud-download', hint: 'çek / kur' },
    ],
  },
  {
    title: 'Dil ve semboller',
    entries: [
      { name: 'symbol-variable', hint: 'değişken / Python' },
      { name: 'symbol-class', hint: 'sınıf' },
      { name: 'symbol-function', hint: 'fonksiyon' },
      { name: 'symbol-method', hint: 'metot' },
      { name: 'symbol-interface', hint: 'arayüz' },
      { name: 'symbol-module', hint: 'modül' },
      { name: 'symbol-namespace', hint: 'namespace' },
      { name: 'symbol-parameter', hint: 'parametre' },
      { name: 'symbol-keyword', hint: 'anahtar sözcük' },
      { name: 'symbol-operator', hint: 'operatör' },
      { name: 'symbol-constant', hint: 'sabit' },
      { name: 'symbol-file', hint: 'dosya' },
      { name: 'symbol-folder', hint: 'klasör' },
      { name: 'symbol-misc', hint: 'diğer' },
      { name: 'snake', hint: 'Python' },
      { name: 'book', hint: 'notebook / Jupyter' },
    ],
  },
  {
    title: 'Mobil / Flutter',
    entries: [
      { name: 'device-mobile', hint: 'mobil / Flutter' },
      { name: 'device-desktop', hint: 'masaüstü' },
      { name: 'screen-full', hint: 'tam ekran' },
      { name: 'screen-normal', hint: 'normal ekran' },
      { name: 'preview', hint: 'önizleme' },
      { name: 'layout', hint: 'arayüz düzeni' },
    ],
  },
  {
    title: 'Web / Node',
    entries: [
      { name: 'package', hint: 'paket / bağımlılık' },
      { name: 'json', hint: 'JSON / veri' },
      { name: 'markdown', hint: 'Markdown' },
      { name: 'extensions', hint: 'eklenti' },
      { name: 'server', hint: 'sunucu' },
      { name: 'server-process', hint: 'sunucu süreci' },
      { name: 'globe', hint: 'web / internet' },
      { name: 'browser', hint: 'tarayıcı' },
      { name: 'circuit-board', hint: 'devre / altyapı' },
    ],
  },
  {
    title: 'Docker / altyapı',
    entries: [
      { name: 'vm', hint: 'sanal makine / konteyner' },
      { name: 'server-environment', hint: 'ortam / Node' },
      { name: 'cloud', hint: 'bulut' },
      { name: 'broadcast', hint: 'servis / yayın' },
      { name: 'layers', hint: 'katman' },
      { name: 'archive', hint: 'arşiv / imaj' },
      { name: 'files', hint: 'dosyalar' },
    ],
  },
  {
    title: 'Veritabanı',
    entries: [
      { name: 'database', hint: 'veritabanı' },
      { name: 'table', hint: 'tablo' },
      { name: 'symbol-key', hint: 'anahtar' },
    ],
  },
  {
    title: 'Test / hata ayıklama',
    entries: [
      { name: 'beaker', hint: 'test' },
      { name: 'check', hint: 'başarılı / kontrol' },
      { name: 'pass-filled', hint: 'test geçti' },
      { name: 'verified', hint: 'doğrulanmış' },
      { name: 'shield', hint: 'güvenlik / lint' },
      { name: 'bug', hint: 'hata' },
      { name: 'warning', hint: 'uyarı / onay isteyen' },
      { name: 'error', hint: 'hata' },
      { name: 'debug-alt', hint: 'debug' },
      { name: 'debug-console', hint: 'debug konsolu' },
      { name: 'debug-breakpoint', hint: 'breakpoint' },
      { name: 'watch', hint: 'izle / watch' },
      { name: 'run-all', hint: 'tümünü çalıştır' },
      { name: 'run-below', hint: 'tek komut' },
      { name: 'debug-rerun', hint: 'tekrar çalıştır' },
    ],
  },
  {
    title: 'Derleme / çıktı',
    entries: [
      { name: 'tasklist', hint: 'görev listesi' },
      { name: 'output', hint: 'çıktı' },
      { name: 'console', hint: 'konsol' },
      { name: 'list-ordered', hint: 'adımlı çıktı' },
      { name: 'wrench', hint: 'onarım / kurulum' },
    ],
  },
  {
    title: 'Dosya / düzen',
    entries: [
      { name: 'account', hint: 'hesap / giriş' },
      { name: 'sign-out', hint: 'çıkış' },
      { name: 'file', hint: 'dosya' },
      { name: 'file-code', hint: 'kod dosyası' },
      { name: 'folder', hint: 'klasör' },
      { name: 'folder-opened', hint: 'açık klasör' },
      { name: 'new-file', hint: 'yeni dosya' },
      { name: 'new-folder', hint: 'yeni klasör' },
      { name: 'edit', hint: 'düzenle' },
      { name: 'copy', hint: 'kopyala / dışa aktar' },
      { name: 'save', hint: 'kaydet / içe aktar' },
      { name: 'search', hint: 'ara' },
      { name: 'filter', hint: 'süz' },
      { name: 'list-selection', hint: 'seçim / işaretle' },
      { name: 'trash', hint: 'sil' },
      { name: 'discard', hint: 'iptal / temizle' },
      { name: 'clear-all', hint: 'hepsini temizle' },
      { name: 'sync', hint: 'senkron / içe aktar' },
      { name: 'refresh', hint: 'yenile' },
    ],
  },
];

export const CATALOG_ENTRIES: readonly CatalogEntry[] = ICON_CATALOG.flatMap(
  (group) => group.entries
);