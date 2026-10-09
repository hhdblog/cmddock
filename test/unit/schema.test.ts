import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

interface Schema {
  readonly type?: string;
  readonly required?: readonly string[];
  readonly additionalProperties?: boolean;
  readonly properties?: Record<string, Schema>;
  readonly items?: Schema;
}

const readJson = (relative: string): unknown =>
  JSON.parse(readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8'));

const manifest = readJson('../../package.json') as {
  contributes: {
    jsonValidation?: { fileMatch?: string[]; url?: string }[];
    configuration: { properties: Record<string, Schema> };
  };
};

const schema = readJson('../../schemas/cmddock-groups.json') as Schema;

// package.json: properties["cmddock.groups"] → dizi, items → grup, grup.commands.items → komut
const groupsSetting = manifest.contributes.configuration.properties['cmddock.groups'];
const groupInManifest = groupsSetting?.items;
const commandInManifest = groupInManifest?.properties?.commands?.items;

// schemas/cmddock-groups.json: dizi → items grup → properties.commands.items komut
const groupInSchema = schema.items;
const groupCommands = groupInSchema?.properties?.commands;
const commandInSchema = groupCommands?.items;

/**
 * `cmddock.groups` ayarının şeması package.json içinde, düzenleme dosyasının şeması
 * ise schemas/ altında duruyor — VSCode bir ayar şemasını bağımsız dosyalara
 * uygulayamıyor. İki kopya elle tutulduğu için ayrışmaları burada yakalıyoruz.
 */
describe('şema senkronu', () => {
  it('şema dosyası paket içinde ve manifestte tanımlı', () => {
    const validation = manifest.contributes.jsonValidation ?? [];

    expect(validation).toHaveLength(1);
    expect(validation[0].url).toBe('./schemas/cmddock-groups.json');
    expect(validation[0].fileMatch).toEqual(['cmddock-groups.json']);
  });

  it('her iki yer de komut dizisi bekliyor', () => {
    expect(groupsSetting?.type).toBe('array');
    expect(schema.type).toBe('array');
  });

  it('grup için zorunlu alanlar aynı', () => {
    expect(groupInManifest?.required).toEqual(['name', 'commands']);
    expect(groupInSchema?.required).toEqual(groupInManifest?.required);
  });

  it('komut için zorunlu alanlar aynı', () => {
    expect(commandInManifest?.required).toEqual(['name', 'command']);
  });

  it('grup alanları aynı kümede', () => {
    expect(Object.keys(groupInSchema?.properties ?? {}).sort()).toEqual(
      Object.keys(groupInManifest?.properties ?? {}).sort()
    );
  });

  it('komut alanları aynı kümede', () => {
    expect(Object.keys(commandInSchema?.properties ?? {}).sort()).toEqual(
      Object.keys(commandInManifest?.properties ?? {}).sort()
    );
  });

  it('confirm alanı string ya da boolean kabul ediyor', () => {
    expect(commandInSchema?.properties?.confirm?.type).toEqual(['string', 'boolean']);
  });

  it('argsSingle alanı boolean', () => {
    // Serbest metin bekleyen bayraklar (git commit -m, psql -c) için gerekli:
    // bölünürse mesaj parçalanır ve gerisi pathspec olur.
    expect(commandInSchema?.properties?.argsSingle?.type).toBe('boolean');
  });

  it('clear alanı boolean', () => {
    expect(commandInSchema?.properties?.clear?.type).toBe('boolean');
  });

  it('komutsuz grup editörde uyarılıyor', () => {
    // minItems olmadan "commands": [] sessizce geçer, grup sonra yok sayılır.
    expect(groupCommands?.minItems).toBe(1);
  });

  it('bilinmeyen alanlar reddediliyor — yazım hatası yakalansın', () => {
    expect(groupInSchema?.additionalProperties).toBe(false);
    expect(commandInSchema?.additionalProperties).toBe(false);
  });
});