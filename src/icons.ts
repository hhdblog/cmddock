/**
 * A catalog of useful codicons for the status bar button.
 *
 * Every name here has been verified against VSCode's own icon registry (by
 * scanning the `fe("name", id)` registrations). VSCode offers no API to list
 * its icons, so the catalog is kept by hand — before adding a new icon, check
 * the name really exists.
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
    title: 'General',
    entries: [
      { name: 'terminal', hint: 'terminal / command' },
      { name: 'zap', hint: 'quick action' },
      { name: 'rocket', hint: 'run / publish' },
      { name: 'play', hint: 'run' },
      { name: 'tools', hint: 'tools / settings' },
      { name: 'gear', hint: 'ayar' },
      { name: 'star', hint: 'favori' },
      { name: 'lightbulb', hint: 'fikir / ipucu' },
      { name: 'clock', hint: 'time / last run' },
      { name: 'history', hint: 'history' },
      { name: 'link', hint: 'link' },
      { name: 'paintcan', hint: 'renk / ikon' },
    ],
  },
  {
    title: 'Git',
    entries: [
      { name: 'source-control', hint: 'git / source control' },
      { name: 'repo', hint: 'depo' },
      { name: 'repo-forked', hint: 'fork' },
      { name: 'git-branch', hint: 'dal' },
      { name: 'git-commit', hint: 'commit' },
      { name: 'git-merge', hint: 'merge' },
      { name: 'git-pull-request', hint: 'pull request' },
      { name: 'git-compare', hint: 'compare' },
      { name: 'git-stash', hint: 'stash' },
      { name: 'tag', hint: 'tag / version' },
      { name: 'cloud-upload', hint: 'send / push' },
      { name: 'cloud-download', hint: 'pull / install' },
    ],
  },
  {
    title: 'Dil ve semboller',
    entries: [
      { name: 'symbol-variable', hint: 'variable / Python' },
      { name: 'symbol-class', hint: 'class' },
      { name: 'symbol-function', hint: 'fonksiyon' },
      { name: 'symbol-method', hint: 'metot' },
      { name: 'symbol-interface', hint: 'interface' },
      { name: 'symbol-module', hint: 'module' },
      { name: 'symbol-namespace', hint: 'namespace' },
      { name: 'symbol-parameter', hint: 'parametre' },
      { name: 'symbol-keyword', hint: 'keyword' },
      { name: 'symbol-operator', hint: 'operator' },
      { name: 'symbol-constant', hint: 'sabit' },
      { name: 'symbol-file', hint: 'dosya' },
      { name: 'symbol-folder', hint: 'folder' },
      { name: 'symbol-misc', hint: 'misc' },
      { name: 'snake', hint: 'Python' },
      { name: 'book', hint: 'notebook / Jupyter' },
    ],
  },
  {
    title: 'Mobil / Flutter',
    entries: [
      { name: 'device-mobile', hint: 'mobil / Flutter' },
      { name: 'device-desktop', hint: 'desktop' },
      { name: 'screen-full', hint: 'tam ekran' },
      { name: 'screen-normal', hint: 'normal ekran' },
      { name: 'preview', hint: 'preview' },
      { name: 'layout', hint: 'UI layout' },
    ],
  },
  {
    title: 'Web / Node',
    entries: [
      { name: 'package', hint: 'package / dependency' },
      { name: 'json', hint: 'JSON / veri' },
      { name: 'markdown', hint: 'Markdown' },
      { name: 'extensions', hint: 'eklenti' },
      { name: 'server', hint: 'sunucu' },
      { name: 'server-process', hint: 'server process' },
      { name: 'globe', hint: 'web / internet' },
      { name: 'browser', hint: 'browser' },
      { name: 'circuit-board', hint: 'circuit / infrastructure' },
    ],
  },
  {
    title: 'Docker / infrastructure',
    entries: [
      { name: 'vm', hint: 'sanal makine / konteyner' },
      { name: 'server-environment', hint: 'ortam / Node' },
      { name: 'cloud', hint: 'bulut' },
      { name: 'broadcast', hint: 'service / publish' },
      { name: 'layers', hint: 'katman' },
      { name: 'archive', hint: 'archive / image' },
      { name: 'files', hint: 'dosyalar' },
    ],
  },
  {
    title: 'Database',
    entries: [
      { name: 'database', hint: 'database' },
      { name: 'table', hint: 'tablo' },
      { name: 'symbol-key', hint: 'anahtar' },
    ],
  },
  {
    title: 'Test / debugging',
    entries: [
      { name: 'beaker', hint: 'test' },
      { name: 'check', hint: 'pass / check' },
      { name: 'pass-filled', hint: 'test passed' },
      { name: 'verified', hint: 'verified' },
      { name: 'shield', hint: 'security / lint' },
      { name: 'bug', hint: 'hata' },
      { name: 'warning', hint: 'warning / confirm' },
      { name: 'error', hint: 'hata' },
      { name: 'debug-alt', hint: 'debug' },
      { name: 'debug-console', hint: 'debug konsolu' },
      { name: 'debug-breakpoint', hint: 'breakpoint' },
      { name: 'watch', hint: 'izle / watch' },
      { name: 'run-all', hint: 'run all' },
      { name: 'run-below', hint: 'tek komut' },
      { name: 'debug-rerun', hint: 'run again' },
    ],
  },
  {
    title: 'Build / output',
    entries: [
      { name: 'tasklist', hint: 'task list' },
      { name: 'output', hint: 'output' },
      { name: 'console', hint: 'konsol' },
      { name: 'list-ordered', hint: 'step output' },
      { name: 'wrench', hint: 'repair / setup' },
    ],
  },
  {
    title: 'File / editing',
    entries: [
      { name: 'account', hint: 'account / sign in' },
      { name: 'sign-out', hint: 'sign out' },
      { name: 'file', hint: 'dosya' },
      { name: 'file-code', hint: 'code file' },
      { name: 'folder', hint: 'folder' },
      { name: 'folder-opened', hint: 'open folder' },
      { name: 'new-file', hint: 'yeni dosya' },
      { name: 'new-folder', hint: 'new folder' },
      { name: 'edit', hint: 'edit' },
      { name: 'copy', hint: 'copy / export' },
      { name: 'save', hint: 'save / import' },
      { name: 'search', hint: 'ara' },
      { name: 'filter', hint: 'filter' },
      { name: 'list-selection', hint: 'selection / tick' },
      { name: 'trash', hint: 'sil' },
      { name: 'discard', hint: 'iptal / temizle' },
      { name: 'clear-all', hint: 'hepsini temizle' },
      { name: 'sync', hint: 'sync / import' },
      { name: 'refresh', hint: 'yenile' },
    ],
  },
];

export const CATALOG_ENTRIES: readonly CatalogEntry[] = ICON_CATALOG.flatMap(
  (group) => group.entries
);