/**
 * examples/default-groups.json dosyasını package.json içindeki
 * `contributes.configurationDefaults["cmdDeck.groups"]` ile eşitler.
 *
 * Varsayılan komut listesi tek kaynaktan yönetilsin diye: dosya elle düzenlenir,
 * bu betik package.json'a yazar. Çalıştırma: npm run sync-defaults
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = resolve(root, 'package.json');
const defaultsPath = resolve(root, 'examples', 'default-groups.json');

const groups = JSON.parse(readFileSync(defaultsPath, 'utf8'));

if (!Array.isArray(groups) || groups.length === 0) {
  console.error(`${defaultsPath} boş ya da dizi değil.`);
  process.exit(1);
}

for (const group of groups) {
  if (!group.name || !Array.isArray(group.commands) || group.commands.length === 0) {
    console.error(`Geçersiz grup: ${JSON.stringify(group).slice(0, 60)}`);
    process.exit(1);
  }
  for (const command of group.commands) {
    if (!command.name || !command.command) {
      console.error(`Eksik alan: ${JSON.stringify(command).slice(0, 60)}`);
      process.exit(1);
    }
  }
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const contributes = manifest.contributes ?? (manifest.contributes = {});
const defaults = contributes.configurationDefaults ?? (contributes.configurationDefaults = {});
defaults['cmdDeck.groups'] = groups;

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

const total = groups.reduce((sum, group) => sum + group.commands.length, 0);
console.log(
  `package.json güncellendi: ${groups.length} grup, ${total} komut ` +
    `(${groups.map((group) => group.name).join(', ')})`
);