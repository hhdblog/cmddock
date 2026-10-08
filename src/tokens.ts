/**
 * Komut metnindeki platform belirteçleri.
 *
 * Varsayılan gruplar tek bir metinde yazılı; yol ve silme komutu platforma göre
 * burada çözülür. Bilinmeyen belirteçler olduğu gibi bırakılır.
 *
 *   {python}  python3            →  python
 *   {venv}    .venv/bin/         →  .venv\Scripts\      (sonunda ayraç var)
 *   {venvpy}  .venv/bin/python   →  .venv\Scripts\python.exe
 *   {rm}      rm -rf             →  cmd /c rmdir /s /q
 */

export type Platform = NodeJS.Platform;

const POSIX: Readonly<Record<string, string>> = {
  python: 'python3',
  venv: '.venv/bin/',
  venvpy: '.venv/bin/python',
  rm: 'rm -rf',
};

const WINDOWS: Readonly<Record<string, string>> = {
  python: 'python',
  venv: '.venv\\Scripts\\',
  venvpy: '.venv\\Scripts\\python.exe',
  rm: 'cmd /c rmdir /s /q',
};

export function tokenMap(platform: Platform = process.platform): Readonly<Record<string, string>> {
  return platform === 'win32' ? WINDOWS : POSIX;
}

export function expandTokens(
  command: string,
  platform: Platform = process.platform
): string {
  const map = tokenMap(platform);
  return command.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, token: string) =>
    Object.prototype.hasOwnProperty.call(map, token) ? map[token] : match
  );
}

/** Yalnızca macOS/Linux'ta çalışan yol kalıpları (belirteç kullanılmamış yazımlar). */
const POSIX_ONLY_PATTERNS = [
  /\.venv[\\/]bin[\\/]/i,
  /(^|[\s'"])(rm\s+-rf|ls\s+-la|cp\s+-r|mv\s+|cat\s+|chmod\s+\+x)\b/,
  /\/usr\/local\/bin\//,
];

export function isPosixOnly(command: string): boolean {
  return POSIX_ONLY_PATTERNS.some((pattern) => pattern.test(command));
}
