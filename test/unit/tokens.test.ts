import { describe, expect, it } from 'vitest';
import { expandTokens, isPosixOnly, tokenMap } from '../../src/tokens';

describe('tokenMap', () => {
  it('platforma göre doğru haritayı verir', () => {
    expect(tokenMap('win32').venv).toBe('.venv\\Scripts\\');
    expect(tokenMap('darwin').venv).toBe('.venv/bin/');
    expect(tokenMap('linux').python).toBe('python3');
  });
});

describe('expandTokens', () => {
  it('macOS/Linux karşılıklarına çevirir', () => {
    expect(expandTokens('{python} -m venv .venv', 'darwin')).toBe('python3 -m venv .venv');
    expect(expandTokens('{venv}pip install -r requirements.txt', 'darwin')).toBe(
      '.venv/bin/pip install -r requirements.txt'
    );
    expect(expandTokens('{venvpy} -m pytest', 'darwin')).toBe('.venv/bin/python -m pytest');
    expect(expandTokens('{rm} node_modules', 'darwin')).toBe('rm -rf node_modules');
  });

  it('Windows karşılıklarına çevirir', () => {
    expect(expandTokens('{python} -m venv .venv', 'win32')).toBe('python -m venv .venv');
    expect(expandTokens('{venv}pip install -r requirements.txt', 'win32')).toBe(
      '.venv\\Scripts\\pip install -r requirements.txt'
    );
    expect(expandTokens('{venvpy} -m pytest', 'win32')).toBe(
      '.venv\\Scripts\\python.exe -m pytest'
    );
    expect(expandTokens('{rm} node_modules', 'win32')).toBe('cmd /c rmdir /s /q node_modules');
  });

  it('birden çok belirteci aynı komutta çevirir', () => {
    expect(expandTokens('{venv}python {venvpy}', 'darwin')).toBe(
      '.venv/bin/python .venv/bin/python'
    );
  });

  it('belirteç içermeyen komutu değiştirmez', () => {
    const command = 'flutter channel stable && flutter upgrade';
    expect(expandTokens(command, 'win32')).toBe(command);
  });

  it('bilinmeyen belirteci olduğu gibi bırakır', () => {
    expect(expandTokens('{bilinmeyen} {venv}', 'darwin')).toBe(
      '{bilinmeyen} .venv/bin/'
    );
  });

  it('hatalı iç içe geçmiş belirteçte dokunmaz', () => {
    expect(expandTokens('{venv', 'darwin')).toBe('{venv');
    expect(expandTokens('{ venv }', 'darwin')).toBe('{ venv }');
    expect(expandTokens('{}', 'darwin')).toBe('{}');
  });
});

describe('isPosixOnly', () => {
  it('ham POSIX yollarını yakalar', () => {
    expect(isPosixOnly('.venv/bin/pip install -r requirements.txt')).toBe(true);
    expect(isPosixOnly('.venv\\bin\\pip')).toBe(true);
    expect(isPosixOnly('rm -rf node_modules')).toBe(true);
    expect(isPosixOnly('ls -la')).toBe(true);
    expect(isPosixOnly('cat package.json')).toBe(true);
  });

  it('belirteç kullanan ve platformdan bağımsız komutları yakalamaz', () => {
    expect(isPosixOnly('{venv}pip list')).toBe(false);
    expect(isPosixOnly('{rm} node_modules')).toBe(false);
    expect(isPosixOnly('npm install')).toBe(false);
    expect(isPosixOnly('flutter build apk')).toBe(false);
    expect(isPosixOnly('python manage.py migrate')).toBe(false);
  });

  it('kelime ortasındaki eşleşmeleri yakalamaz', () => {
    expect(isPosixOnly('npm run format')).toBe(false);
    expect(isPosixOnly('git rm -q dosya')).toBe(false);
  });
});
