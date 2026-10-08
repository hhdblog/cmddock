import { describe, expect, it } from 'vitest';
import { parseColor, parseIcon } from '../../src/style';
import { CATALOG_ENTRIES, ICON_CATALOG } from '../../src/icons';

describe('parseIcon', () => {
  it('düz adı kodikon biçimine çevirir', () => {
    expect(parseIcon('zap')).toBe('$(zap)');
    expect(parseIcon('git-branch')).toBe('$(git-branch)');
  });

  it('zaten kodikon biçimindeyse dokunmaz', () => {
    expect(parseIcon('$(zap)')).toBe('$(zap)');
    expect(parseIcon('  $(play)  ')).toBe('$(play)');
  });

  it('tek dolar işareti üretmez', () => {
    // Template literal içinde `$$(...)` iki dolar üretirdi.
    expect(parseIcon(undefined).startsWith('$(')).toBe(true);
    expect(parseIcon('zap').match(/\$/g)).toHaveLength(1);
  });

  it('boş ve hatalı değerlerde varsayılana döner', () => {
    expect(parseIcon(undefined)).toBe('$(terminal)');
    expect(parseIcon(null)).toBe('$(terminal)');
    expect(parseIcon('')).toBe('$(terminal)');
    expect(parseIcon('   ')).toBe('$(terminal)');
    expect(parseIcon(42)).toBe('$(terminal)');
    expect(parseIcon('$()')).toBe('$(terminal)');
    expect(parseIcon('iki kelime')).toBe('$(terminal)');
  });

  it('özel fallback kullanır', () => {
    expect(parseIcon(undefined, 'rocket')).toBe('$(rocket)');
    expect(parseIcon('', 'rocket')).toBe('$(rocket)');
  });
});

describe('parseColor', () => {
  it('hex rengi kabul eder', () => {
    expect(parseColor('#ff0000')).toEqual({ hex: '#ff0000' });
    expect(parseColor('#F00')).toEqual({ hex: '#F00' });
  });

  it('tema rengi adını kabul eder', () => {
    expect(parseColor('charts.red')).toEqual({ theme: 'charts.red' });
    expect(parseColor('statusBarItem.errorBackground')).toEqual({
      theme: 'statusBarItem.errorBackground',
    });
    expect(parseColor('foreground')).toEqual({ theme: 'foreground' });
  });

  it('boş ve geçersiz değerlerde undefined döner', () => {
    expect(parseColor('')).toBeUndefined();
    expect(parseColor('   ')).toBeUndefined();
    expect(parseColor(undefined)).toBeUndefined();
    expect(parseColor(null)).toBeUndefined();
    expect(parseColor(123)).toBeUndefined();
    expect(parseColor('rgb(1,2,3)')).toBeUndefined();
    expect(parseColor('#12345')).toBeUndefined();
    expect(parseColor('.red')).toBeUndefined();
  });

  it('baştaki/sondaki boşlukları yok sayar', () => {
    expect(parseColor('  charts.red  ')).toEqual({ theme: 'charts.red' });
  });
});

describe('ikon kataloğu', () => {
  it('en az bir grup ve makul sayıda ikon içerir', () => {
    expect(ICON_CATALOG.length).toBeGreaterThan(5);
    expect(CATALOG_ENTRIES.length).toBeGreaterThan(80);
  });

  it('hiçbir ikon adı tekrarlanmaz', () => {
    const names = CATALOG_ENTRIES.map((entry) => entry.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('tüm adlar geçerli kodikon adı biçiminde', () => {
    for (const entry of CATALOG_ENTRIES) {
      expect(entry.name).toMatch(/^[a-z0-9][a-z0-9-]*$/);
      expect(entry.hint.length).toBeGreaterThan(0);
    }
  });

  it('grup başlıkları boş değil', () => {
    for (const group of ICON_CATALOG) {
      expect(group.title.length).toBeGreaterThan(0);
      expect(group.entries.length).toBeGreaterThan(0);
    }
  });
});