/** Ayar değerlerini VSCode API'sinin beklediği biçime çeviren saf yardımcılar. */

const DEFAULT_ICON = 'terminal';
const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const THEME_COLOR = /^[A-Za-z][A-Za-z0-9]*(\.[A-Za-z0-9_-]+)*$/;

/**
 * Kodikon normalizasyonu: `zap` → `$(zap)`, `$(zap)` → `$(zap)`.
 * Menüde/çubukta ham `zap` yazısı görünmesin diye. Geçersizse varsayılana döner.
 */
export function parseIcon(value: unknown, fallback = DEFAULT_ICON): string {
  // Dikkat: template literal içinde `$$(...)` iki dolar işareti üretir.
  const codicon = (name: string): string => '$(' + name + ')';

  if (typeof value !== 'string') {
    return codicon(fallback);
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return codicon(fallback);
  }

  if (trimmed.startsWith('$(') && trimmed.endsWith(')')) {
    const inner = trimmed.slice(2, -1).trim();
    return inner.length > 0 ? codicon(inner) : codicon(fallback);
  }

  // Kodikon adında boşluk/özel karakter olmaz; yine de savunmacıyız.
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(trimmed)) {
    return codicon(fallback);
  }

  return codicon(trimmed);
}

export type ColorSpec = { hex: string } | { theme: string } | undefined;

/**
 * Renk kabulü:
 * - `#ff0000` / `#f00`  → doğrudan CSS rengi
 * - `charts.red`, `statusBarItem.errorBackground` → tema rengi
 * - boş/geçersiz       → undefined (temaya bırakılır)
 */
export function parseColor(value: unknown): ColorSpec {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  if (HEX_COLOR.test(trimmed)) {
    return { hex: trimmed };
  }

  if (THEME_COLOR.test(trimmed)) {
    return { theme: trimmed };
  }

  return undefined;
}