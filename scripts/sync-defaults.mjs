/**
 * src/library.json içindeki `defaults` listesini package.json içindeki
 * `contributes.configurationDefaults["cmdkit.groups"]` ile eşitler.
 *
 * Tek kaynak budur: kütüphane ve ilk kurulum listesi aynı dosyadan gelir.
 * `summary` yalnızca kütüphane seçicisi içindir, manifestte anlamı yok — atılır.
 *
 * Çalıştırma: npm run sync-defaults  (build betiğine zincirlidir)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = resolve(root, 'package.json');
const libraryPath = resolve(root, 'src', 'library.json');

const library = JSON.parse(readFileSync(libraryPath, 'utf8'));
const defaults = library.defaults;
const groups = library.groups;

if (!Array.isArray(defaults) || defaults.length === 0) {
  console.error(`${libraryPath} içinde "defaults" boş ya da dizi değil.`);
  process.exit(1);
}
if (!Array.isArray(groups) || groups.length === 0) {
  console.error(`${libraryPath} içinde "groups" boş ya da dizi değil.`);
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

const byName = new Map(groups.map((group) => [group.name, group]));
const selected = defaults.map((name) => {
  const group = byName.get(name);
  if (!group) {
    console.error(`"defaults" listesindeki grup kütüphanede yok: ${name}`);
    process.exit(1);
  }
  return group;
});

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const contributes = manifest.contributes ?? (manifest.contributes = {});
const configurationDefaults =
  contributes.configurationDefaults ?? (contributes.configurationDefaults = {});

// summary kütüphaneye özgü; Settings arayüzünde anlamsız bir alan olurdu.
configurationDefaults['cmdkit.groups'] = selected.map(({ summary, ...rest }) => rest);

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

const total = selected.reduce((sum, group) => sum + group.commands.length, 0);
console.log(
  `package.json güncellendi: ${selected.length} varsayılan / ${groups.length} kütüphane grubu, ` +
    `${total} komut (${selected.map((group) => group.name).join(', ')})`
);