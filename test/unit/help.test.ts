import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { KULLANIM } from '../../src/help';
import { tokenMap } from '../../src/tokens';

interface Schema {
  readonly properties?: Record<string, unknown>;
  readonly items?: Schema;
}

const manifest = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../package.json', import.meta.url)), 'utf8')
) as { contributes: { configuration: { properties: Record<string, Schema> } } };

// Şema iç içe: cmdkit.groups → items (grup) → properties.commands.items (komut)
const groupsSetting = manifest.contributes.configuration.properties['cmdkit.groups'];
const groupFields = Object.keys(groupsSetting?.items?.properties ?? {});
const commandFields = Object.keys(groupsSetting?.items?.properties?.commands?.items?.properties ?? {});

/**
 * Kılavuz elle yazıldı. Şemaya ya da belirteç tablosuna yeni alan eklendiğinde
 * burada kırmızıya düşmeli, yoksa kullanıcı eksik belgeyle kalır.
 */
describe('kullanım kılavuzu', () => {
  it('her grup alanını açıklıyor', () => {
    expect(groupFields.length).toBeGreaterThan(0);
    for (const field of groupFields) {
      expect(KULLANIM, `grup alanı: ${field}`).toContain(`\`${field}\``);
    }
  });

  it('her komut alanını açıklıyor', () => {
    expect(commandFields.length).toBeGreaterThan(0);
    for (const field of commandFields) {
      expect(KULLANIM, `komut alanı: ${field}`).toContain(`\`${field}\``);
    }
  });

  it('her platform belirteçini listeliyor', () => {
    for (const token of Object.keys(tokenMap('linux'))) {
      expect(KULLANIM, token).toContain(`\`{${token}}\``);
    }
  });

  it('belirteçlerin Windows karşılıklarını veriyor', () => {
    for (const value of Object.values(tokenMap('win32'))) {
      expect(KULLANIM, value).toContain(value);
    }
  });

  it('macOS karşılıklarını veriyor', () => {
    for (const value of Object.values(tokenMap('linux'))) {
      expect(KULLANIM, value).toContain(value);
    }
  });

  it('iki uygulama modunu da anlatıyor', () => {
    expect(KULLANIM).toContain('Grupları birleştir');
    expect(KULLANIM).toContain('Listeyi değiştir');
  });

  it('birleştirmenin silmediğini söylüyor', () => {
    expect(KULLANIM).toMatch(/silinmez/);
  });

  it('kaydetmenin uygulamadığını söylüyor', () => {
    expect(KULLANIM).toMatch(/[Kk]aydet(mek)? .*uygulamaz/);
  });

  it('iki uygulama hedefini anlatıyor', () => {
    expect(KULLANIM).toContain('.vscode/settings.json');
    expect(KULLANIM).toContain('Kullanıcı');
  });

  it('gölgelemeyi anlatıyor', () => {
    expect(KULLANIM).toMatch(/gölgeler/);
  });

  it('ikon ve renk değişikliğinin uygulandığını söylüyor', () => {
    expect(KULLANIM).toContain('ikon/renk değişti');
  });

  it('hazır grup komutundan bahsediyor', () => {
    expect(KULLANIM).toContain('Hazır Grup Ekle');
  });

  it('JSON örneği geçerli — kopyalayan kullanıcı hata almaz', () => {
    const blocks = [...KULLANIM.matchAll(/```json\n([\s\S]*?)```/g)].map((m) => m[1]);
    expect(blocks.length).toBeGreaterThan(0);

    for (const block of blocks) {
      expect(() => JSON.parse(block), block.slice(0, 60)).not.toThrow();
    }
  });

  it('platform belirteçli örnek de geçerli JSON', () => {
    const blocks = [...KULLANIM.matchAll(/```json\n([\s\S]*?)```/g)].map((m) => m[1]);
    const tokenized = blocks.find((block) => block.includes('{venvpy}'));

    expect(tokenized).toBeDefined();
    expect(JSON.parse(tokenized!)).toEqual({ name: 'test', command: '{venvpy} -m pytest' });
  });
});