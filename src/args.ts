/**
 * Kullanıcı girdisini argüman dizisine çevirir.
 * Tırnak içindeki boşluklar korunur, tırnaklar sonuçta bulunmaz.
 * Boşlukla ayrılmış düz kelimelerden oluşan basit bir tokenizer.
 */
export function splitArgs(input: string): string[] {
  const args: string[] = [];
  let current = '';
  let quote: '"' | "'" | undefined;
  let quoted = false;

  for (const ch of input) {
    if (quote) {
      if (ch === quote) {
        quote = undefined;
      } else {
        current += ch;
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      quote = ch;
      quoted = true;
      continue;
    }

    if (/\s/.test(ch)) {
      if (current.length > 0 || quoted) {
        args.push(current);
        current = '';
        quoted = false;
      }
      continue;
    }

    current += ch;
  }

  if (current.length > 0 || quoted) {
    args.push(current);
  }

  return args;
}

/**
 * Tek dizeye çevirir: kabuk komut satırı.
 *
 * Neden: `new ShellExecution(command, args)` VSCode 1.141'de **komutun kendisini**
 * tırnaklıyor — `git checkout` boşluk içerdiği için `'git checkout'` olup tek
 * kelimeye dönüyor ve zsh "command not found: git checkout" veriyor. Argümansız
 * çalıştırırken kullanılan tek dize overload'ı ise sorunsuz.
 *
 * O yüzden komutu ve argümanları birleştirip tek dize olarak geçiyoruz; tırnaklama
 * bize kalıyor.
 *
 * Tırnaklama kabuğa göre: POSIX'te tek tırnak, içinde tek tırnak varsa
 * kapat-aç-kaçır. Windows'ta çift tırnak, içinde çift tırnak varsa ikilelenir.
 */
export function buildCommandLine(
  command: string,
  args: readonly string[],
  platform: NodeJS.Platform = process.platform
): string {
  if (args.length === 0) {
    return command;
  }

  const windows = platform === 'win32';
  const quoted = args.map((arg) =>
    windows
      ? `"${arg.replace(/"/g, '""')}"`
      : `'${arg.replace(/'/g, `'\\''`)}'`
  );

  return [command, ...quoted].join(' ');
}
