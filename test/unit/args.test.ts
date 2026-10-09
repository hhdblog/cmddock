import { describe, expect, it } from 'vitest';
import { buildCommandLine, splitArgs } from '../../src/args';

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

describe('buildCommandLine', () => {
  const posix = (c: string, a: string[]) => buildCommandLine(c, a, 'linux');

  it('argümansız komut olduğu gibi kalır', () => {
    expect(posix('git status', [])).toBe('git status');
  });

  it('tek kelime argüman da tırnaklanır — zararsız, her zaman güvenli', () => {
    // Kabuk tırnakları soyar; "her şeyi tırnakla" kuralı hem basit hem güvenli.
    expect(posix('git checkout', ['main'])).toBe("git checkout 'main'");
  });

  it('boşluklu argüman tırnaklanır', () => {
    expect(posix('git commit -m', ['fix: yaz düzeltmesi']))
      .toBe("git commit -m 'fix: yaz düzeltmesi'");
  });

  it('POSIX tırnak komut ve argümanı kirletmez', () => {
    expect(posix('echo "git status"', [])).toBe('echo "git status"');
    expect(posix('psql -c', ["SELECT * FROM t WHERE a='x'"]))
      .toBe("psql -c 'SELECT * FROM t WHERE a='\\''x'\\'''");
  });

  it('içeride tek tırnak kaçırılır', () => {
    expect(posix('echo', ["it's"])).toBe("echo 'it'\\''s'");
  });

  it('birden çok argüman', () => {
    expect(posix('docker compose exec', ['api', 'bash']))
      .toBe("docker compose exec 'api' 'bash'");
  });

  it('Windows çift tırnak kullanır', () => {
    expect(buildCommandLine('git commit -m', ['fix: yaz'], 'win32'))
      .toBe('git commit -m "fix: yaz"');
  });

  it('Windows içeride çift tırnak ikiler', () => {
    expect(buildCommandLine('echo', ['a"b'], 'win32')).toBe('echo "a""b"');
  });

  it('&& ve | içeren komutta argüman eklenir', () => {
    expect(posix('cd x && git add -A', ['tümü']))
      .toBe("cd x && git add -A 'tümü'");
  });
});
