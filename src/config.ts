import * as vscode from 'vscode';
import { DeckGroup, normalizeGroups } from './normalize';

export const CONFIG_SECTION = 'cmdDeck';
export const GROUPS_KEY = 'groups';

/**
 * Ayarlar geçerli bir dizi değilse boş liste döner, uzantı çökmez.
 * configurationDefaults (Python / Flutter / Node.js) boş çalışma alanında da buradan gelir.
 */
export function getGroups(scope?: vscode.Uri): DeckGroup[] {
  const raw = vscode.workspace
    .getConfiguration(CONFIG_SECTION, scope)
    .get<unknown>(GROUPS_KEY);

  return normalizeGroups(raw);
}
