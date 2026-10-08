import { describe, expect, it } from 'vitest';
import { splitArgs } from '../../src/args';

describe('splitArgs', () => {
  it('boş girdi argümansız çalıştırır', () => {
    expect(splitArgs('')).toEqual([]);
    expect(splitArgs('    ')).toEqual([]);
  });

  it('boşlukla ayrılmış kelimeleri böler', () => {
    expect(splitArgs('main.py')).toEqual(['main.py']);
    expect(splitArgs('  bir   iki  ')).toEqual(['bir', 'iki']);
    expect(splitArgs('a\tb\nc')).toEqual(['a', 'b', 'c']);
  });

  it('çift tırnak içindeki boşlukları korur', () => {
    expect(splitArgs('"benim dosyam.txt"')).toEqual(['benim dosyam.txt']);
    expect(splitArgs('a "b c" d')).toEqual(['a', 'b c', 'd']);
  });

  it('tek tırnak içindeki boşlukları korur', () => {
    expect(splitArgs("'tek kelime'")).toEqual(['tek kelime']);
  });

  it('tırnakları kaldırır', () => {
    expect(splitArgs('"a" \'b\'')).toEqual(['a', 'b']);
  });

  it('tırnaklı boş argümanı boş string olarak geçirir (shell davranışı)', () => {
    expect(splitArgs('""')).toEqual(['']);
    expect(splitArgs('a ""')).toEqual(['a', '']);
  });

  it('kapanmamış tırnakta kalan metni korur', () => {
    expect(splitArgs('"acik')).toEqual(['acik']);
  });

  it('tırnak içindeki tırnak karakterini korur', () => {
    expect(splitArgs(`"it's"`)).toEqual(["it's"]);
  });
});
