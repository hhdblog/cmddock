import * as vscode from 'vscode';
import { DeckGroup, normalizeGroups } from './normalize';

export const CONFIG_SECTION = 'cmdkit';
export const GROUPS_KEY = 'groups';

/**
 * Ayarlar geçerli bir dizi değilse boş liste döner, uzantı çökmez.
 * configurationDefaults (Python / Flutter / Node.js) boş çalışma alanında da buradan gelir.
 */
export function getGroups(scope?: vscode.Uri): DeckGroup[] {
  return normalizeGroups(readRawGroups(scope));
}

/**
 * Normalizasyondan geçmemiş ham ayar değeri.
 *
 * Dışa aktarımda kullanılır: `getGroups()` her komuta `description`, `confirm`,
 * `clear` gibi varsayılan alanları doldurur, ham değer ise kullanıcının gerçekten
 * yazdığı JSON'dur. Dışa aktarılan dosya elle düzenlendiği için sadeleştirilmiş
 * olmalı — normalize edilmiş hâli yazarsak dosya `description: ""` gibi
 * gereksiz anahtarlarla şişer.
 */
export function readRawGroups(scope?: vscode.Uri): unknown {
  return vscode.workspace.getConfiguration(CONFIG_SECTION, scope).get(GROUPS_KEY);
}
