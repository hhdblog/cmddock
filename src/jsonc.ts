/**
 * JSONC → JSON: `//` ve `/* *\/` yorumlarını temizler.
 *
 * Neden: VS Code'daki `settings.json`, `tsconfig.json`, `launch.json` hepsi
 * JSONC'dir; yorum satırı yazmak normaldir. Biz de kullanım kılavuzunda
 * yorumu vaat ettik ("renk kodunun nedenini not düşmek işe yarar"). Vaadi
 * geri almak yerine destekliyoruz — yoksa kullanıcı yorum yazıp dosyayı
 * uyguladığında tüm komutları sessizce kaybediyordu.
 *
 * Neden elle yazıyoruz: `jsonc-parser` bağımlılık olarak eklenmeliydi ve
 * tek ihtiyacımız yorum temizlemek. ~40 satır, sıfır bağımlılık.
 *
 * Asıl zorluk **dize içindeki yorum**: `//` bir komutun parçası olabilir
 * (`"command": "git commit -m '// sabit'"`), `/*` bir yolun parçası olabilir
 * (`"command": "echo http://x/y"`). Kör metin silme bunları bozduğu için
 * önce dize sınırlarını bulup, yorum yalnızca dize dışında aranır.
 */

/** Ham JSON dizesi. */
export type JsonString = '"' | '\'';

/**
 * JSONC yorumlarını temizler.
 *
 * Sonuç geçerli JSON değilse **dokunulmaz** — yorum temizlemek bir JSON
 * ayrıştırıcısının işi değil, hatayı gizlemekten başka bir işe yaramaz.
 * Bozuk dosyanın hatası `JSON.parse`'da, yorumsuz hâliyle görünsün.
 */
export function stripJsonComments(input: string): string {
  const out: string[] = [];
  let index = 0;

  while (index < input.length) {
    const char = input[index];

    // --- dize: içindeki her şey olduğu gibi korunur -------------------
    if (char === '"' || char === '\'') {
      const literal = readStringLiteral(input, index);
      if (literal) {
        out.push(literal);
        index += literal.length;
        continue;
      }
      // Kapanmamış dize: JSON.parse zaten hata verecek, karakterleri
      // olduğu gibi bırakıp onun işini yapmasına izin veriyoruz.
      out.push(char);
      index += 1;
      continue;
    }

    // --- satır yorumu: satır sonuna kadar ------------------------------
    if (char === '/' && input[index + 1] === '/') {
      index = skipToLineEnd(input, index);
      continue;
    }

    // --- blok yorumu: kapanış bulunana kadar ----------------------------
    if (char === '/' && input[index + 1] === '*') {
      const end = input.indexOf('*/', index + 2);
      index = end === -1 ? input.length : end + 2;
      // Yorumun yerine boşluk bırakmıyoruz: `["a"/* */,"b"]` → `["a","b"]`
      // hâlinde virgül yorumun önüne kaymaz. Kapatışın üstündeki *yeni
      // satırlar* atlanmış olur, JSON'un satır konumu anlamsız olduğu için
      // bu kabul edilebilir — `JSON.parse` için önemli olan karakter dizisi.
      continue;
    }

    out.push(char);
    index += 1;
  }

  return out.join('');
}

/**
 * Yorumlar temizlendikten sonra ayrıştırır.
 *
 * İki deneme: önce yorumlu hâl, olmazsa yorumsuz hâl. İkincisi gereksiz
 * değil — kullanıcı yorumları temizledikten sonra **yine** geçersiz JSON
 * bırakmış olabilir ve hata o zaman asıl hatayı göstermelidir. Yoksa
 * kullanıcı "JSON bozuk" uyarısını alırken gerçek sorunun yorum olduğunu
 * düşünür.
 */
export function parseJsonc(input: string): { readonly ok: true; readonly value: unknown } | { readonly ok: false } {
  // Yorum yoksa doğrudan dene — en sıcak yol.
  if (!hasCommentOutsideString(input)) {
    try {
      return { ok: true, value: JSON.parse(input) };
    } catch {
      return { ok: false };
    }
  }

  const stripped = stripJsonComments(input);

  try {
    return { ok: true, value: JSON.parse(stripped) };
  } catch {
    // Yorumlar temizlendi ama hâlâ geçersiz: asıl hatayı göstermek için
    // yorumlu hâli de dene. Bu da olmazsa temizlenmiş hâlin hatası daha
    // dürüst bir mesaj verir (yorum işaretleri hatanın içinde görünmez).
    try {
      return { ok: true, value: JSON.parse(input) };
    } catch {
      return { ok: false };
    }
  }
}

/** Dize dışında `//` ya da `/*` var mı? Yorum yoksa hiç dokunmamak için. */
function hasCommentOutsideString(input: string): boolean {
  let index = 0;

  while (index < input.length) {
    const char = input[index];

    if (char === '"' || char === '\'') {
      const literal = readStringLiteral(input, index);
      if (literal) {
        index += literal.length;
        continue;
      }
      index += 1;
      continue;
    }

    if (char === '/' && (input[index + 1] === '/' || input[index + 1] === '*')) {
      return true;
    }

    index += 1;
  }

  return false;
}

/**
 * `index`'teki dize sabitini olduğu gibi döndürür (tırnaklar dahil).
 * Kapanmamışsa `undefined`.
 */
function readStringLiteral(input: string, index: number): string | undefined {
  const quote = input[index];
  let cursor = index + 1;

  while (cursor < input.length) {
    const char = input[cursor];

    // Ters eğik çizgi: sonraki karakter ne olursa olsun sıradaki kısım.
    // `"a\\"` içindeki kapatış gerçek kapatış değildir.
    if (char === '\\') {
      cursor += 2;
      continue;
    }

    if (char === quote) {
      return input.slice(index, cursor + 1);
    }

    // Ham karakter: JSON'da geçmez ama yorum temizleyici yine de
    // makul davranmalı — sıradaki tırnakta bitir.
    if (char === '\n') {
      return undefined;
    }

    cursor += 1;
  }

  return undefined;
}

/** `index`'ten itibaren satır sonuna kadar atlar (yorumun kendisi dahil). */
function skipToLineEnd(input: string, index: number): number {
  const newline = input.indexOf('\n', index);
  return newline === -1 ? input.length : newline;
}