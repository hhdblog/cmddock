import { describe, expect, it } from 'vitest';
import { parseJsonc, stripJsonComments } from '../../src/jsonc';

/**
 * Yorum temizleyicinin tek işi var: `//` ve blok yorumlarını silmek.
 * Sınamak istediğimiz şey yorumun **kendisi** değil, yorum olmadığı
 * yerlerde hiçbir şeyin değişmemesi — yani dize içindeki yorum işaretleri.
 */

const VALID = '[{"name":"Git","commands":[{"name":"s","command":"git status"}]}]';

describe('yorumsuz JSON', () => {
  it('ayrıştırılır', () => {
    const result = parseJsonc(VALID);
    expect(result.ok).toBe(true);
  });

  it('değer aynen döner', () => {
    const result = parseJsonc(VALID);
    expect(result.ok && result.value).toEqual(JSON.parse(VALID));
  });

  it('temizleme onu bozmaz', () => {
    expect(JSON.parse(stripJsonComments(VALID))).toEqual(JSON.parse(VALID));
  });

  it('yorum yoksa dokunulmaz', () => {
    expect(stripJsonComments(VALID)).toBe(VALID);
  });
});

describe('satır yorumu', () => {
  it('tek başına bir satırda silinir', () => {
    const input = '// not\n[]';
    expect(JSON.parse(stripJsonComments(input))).toEqual([]);
  });

  it('diziden sonra satır sonunda silinir', () => {
    const input = '[{"name":"Git"}] // Git grubu';
    expect(JSON.parse(stripJsonComments(input))).toEqual([{ name: 'Git' }]);
  });

  it('üç satırlık notu siler', () => {
    const input = [
      '// bir',
      '// iki',
      '// üç',
      '[]',
    ].join('\n');
    expect(JSON.parse(stripJsonComments(input))).toEqual([]);
  });

  it('her satırda yorum varsa da çalışır', () => {
    const input = [
      '[',
      '  // grup',
      '  {"name": "Git"} // git',
      ']',
    ].join('\n');
    expect(JSON.parse(stripJsonComments(input))).toEqual([{ name: 'Git' }]);
  });

  it('satırın sonunda yorum kalmışsa boşluk bırakmaz', () => {
    expect(stripJsonComments('[1] // yorum')).toBe('[1] ');
  });
});

describe('blok yorumu', () => {
  it('tek satırlık blok yorumu silinir', () => {
    expect(JSON.parse(stripJsonComments('/* not */ []'))).toEqual([]);
  });

  it('çok satırlık blok yorumu silinir', () => {
    const input = ['/*', ' * not', ' */', '[]'].join('\n');
    expect(JSON.parse(stripJsonComments(input))).toEqual([]);
  });

  it('satır içi blok yorumu silinir', () => {
    expect(JSON.parse(stripJsonComments('[1, /* iki */ 2]'))).toEqual([1, 2]);
  });

  it('virgül yorumun arkasında kalır', () => {
    expect(JSON.parse(stripJsonComments('[1 /*, 2 değil */, 3]'))).toEqual([1, 3]);
  });

  it('kapanmamış blok yorumu sonuna kadar yutar', () => {
    expect(stripJsonComments('[1] /* yarım')).toBe('[1] ');
  });
});

/**
 * Asıl zorluk burada. `//` ve `/*` bir komutun ya da yolun parçası olabilir;
 * bunları silmek komutu bozar.
 */
describe('dize içindeki yorum işaretleri', () => {
  it('// geçen komut bozulmaz', () => {
    const input = '[{"command":"git commit -m \'// sabit\'"}]';
    const result = parseJsonc(input);
    expect(result.ok && (result.value as { command: string }[])[0].command).toBe(
      "git commit -m '// sabit'"
    );
  });

  it('yol içindeki // bozulmaz', () => {
    const input = '[{"command":"curl https://ornek.com/yol"}]';
    const result = parseJsonc(input);
    expect(result.ok && (result.value as { command: string }[])[0].command).toBe(
      'curl https://ornek.com/yol'
    );
  });

  it('yol içindeki /* bozulmaz', () => {
    const input = '[{"command":"echo /*degil*/"}]';
    const result = parseJsonc(input);
    expect(result.ok && (result.value as { command: string }[])[0].command).toBe('echo /*degil*/');
  });

  it('yorum işareti olan komutun yanındaki yorum yine silinir', () => {
    const input = '["https://x/y", // gerçek yorum\n "ikinci"]';
    expect(JSON.parse(stripJsonComments(input))).toEqual(['https://x/y', 'ikinci']);
  });

  it('kaçışlı tırnak kapanış sayılmaz', () => {
    const input = '[{"command":"echo \\"// yorum değil\\""}]';
    const result = parseJsonc(input);
    expect(result.ok && (result.value as { command: string }[])[0].command).toBe('echo "// yorum değil"');
  });

  it('çift ters eğik çizgiden sonraki tırnak kapanış olur', () => {
    const input = '["a\\\\", // yorum\n "b"]';
    expect(JSON.parse(stripJsonComments(input))).toEqual(['a\\', 'b']);
  });
});

describe('hata durumu', () => {
  it('yorum yoksa ve JSON bozuksa hata verir', () => {
    expect(parseJsonc('[{').ok).toBe(false);
  });

  it('yorumlu dosya geçerli JSON değilse hata verir', () => {
    expect(parseJsonc('// not\n[{').ok).toBe(false);
  });

  it('yorum temizlendikten sonra hatayı gizlemez', () => {
    // Yorumlu hâl geçersiz, temizlenmiş hâl de geçersiz: ikisinde de hata.
    // Önemli olan, temizleme hatayı "başarılı"ya çevirmemesi.
    const result = parseJsonc('// not\n{"name": "Git",}');
    expect(result.ok).toBe(false);
  });

  it('kapanmamış dize hata verir', () => {
    expect(parseJsonc('["acik]').ok).toBe(false);
  });

  it('kapanmamış dize sonrası yorum temizlenmez — dosya bozuk kalır', () => {
    expect(parseJsonc('["acik // not').ok).toBe(false);
  });
});

describe('gerçek dünya biçimleri', () => {
  it('tam bir grup listesi yorumlarla aynı sonucu verir', () => {
    const plain = JSON.stringify(
      [
        {
          name: 'Git',
          icon: '$(source-control)',
          color: '#F14E32',
          commands: [{ name: 'status', command: 'git status' }],
        },
      ],
      null,
      2
    );

    const commented = `[
  // sık kullandıklarım
  {
    "name": "Git",
    "icon": "$(source-control)",
    "color": "#F14E32", // kırmızı: VS Code kırmızısı
    "commands": [
      /* günlük */
      { "name": "status", "command": "git status" }
    ]
  }
]`;

    expect(parseJsonc(commented)).toEqual(parseJsonc(plain));
  });

  it('yorumlu dosya yorumlu olmayanla aynı değeri üretir', () => {
    const a = parseJsonc('[{"name":"A","commands":[{"name":"x","command":"run // iki"}]}]');
    const b = parseJsonc('[{"name":"A","commands":[{"name":"x","command":"run // iki"}]}] // not');
    expect(a).toEqual(b);
  });
});