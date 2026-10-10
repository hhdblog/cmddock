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
      { name: 'gear', hint: 'settings' },
      { name: 'star', hint: 'favorite' },
      { name: 'lightbulb', hint: 'idea / tip' },
      { name: 'clock', hint: 'time / last run' },
      { name: 'history', hint: 'history' },
      { name: 'link', hint: 'link' },
      { name: 'paintcan', hint: 'color / icon' },
    ],
  },
  {
    title: 'Git',
    entries: [
      { name: 'source-control', hint: 'git / source control' },
      { name: 'repo', hint: 'repo' },
      { name: 'repo-forked', hint: 'fork' },
      { name: 'git-branch', hint: 'branch' },
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
    title: 'Language and symbols',
    entries: [
      { name: 'symbol-variable', hint: 'variable / Python' },
      { name: 'symbol-class', hint: 'class' },
      { name: 'symbol-function', hint: 'function' },
      { name: 'symbol-method', hint: 'method' },
      { name: 'symbol-interface', hint: 'interface' },
      { name: 'symbol-module', hint: 'module' },
      { name: 'symbol-namespace', hint: 'namespace' },
      { name: 'symbol-parameter', hint: 'parameter' },
      { name: 'symbol-keyword', hint: 'keyword' },
      { name: 'symbol-operator', hint: 'operator' },
      { name: 'symbol-constant', hint: 'constant' },
      { name: 'symbol-file', hint: 'file' },
      { name: 'symbol-folder', hint: 'folder' },
      { name: 'symbol-misc', hint: 'misc' },
      { name: 'snake', hint: 'Python' },
      { name: 'book', hint: 'notebook / Jupyter' },
    ],
  },
  {
    title: 'Mobile / Flutter',
    entries: [
      { name: 'device-mobile', hint: 'mobile / Flutter' },
      { name: 'device-desktop', hint: 'desktop' },
      { name: 'screen-full', hint: 'fullscreen' },
      { name: 'screen-normal', hint: 'normal size' },
      { name: 'preview', hint: 'preview' },
      { name: 'layout', hint: 'UI layout' },
    ],
  },
  {
    title: 'Web / Node',
    entries: [
      { name: 'package', hint: 'package / dependency' },
      { name: 'json', hint: 'JSON / data' },
      { name: 'markdown', hint: 'Markdown' },
      { name: 'extensions', hint: 'extension' },
      { name: 'server', hint: 'server' },
      { name: 'server-process', hint: 'server process' },
      { name: 'globe', hint: 'web / internet' },
      { name: 'browser', hint: 'browser' },
      { name: 'circuit-board', hint: 'circuit / infrastructure' },
    ],
  },
  {
    title: 'Docker / infrastructure',
    entries: [
      { name: 'vm', hint: 'virtual machine / container' },
      { name: 'server-environment', hint: 'environment / Node' },
      { name: 'cloud', hint: 'cloud' },
      { name: 'broadcast', hint: 'service / publish' },
      { name: 'layers', hint: 'layer' },
      { name: 'archive', hint: 'archive / image' },
      { name: 'files', hint: 'files' },
    ],
  },
  {
    title: 'Database',
    entries: [
      { name: 'database', hint: 'database' },
      { name: 'table', hint: 'table' },
      { name: 'symbol-key', hint: 'key' },
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
      { name: 'bug', hint: 'bug / error' },
      { name: 'warning', hint: 'warning / confirm' },
      { name: 'error', hint: 'error' },
      { name: 'debug-alt', hint: 'debug' },
      { name: 'debug-console', hint: 'debug console' },
      { name: 'debug-breakpoint', hint: 'breakpoint' },
      { name: 'watch', hint: 'watch' },
      { name: 'run-all', hint: 'run all' },
      { name: 'run-below', hint: 'single command' },
      { name: 'debug-rerun', hint: 'run again' },
    ],
  },
  {
    title: 'Build / output',
    entries: [
      { name: 'tasklist', hint: 'task list' },
      { name: 'output', hint: 'output' },
      { name: 'console', hint: 'console' },
      { name: 'list-ordered', hint: 'step output' },
      { name: 'wrench', hint: 'repair / setup' },
    ],
  },
  {
    title: 'File / editing',
    entries: [
      { name: 'account', hint: 'account / sign in' },
      { name: 'sign-out', hint: 'sign out' },
      { name: 'file', hint: 'file' },
      { name: 'file-code', hint: 'code file' },
      { name: 'folder', hint: 'folder' },
      { name: 'folder-opened', hint: 'open folder' },
      { name: 'new-file', hint: 'new file' },
      { name: 'new-folder', hint: 'new folder' },
      { name: 'edit', hint: 'edit' },
      { name: 'copy', hint: 'copy / export' },
      { name: 'save', hint: 'save / import' },
      { name: 'search', hint: 'search' },
      { name: 'filter', hint: 'filter' },
      { name: 'list-selection', hint: 'selection / tick' },
      { name: 'trash', hint: 'delete' },
      { name: 'discard', hint: 'discard / clear' },
      { name: 'clear-all', hint: 'clear all' },
      { name: 'sync', hint: 'sync / import' },
      { name: 'refresh', hint: 'refresh' },
    ],
  },
];

export const CATALOG_ENTRIES: readonly CatalogEntry[] = ICON_CATALOG.flatMap(
  (group) => group.entries
);