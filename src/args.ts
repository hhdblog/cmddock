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
