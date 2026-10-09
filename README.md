# Cmd Deck

Durum çubuğundaki tek bir öğeyle sık kullandığın terminal komutlarına iki tıkla ulaş.

`Cmd Deck` → komut grubu → komut → terminalde çalışır. Gruplar `cmd-deck-groups.json`
dosyasında düzenlenir, `.vscode/settings.json` içine uygulanır; dosyayı commit'leyip
ekibinle paylaşabilirsin.

## Kurulum

```bash
npm install
npm run build
npm run package            # cmd-deck-0.2.0.vsix üretir
code --install-extension cmd-deck-0.2.0.vsix
```

Geliştirirken VSCode'da bu klasörü açıp <kbd>F5</kbd> ile Extension Development Host başlat.

## Kullanım

| Yapmak istediğin                        | Ne yapmalısın                                                            |
| --------------------------------------- | ------------------------------------------------------------------------ |
| Komut çalıştır                          | Durum çubuğundaki **grup ikonuna** tıkla → komut (grup seviyesi atlanır) |
| Tüm gruplardan seç                      | Durum çubuğundaki `Cmd` düğmesine tıkla → grup → komut                   |
| Komut listesini düzenle                 | `Cmd Deck: Komut Listesini Düzenle` → JSON dosyası açılır, düzenle       |
| Hazır grup ekle (Docker, Go, k8s, Surge…) | `Cmd Deck: Hazır Grup Ekle` → kütüphaneden seç                          |
| Grup sil                                | `Cmd Deck: Grup Kaldır` → gruplardan seç                                 |
| Grup seviyesine inmeden ara             | <kbd>Ctrl</kbd>+<kbd>P</kbd> → `Cmd Deck: Tüm Komutlarda Ara`            |
| Son komutu tekrarla                     | `Cmd Deck: Son Komutu Tekrar Çalıştır`                                   |
| Windows uyumluluğunu denetle            | `Cmd Deck: Platform Uyumluluğunu Kontrol Et`                             |
| Kullanılabilir ikonları gör             | `Cmd Deck: İkon Kataloğu`                                                |
| Komut dosyasını nasıl kullanacağımı gör | `Cmd Deck: Komut Dosyası Nasıl Kullanılır`                               |
| Durum çubuğunda hangi gruplar görünsün  | `Cmd Deck: Durum Çubuğu Düğmelerini Seç` (çoklu seçim, işaretle)         |

Komut listesinde **en çok kullandıkların üstte** çıkar; sayı eşitse `settings.json` sırası korunur.
Grubun kendi sırası hep ayardaki gibi kalır.

## Durum çubuğu

Durum çubuğunda **her grup kendi ikonuyla ayrı bir düğme** olur; tıklanınca o grubun komutları
doğrudan açılır. `Cmd` düğmesi tüm grupları tek listeden açar. İkisi de isteğe bağlıdır:

```
[⌨ Cmd] [🐍] [📱] [⚙]     ← Cmd + Python, Flutter, Node.js ikonları
```

| Ayar                              | Varsayılan | Açıklama                                                                                                                                                                                 |
| --------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cmdDeck.groupFile`               | `""`       | Komut dosyasının yolu — bkz. yukarıdaki bölüm                                                                                                                                            |
| `cmdDeck.statusBar.showGroups`    | `true`     | Her grup için ayrı düğme gösterir                                                                                                                                                        |
| `cmdDeck.statusBar.showMaster`    | `true`     | `Cmd` düğmesini gösterir                                                                                                                                                                 |
| `cmdDeck.statusBar.maxGroupItems` | `3`        | Çubukta **başlangıçta** kaç grup düğmesi görünür. Fazlası oluşturulur ama gizli başlar: durum çubuğunda sağ tık → `Hide Status Bar Items` → **Show** ile açabilirsin. **`0` = sınırsız** |
| `cmdDeck.statusBar.hiddenGroups`  | `[]`       | Görünmeyecek grup adları: `["Python"]`                                                                                                                                                   |
| `cmdDeck.statusBar.groupLabel`    | `""`       | `"always"` ise ikonun yanına grup adını da yazar                                                                                                                                         |
| `cmdDeck.statusBar.icon`          | `terminal` | `Cmd` düğmesinin ikonu. `"zap"` veya `"$(zap)"` yazılabilir                                                                                                                              |
| `cmdDeck.statusBar.color`         | `""`       | Ön plan rengi: `#4EC9B0` gibi hex ya da `charts.red` gibi tema rengi                                                                                                                     |
| `cmdDeck.statusBar.background`    | `""`       | Arka plan rengi, aynı biçim                                                                                                                                                              |
| `cmdDeck.statusBar.priority`      | `250`      | Düğmelerin sırası (yüksek = daha sol). Başka eklentiyle çakışırsa kaydır                                                                                                                 |

Grup düğmesinin tooltip'inde grup adı, komut sayısı ve **en çok kullanılan komut**
(`En çok: test (×5)`) görünür. Renk ayarı tüm düğmelere birden uygulanır; boş bırakılırsa
tema kullanılır (şeffaf arka plan).

**Çubuk kıtalması:** Durum çubuğu zaten Pylance, Git, Live Server gibi eklentilerle dolu oluyor;
onlarca ikon eklemek okunmaz hale gelir. Bu yüzden **ilk kurulumda 3** grup düğmesi gösteriliyor.

Bu bir sınır değil, başlangıç değeri: ilk kurulumda 3 grup görünür, beşinci gruplar **gizli**
başlar — düğmeleri yine oluşturulur, bu yüzden durum çubuğunda **sağ tık → `Hide Status Bar Items`
→ `Cmd Deck: Git` / `Cmd Deck: Firebase` işaretine basınca açılırlar**. Açtığın gruplar bir sonraki
komut çalıştırmasında gizlenmez; sadece ayarı değiştirdiğinde sınırlama yeniden uygulanır.

Kalıcı ayar istersen `maxGroupItems: 0` (**sınırsız**) veya `hiddenGroups` ile bazılarını tamamen
kaldırma. Hiç grup düğmesi istemiyorsan `showGroups: false`.

Sıra **ayarlardaki grup sırasına** göre; gösterilmeyen gruplar `Cmd` düğmesinden ve
`Tüm Komutlarda Ara`'dan erişilebilir kalır, `Cmd` tooltip'inde kaç düğmenin gizli olduğunu yazar.

Grup eklediğinde/çıkardığında düğmeler ayar değişikliğiyle kendiliğinden güncellenir — yeniden
yükleme gerekmez. VSCode'un durum çubuğu sağ tık menüsünden de gizleyebilirsin.

**Sağ tıkla tek tek gizlemek:** Durum çubuğuna sağ tıkla → `Hide Status Bar Items` altında her
düğme ayrı ayrı listelenir:

```
Cmd Deck: Tüm Gruplar
Cmd Deck: Python
Cmd Deck: Flutter
Cmd Deck: Node.js
```

Bunun çalışması için iki şey gerekiyor (ikisi de yapıldı):

- **Kimlik:** `createStatusBarItem(id, ...)` ile her düğmeye ayrı id veriliyor
  (`cmd-deck.cmd`, `cmd-deck.group.Python`, …). Kimlik verilmezse hepsi eklenti kimliğine
  düşüyor, menüde tek kalem oluyor ve biri gizlenince hepsi gizleniyor.
- **Ad:** `StatusBarItem.name` set ediliyor. Bu alan menüde görünen etiket; boş bırakılırsa
  menüde her öğe "Cmd Deck (extension)" olarak aynı görünür.

**Sıralama çakışması:** VSCode durum çubuğunu tüm eklentilerin öncelik değerlerine göre sıralar,
yani başka bir eklenti aynı sayıyı kullanırsa düğmelerimizin arasına girer (Live Server `100`
kullandığı için `Cmd` ile grup ikonları arasına girmişti). Kurulu eklentilerin tarandığı değerler
`-1, 0, 1, 100, 1000` çıktı; varsayılan **250** seçildi (200–259 bandı boş). Yine de çakışma
görürsen `cmdDeck.statusBar.priority` değerini kaydır.

**Cmd Deck: İkon Kataloğu** komutu ~120 doğrulanmış kodikonu kategoriler halinde listeler,
ikonları canlı çizer; seçtiğin ad panoya kopyalanır — sonra `statusBar.icon` ya da grup/komut
`icon` alanına yapıştırırsın.

> VSCode ikonları listeleyen bir API sunmadığı için katalog elle tutuluyor. Bu yüzden
> katalogdaki adların tamamı VSCode'un ikon kayıt defteriyle doğrulanarak kondu.

Grup ve komut `icon` alanlarında düz ad da kabul edilir: `"icon": "git-branch"` yazan yazı
olarak görünmez, `$(git-branch)` biçimine çevrilir.

### Cmd menüsü

`Cmd` düğmesi önce grupları listeler, sonra dört bölüme ayrılmış yardımcı menüleri gösterir:

```
$(snake) Python                    12 komut
$(device-mobile) Flutter           12 komut
$(server-environment) Node.js      12 komut

—— komutlar ——
$(search)        Tüm Komutlarda Ara
$(debug-rerun)   Son Komutu Tekrar Çalıştır

—— listeyi düzenle ——
$(json)          Komut Listesini Düzenle
$(sync)          Komut Dosyasını Uygula
$(new-folder)    Hazır Grup Ekle
$(trash)         Grup Kaldır
$(refresh)       Dosyayı Ayarlardan Yenile

—— görünüm ——
$(list-selection) Durum Çubuğu Düğmelerini Seç
$(paintcan)      İkon Kataloğu

—— denetle ve yardım ——
$(check)         Platform Uyumluluğunu Kontrol Et
$(markdown)      Komut Dosyası Nasıl Kullanılır
```

Yardımcı menü **dört bölüme ayrılır** ve sıra **kullanım sıklığına göre** kurulur:
günlük iki komut en üstte, listeyi düzenleme ortada, nadir kullanılanlar en altta.
Yeni komut eklemek için `src/menu.ts` içindeki `MENU_ACTIONS` listesine bir satır ekle ve
`section` alanına bölümünü yaz (`run` / `edit` / `view` / `help`). Sıra tanım yazım
sırasıdır, bölüm sırası `MENU_SECTIONS`. `id` doğrudan çalıştırılacak komut kimliği;
aynı komutlar Komut Paleti'nde de duruyor.

## Hazır grup kütüphanesi

Kurulumla gelen 5 grubun dışında **11 hazır grup** daha var; hepsi tek komutla
eklenir:

`Cmd Deck: Hazır Grup Ekle` → kütüphaneden seç → hedefi sorar → yazar.

| Grup                           | Komut |     | Grup                                      | Komut |
| ------------------------------ | ----- | --- | ----------------------------------------- | ----- |
| `$(package)` Docker            | 9     |     | `$(vm)` Kubernetes                        | 10    |
| `$(source-control)` GitHub CLI | 12    |     | `$(symbol-interface)` Java (Maven/Gradle) | 8     |
| `$(database)` PostgreSQL       | 7     |     | `$(server)` Redis                         | 6     |
| `$(server-environment)` Go     | 10    |     | `$(device-mobile)` Android                | 6     |
| `$(gear)` Rust                 | 10    |     | `$(rocket)` Vercel                        | 5     |
| `$(zap)` Surge                 | 15    |     |                                          |       |

Kurulumda gelenler `configurationDefaults` içinde olduğu için **herkese** gelir;
onu büyütmek istemeyenin menüsünü şişirmemek için bunlar kütüphanede duruyor.
Zaten eklediğin gruplar listede çıkmaz.

Yalnızca **ekler**, silmez — mevcut komutlarına dokunmaz. Silmek için
`Komut Dosyasını Uygula` → `Listeyi değiştir`.

Kütüphane **`src/library.json`** içinde; yeni grup eklemek için oraya bir giriş
yazmak yeterli. `npm run build` bunu okuyup `package.json` içindeki
`configurationDefaults` alanını üretir — **iki dosyayı elle senkronlamak yok**,
`library.json` tek kaynaktır.

`test/unit/library.test.ts` ikonların katalogda olduğunu, grup içi adların
benzersizliğini ve **yıkıcı komutların onay istediğini** otomatik denetler.

## Komutlarını tanımlama

`settings.json` içinde `cmdDeck.groups`:

```jsonc
"cmdDeck.groups": [
  {
    "name": "Git",
    "icon": "$(source-control)",
    "color": "#8BC34A",
    "commands": [
      { "name": "status", "command": "git status", "description": "Çalışma ağacı" },
      { "name": "commit", "command": "git commit -m", "argsPrompt": "mesaj", "argsSingle": true },
      { "name": "reset",  "command": "git reset --hard", "confirm": "Geri alınamaz!" }
    ]
  }
]
```

| Alan          | Zorunlu | Açıklama                                                                                                                                      |
| ------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`        | evet    | Menüde görünen ad                                                                                                                             |
| `command`     | evet    | Çalıştırılacak shell komutu                                                                                                                   |
| `description` | hayır   | Sağda gri metin olarak görünür                                                                                                                |
| `icon`        | hayır   | Kodikon, varsayılan `$(terminal)`. Düz ad da olur (`zap`)                                                                                     |
| `color`       | hayır   | Durum çubuğundaki **bu grubun** rengi: `#4B8BBE` ya da `charts.blue`. Boşsa `cmdDeck.statusBar.color` uygulanır                               |
| `confirm`     | hayır   | `true` veya metin → çalıştırmadan önce onay                                                                                                   |
| `argsPrompt`  | hayır   | Çalıştırmadan önce girdi ister                                                                                                                |
| `argsSingle`  | hayır   | **true ise girdinin tamamı tek argüman olur**, boşluktan bölünmez. `git commit -m`, `psql -c` gibi serbest metin bekleyen bayraklar için şart |
| `clear`       | hayır   | `true` → terminal temizlenerek çalışır                                                                                                        |

Kurulumda 5 hazır grup gelir: **Python**, **Flutter**, **Node.js**, **Git**, **Firebase**
(toplam 61 komut).
Kendi ayarını yazarsan hazır grupların yerini alır — silmek istersen `"cmdDeck.groups": []`.

61 komutun **hepsinde** anlamlı bir ikon var (`$(beaker)` test, `$(shield)` lint,
`$(cloud-download)` kurulum, `$(trash)` silme, `$(paintcan)` format…). Tek kaynak
`src/library.json`'dır; `npm run build` onu okuyup `package.json` içindeki
`configurationDefaults`'ı üretir, birim testi de ikisinin eşit kaldığını denetler.

Aynı dosyada `defaults` (ilk kurulumda gelen 5 grup) ve `groups` (kütüphanedeki 16 grup)
yan yana durur — böylece silinen bir varsayılan grup `Hazır Grup Ekle` ile geri
getirilebilir.

| Grup     | İkon                    | Renk      | Komut |
| -------- | ----------------------- | --------- | ----- |
| Python   | `$(snake)`              | `#4B8BBE` | 12    |
| Flutter  | `$(device-mobile)`      | `#47C5FB` | 12    |
| Node.js  | `$(server-environment)` | `#83CD29` | 12    |
| Git      | `$(source-control)`     | `#F14E32` | 15    |
| Firebase | `$(broadcast)`          | `#FFCA28` | 10    |

Grup `color` alanı yalnızca durum çubuğu ikonunu boyar (menüde renk gösterilemez, `QuickPickItem`
renk desteklemiyor). Öncelik: grubun kendi `color`'ı → yoksa `cmdDeck.statusBar.color`.

## Komut ekleme / silme / düzenleme

Komutlar `cmdDeck.groups` ayarında durur, ama elle düzenlemek için düzenleme
dosyası kullanılır: **VSCode'da açılır, şemayla doğrulanır, sonra ayarlara uygulanır.**

```
Cmd Deck: Komut Listesini Düzenle     →  cmd-deck-groups.json açılır (yoksa ayarlardan yazılır)
   ... düzenle, Ctrl+S ...
Cmd Deck: Komut Dosyasını Uygula      →  özet gösterir, onaylar, settings.json'a yazar
```

| Komut                                 | Ne yapar                                                                                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `Cmd Deck: Komut Listesini Düzenle`   | Dosyayı açar. **Soru sormaz.** Dosya yoksa mevcut ayarlardan oluşturulur; varsa **üzerine yazılmaz** (kaydedilmemiş düzenlemen bozulmasın) |
| `Cmd Deck: Komut Dosyasını Uygula`    | Dosyayı okur, **ne değişeceğini özetler**, onay ister, sonra hedefi seçip yazar                                                            |
| `Cmd Deck: Dosyayı Ayarlardan Yenile` | Dosyayı ayarlardaki güncel liste ile **üzerine yazar** — düzenlemeyi sıfırlamanın yolu                                                     |

Dosya yolu hatırlanır (proje bazlı). Varsayılanı **`.vscode/cmd-deck-groups.json`** —
dosyanın uygulandığı yer de `.vscode/settings.json`, kaynak ve hedef aynı yerde.
Proje açık değilse ev dizinine düşer. Hatırlanan yol yoksa **Komut Dosyasını Uygula**
bir kez dosya seçtirir — böylece başkasının gönderdiği listeyi de alabilirsin.

| Ayar                | Varsayılan | Açıklama                                                                                                                                                        |
| ------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cmdDeck.groupFile` | `""`       | Düzenleme dosyasının yolu. Monorepo'da alt pakete yönlendirmek için: `"packages/api/cmd-deck-groups.json"`. Göreli yollar ilk çalışma alanı köküne göre çözülür |

Dosyada **yorum serbest** (JSONC), otomatik tamamlama ve şema doğrulaması çalışır:
`schemas/cmd-deck-groups.json` hem `name`/`command` zorunluluğunu hem de yazım
hatalarını (`descrition` gibi) kırmızı gösterir. Bilinmeyen alan reddedilir.

Dosyayı elle düzenlediğin için dışa aktarım **normalize edilmiş** hâli değil ham
listeyi yazar; `description: ""`, `confirm: false` gibi gereksiz alanlar sızmaz.
Aynı ayıklama `settings.json`'a yazarken de yapılır, orada da yalnızca gerçekten
ayarladığın alanlar durur — 61 komutta `confirm: false` ve `clear: false` başına
~106 satır gürültü geride kalmaz. Alanlar okunurken zaten geri doldurulduğu için
hiçbir ayar kaybolmaz.

> `settings.json`'ı elle düzenlemen gerekmiyor; ekip arkadaşın `Komut Dosyasını
Uygula` ile kendi dosyasına alsın. Paylaşılacak dosya `cmd-deck-groups.json`.

### Uygulama (import)

İki mod var:

- **Grupları birleştir** — aynı isimli komut güncellenir, yeniler eklenir. Gelen listede olmayanlar **silinmez**.
- **Listeyi değiştir** — mevcut liste tamamen gelen liste olur. Gelen listede olmayan komutlar **silinir** (yani silme işlemi bu yolla yapılır).

Yazmadan önce özet gösterilir, sonra **bu proje** (`.vscode/settings.json`) veya
**kullanıcı** (global) hedefi sorulur.

Özet **yazılacak sonucu** tarif eder, gelen dosyada ne eksik olduğunu değil. Bu
yüzden `Grupları birleştir` modunda `silinecek` **hiç görünmez** — birleştirme
zaten silmiyor. Örnekler:

```
Grupları birleştir   →   • Git: 18 komut, 1 yeni
Listeyi değiştir     →   • Git: 17 komut, 1 silinecek
```

Gerçekten hiçbir şey değişmiyorsa özet hiç gösterilmez, doğrudan "hiçbir şey
yazılmadı" bildirimi çıkar ve dosyaya dokunulmaz.

Listede gerçekten hiçbir şey değişmiyorsa dosyaya hiç dokunulmaz — "hiçbir şey yazılmadı"
bildirimi çıkar. (Özet normalize edilmiş alanları karşılaştırdığı için, yalnızca
biçimsel farkları bu adım yakalamaz.)

Dosya biçimi `cmdDeck.groups` ile birebir aynıdır ve platform belirteçlerini
(`{venv}`, `{rm}` …) olduğu gibi korur. Panoya kopyalama yolu kaldırıldı: listeyi
paylaşmak için ya dosyayı commit'le (ekip arkadaşın `Komut Dosyasını Uygula` ile
kendi ayarlarına alsın) ya da uyguladıktan sonra `.vscode/settings.json`'u commit'le.
İkincisi daha uzun ve gürültülü; ilki daha temiz.

## Platform belirteçleri

Varsayılan gruplar tek metinde yazılı; yol ve silme komutu çalışma anında platforma göre çözülür.

| Belirteç   | macOS / Linux      | Windows                    |
| ---------- | ------------------ | -------------------------- |
| `{python}` | `python3`          | `python`                   |
| `{venv}`   | `.venv/bin/`       | `.venv\Scripts\`           |
| `{venvpy}` | `.venv/bin/python` | `.venv\Scripts\python.exe` |
| `{rm}`     | `rm -rf`           | `cmd /c rmdir /s /q`       |

```jsonc
{ "name": "test", "command": "{venvpy} -m pytest" }
```

Bilinmeyen belirteçler (`{herhangi}`) olduğu gibi bırakılır.

## Davranış notları

- Komutlar **terminalde** çalışır (`tasks.executeTask`), çıktıyı normal şekilde izlersin.
- Tüm komutlar **tek terminali** paylaşır; arka arda çalıştırdıkça alt alta eklenir.
- Argümanlar ayrı ayrı geçirilir, tırnaklı yollar (`"benim dosyam.txt"`) bozulmaz.
- `&&` ve `|` içeren komutlar sorunsuz çalışır.
- `flutter run`, `npm run dev` gibi uzun süreli komutlar terminali açık tutar, <kbd>Ctrl</kbd>+<kbd>C</kbd> ile durur.
- Uzaktan (SSH/WSL) gelişmede komut uzak terminalde çalışır.
- Kullanım sayaçları proje bazlı saklanır (`workspaceState`), `settings.json` dosyan kirletilmez.

## Geliştirme

```bash
npm run typecheck      # tsc --noEmit
npm test               # 332 birim testi (vitest)
npm run test:integration   # gerçek VSCode içinde smoke test
npm run sync-defaults  # src/library.json → package.json (defaults)
npm run icon           # media/icon.png üret
npm run watch          # esbuild watch
```

`test:integration` varsayılan olarak VSCode indirir. İndirme yapmadan yerel kurulumu kullanmak için:

```bash
VSCODE_TEST_EXECUTABLE="/Applications/Visual Studio Code.app/Contents/MacOS/Electron" npm run test:integration
```

Tasarım kararları ve uygulama günlüğü: `PLAN.md` (depo kökünde).

## Lisans

MIT

git deneme amaçlı değişti.
