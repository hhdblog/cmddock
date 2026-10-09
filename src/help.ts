import * as vscode from 'vscode';

/**
 * `Cmdkit: Komut Dosyası Nasıl Kullanılır` komutunun gösterdiği kılavuz.
 *
 * Düz dosya olarak durması bilinçli: içerik eklenti klasöründe ya da sanal
 * belgede, kullanıcı okuyup kopyalayabiliyor. Uzun metin olacağı için
 * `showInformationMessage` yerine önizlenebilir bir Markdown belgesi açılıyor.
 */
export const KULLANIM = `# Cmdkit — komut dosyası nasıl kullanılır

Komutlar **\`cmdkit.groups\`** ayarında yaşar ve ekranda şu sırayla çalışır:

\`Cmd\` düğmesi → grup → komut → terminalde çalışır.

Ama bu ayarı elle düzenlemek zahmetli. Bu yüzden düzenleme işi ayrı bir dosyada:
**\`cmdkit-groups.json\`**.

## Üç adım

1. **\`Cmdkit: Komut Listesini Düzenle\`** → dosya açılır.
   Dosya yoksa ayarlarınla oluşturulur; varsa **üzerine yazılmaz**.
2. Dosyayı düzenle, <kbd>Ctrl</kbd>+<kbd>S</kbd> ile kaydet.
   **Kaydetmek uygulamaz.**
3. **\`Cmdkit: Komut Dosyasını Uygula\`** → ne değişeceğini özetler, onay
   ister, hedefi sorar ve \`settings.json\`'a yazar.

Ayarı değiştirmeden hiçbir komut değişmez. Eklenti her zaman \`settings.json\`'ı
okur, dosyayı değil — aradaki tek bağlantı bu üçüncü adımdır.

Dosyada yorum satırı (\`//\`) kullanabilirsin — dosya JSONC'dir, \`/* */\` blok
yorumları da çalışır. Elle düzenlediğin için yazmak normal; \`#4B8BBE\` gibi bir
renk kodunun neden orada olduğunu not düşmek işe yarar.

Yorum yalnızca tırnak dışında yorumdur: \`"command": "curl https://x/y"\`
satırındaki \`//\` komutun parçasıdır, silinmez.

### Dosya nerede?

Varsayılan **\`<proje>/.vscode/cmdkit-groups.json\`** — dosyanın uygulandığı
yer de \`.vscode/settings.json\`, kaynak ve hedef aynı klasörde duruyor. Proje
açılmadıysa ev dizinine düşer. Yol proje bazlı hatırlanır.

Monorepo'da alt pakete yönlendirmek için \`cmdkit.groupFile\` ayarını kullan:

\`\`\`json
{
  "cmdkit.groupFile": "packages/api/cmdkit-groups.json"
}
\`\`\`

Göreli yollar ilk çalışma alanı köküne göre çözülür, mutlak yollar olduğu gibi
alınır. Yol bir kez hatırlanınca ayar değişikliği etkili olmaz — hatırlanan yol
kazanır.

## Uygulama (import) — iki mod

| Mod | Ne yapar |
|---|---|
| **Grupları birleştir** | Aynı isimli komutlar güncellenir, yeniler eklenir. Gelen listede **olmayanlar silinmez.** |
| **Listeyi değiştir** | Mevcut liste tamamen gelen liste olur. Gelen listede olmayanlar **silinir.** |

Özet **yazılacak sonucu** tarif eder, dosyada ne eksik olduğunu değil. Bu yüzden
\`Grupları birleştir\` modunda \`silinecek\` **hiç görünmez** — birleştirme zaten
silmiyor. Örnekler:

\`\`\`
Grupları birleştir   →   • Git: 15 komut, 1 yeni
Listeyi değiştir     →   • Git: 15 komut, 2 silinecek
\`\`\`

Bir **grup** tamamen siliniyorsa komutlarıyla birlikte kaybolur ve ikonu, rengi
de gider. Özet bunu ayrıca ve gürültülü biçimde bildirir:

\`\`\`
• Node.js: GRUP SİLİNECEK (12 komut, ikon ve renk de kaybolur)
2 grup tamamen silinecek. Bu geri alınamaz — devam etmeden önce komutlarını
başka bir gruba taşımayı düşün.
\`\`\`

Grupların ikonu ya da rengi değişirse özet \`ikon/renk değişti\` der.

Listede gerçekten hiçbir şey değişmiyorsa özet hiç gösterilmez, dosyaya dokunulmaz.

## Silmek

Komutu silmek: dosyadan sil, **\`Listeyi değiştir\`** ile uygula.
\`Grupları birleştir\` silmez, onaylansa bile eski komut kalır.

Grubu silmek için **\`Cmdkit: Grup Kaldır\`** daha güvenli. \`Listeyi değiştir\`
tüm listeyi gelen dosyayla değiştirdiği için, dosya bayattaysa (ör. kütüphaneden
eklenmiş ama dosyaya geçmemiş bir grup) istemediğin gruplar da gider.
\`Grup Kaldır\` yalnızca seçtiğin grubu çıkarır.

Son grup kaldırılamaz — çalıştırılacak komut kalmaz. Bu yüzden liste hiçbir
zaman boşalmaz; boş bir \`[]\` dosyasını uygulamak da reddedilir.

Geri alma yolu yok, kasıtlı: ayarlar dosyası sürüm kontrolünde değil, "son
yazılan liste"tir. Silmeden önce dosyan elinde olduğu için bir şey giderse
dosyadan geri getirip \`Listeyi değiştir\` ile uygulaman yeterli.

## Gruplar arası işaretler

Aynı isimli iki grup yazarsan ikinci düğme de birincisini açar — ayarları elle
yazarken olabiliyor. Grup adlarını farklı tut.

## Nereye yazılır?

\`Komut Dosyasını Uygula\` sonunda hedefi sorar:

- **Bu proje** → \`<proje>/.vscode/settings.json\`
- **Kullanıcı** → global ayarlar, tüm projeler için geçerli

Proje açık değilse soru çıkmaz, doğrudan kullanıcı ayarlarına yazılır.

Proje değeri kullanıcı değerini **gölgeler**. Yani bir projede
\`.vscode/settings.json\` içinde \`cmdkit.groups\` varsa, aynı anda yazdığın
kullanıcı ayarı o projede etkisiz kalır.

## Ekiple paylaşma

Paylaşılacak dosya **\`cmdkit-groups.json\`**. Repoya commit'le, ekip arkadaşın
\`Komut Dosyasını Uygula\` ile kendi ayarlarına alsın.

\`.vscode/settings.json\`'a commit etmek de çalışır ama normalize edilmiş hâlde
yazıldığı için 61 komutta ~100 satır gürültü olur.

## Alan listesi

### Grup

| Alan | Zorunlu | Varsayılan | Ne yapar |
|---|---|---|---|
| \`name\` | evet | — | Menüde başlık, durum çubuğu düğmesinin adı |
| \`icon\` | hayır | \`$(terminal)\` | Durum çubuğu ikonu. Düz ad da olur: \`"zap"\` |
| \`color\` | hayır | tema | Yalnızca bu grubun düğme rengi. \`"#4B8BBE"\` ya da \`charts.blue\` |
| \`commands\` | evet | — | Komut listesi |

### Komut

| Alan | Zorunlu | Varsayılan | Ne yapar |
|---|---|---|---|
| \`name\` | evet | — | Menüde görünen ad |
| \`command\` | evet | — | Çalıştırılacak shell komutu |
| \`icon\` | hayır | \`$(terminal)\` | Komut satırındaki ikon |
| \`description\` | hayır | boş | Menüde sağda gri metin |
| \`confirm\` | hayır | \`false\` | \`true\` ise veya metin verirsen çalıştırmadan önce onay ister |
| \`argsPrompt\` | hayır | — | Çalıştırmadan önce kullanıcıdan değer sorar |
| \`argsSingle\` | hayır | \`false\` | **true ise girdinin tamamı tek argüman olur**, boşluktan bölünmez. \`git commit -m\`, \`psql -c\` gibi serbest metin bekleyen bayraklar için şart |
| \`clear\` | hayır | \`false\` | \`true\` ise terminal temizlenerek çalışır |

**Örnek:**

\`\`\`json
{
  "name": "Git",
  "icon": "$(source-control)",
  "color": "#F14E32",
  "commands": [
    { "name": "durum", "command": "git status", "description": "çalışma ağacı" },
    { "name": "commit", "command": "git commit -m", "argsPrompt": "mesaj (örn. düzeltme)" },
    { "name": "reset", "command": "git reset --hard", "confirm": "Geri alınamaz!" }
  ]
}
\`\`\`

## Platform belirteçleri

Varsayılan gruplar tek metinde yazılı; yol ve silme komutu çalışma anında
platforma göre çözülür.

| Belirteç | macOS / Linux | Windows |
|---|---|---|
| \`{python}\` | \`python3\` | \`python\` |
| \`{venv}\` | \`.venv/bin/\` | \`.venv\\Scripts\\\` |
| \`{venvpy}\` | \`.venv/bin/python\` | \`.venv\\Scripts\\python.exe\` |
| \`{rm}\` | \`rm -rf\` | \`cmd /c rmdir /s /q\` |

\`\`\`json
{ "name": "test", "command": "{venvpy} -m pytest" }
\`\`\`

Bilinmeyen belirteçler (\`{herhangi}\`) olduğu gibi bırakılır.

## Sık takılanlar

**Değişiklik yapmadım gibi görünüyorum.** Kaydettin ama uygulamadın.
\`Komut Dosyasını Uygula\` çalıştır.

**Grup ikonumu değiştirdim, çubukta eski.** Uygulamayı bitir; ayar değişimi
düğmeleri kendiliğinden yeniler.

**Komut sildim ama hâlâ var.** \`Grupları birleştir\` silmez. \`Listeyi değiştir\`
kullan.

**Grubum görünmüyor.** \`commands\` dizisi boş olan gruplar **sessizce yok
sayılır** — eklediğini sanırsın ama menüde çıkmaz. Dosyada en az bir komut
olmalı; şema boş diziyi kırmızı işaretler.

**"İçerik okunamadı" hatası.** Mesaj nedenini söyler: JSON bozuk olabilir,
dosya dizi olmayabilir, komut dizileri boş olabilir, ya da alanlar eksik
olabilir.

**Menüm şişti.** Durum çubuğunda \`maxGroupItems\` (varsayılan 3) ve
\`hiddenGroups\` ayarları var; \`Cmdkit: Durum Çubuğu Düğmelerini Seç\` ile
görünmesi gerekenleri işaretle.

**Daha fazla hazır grup.** \`Cmdkit: Hazır Grup Ekle\` — Docker, Go, Kubernetes,
PostgreSQL, GitHub CLI ve 5 grup daha.
`;

/**
 * Kılavuzu önizlenebilir bir Markdown belgesi olarak açar.
 *
 * Gerçek dosya yazmıyor: içerik sanal belgeye gider, kullanıcı istediğini
 * kopyalayabilir ama eklenti klasörünü kirletmez.
 */
export async function showUsage(): Promise<void> {
  const document = await vscode.workspace.openTextDocument({
    language: 'markdown',
    content: KULLANIM,
  });
  await vscode.window.showTextDocument(document, { preview: true });
}