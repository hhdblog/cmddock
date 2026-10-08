# Cmd Deck

Durum çubuğundaki tek bir öğeyle sık kullandığın terminal komutlarına iki tıkla ulaş.

`Cmd Deck` → komut grubu → komut → terminalde çalışır. Gruplar `settings.json` içinde durduğu için
projeye commit'leyip ekibinle paylaşabilirsin.

## Kurulum

```bash
npm install
npm run build
npm run package            # cmd-deck-0.1.0.vsix üretir
code --install-extension cmd-deck-0.1.0.vsix
```

Geliştirirken VSCode'da bu klasörü açıp <kbd>F5</kbd> ile Extension Development Host başlat.

## Kullanım

| Yapmak istediğin | Ne yapmalısın |
|---|---|
| Komut çalıştır | Durum çubuğundaki **grup ikonuna** tıkla → komut (grup seviyesi atlanır) |
| Tüm gruplardan seç | Durum çubuğundaki `Cmd` düğmesine tıkla → grup → komut |
| Grup seviyesine inmeden ara | <kbd>Ctrl</kbd>+<kbd>P</kbd> → `Cmd Deck: Tüm Komutlarda Ara` |
| Son komutu tekrarla | `Cmd Deck: Son Komutu Tekrar Çalıştır` |
| Windows uyumluluğunu denetle | `Cmd Deck: Platform Uyumluluğunu Kontrol Et` |
| Kullanılabilir ikonları gör | `Cmd Deck: İkon Kataloğu` |

Komut listesinde **en çok kullandıkların üstte** çıkar; sayı eşitse `settings.json` sırası korunur.
Grubun kendi sırası hep ayardaki gibi kalır.

## Durum çubuğu

Durum çubuğunda **her grup kendi ikonuyla ayrı bir düğme** olur; tıklanınca o grubun komutları
doğrudan açılır. `Cmd` düğmesi tüm grupları tek listeden açar. İkisi de isteğe bağlıdır:

```
[⌨ Cmd] [🐍] [📱] [⚙]     ← Cmd + Python, Flutter, Node.js ikonları
```

| Ayar | Varsayılan | Açıklama |
|---|---|---|
| `cmdDeck.statusBar.showGroups` | `true` | Her grup için ayrı düğme gösterir |
| `cmdDeck.statusBar.showMaster` | `true` | `Cmd` düğmesini gösterir |
| `cmdDeck.statusBar.hiddenGroups` | `[]` | Görünmeyecek grup adları: `["Python"]` |
| `cmdDeck.statusBar.groupLabel` | `""` | `"always"` ise ikonun yanına grup adını da yazar |
| `cmdDeck.statusBar.icon` | `terminal` | `Cmd` düğmesinin ikonu. `"zap"` veya `"$(zap)"` yazılabilir |
| `cmdDeck.statusBar.color` | `""` | Ön plan rengi: `#4EC9B0` gibi hex ya da `charts.red` gibi tema rengi |
| `cmdDeck.statusBar.background` | `""` | Arka plan rengi, aynı biçim |
| `cmdDeck.statusBar.priority` | `250` | Düğmelerin sırası (yüksek = daha sol). Başka eklentiyle çakışırsa kaydır |

Grup düğmesinin tooltip'inde grup adı, komut sayısı ve **en çok kullanılan komut**
(`En çok: test (×5)`) görünür. Renk ayarı tüm düğmelere birden uygulanır; boş bırakılırsa
tema kullanılır (şeffaf arka plan).

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
      { "name": "commit", "command": "git commit -m", "argsPrompt": "mesaj" },
      { "name": "reset",  "command": "git reset --hard", "confirm": "Geri alınamaz!" }
    ]
  }
]
```

| Alan | Zorunlu | Açıklama |
|---|---|---|
| `name` | evet | Menüde görünen ad |
| `command` | evet | Çalıştırılacak shell komutu |
| `description` | hayır | Sağda gri metin olarak görünür |
| `icon` | hayır | Kodikon, varsayılan `$(terminal)`. Düz ad da olur (`zap`) |
| `color` | hayır | Durum çubuğundaki **bu grubun** rengi: `#4B8BBE` ya da `charts.blue`. Boşsa `cmdDeck.statusBar.color` uygulanır |
| `confirm` | hayır | `true` veya metin → çalıştırmadan önce onay |
| `argsPrompt` | hayır | Çalıştırmadan önce girdi ister |
| `clear` | hayır | `true` → terminal temizlenerek çalışır |

Kurulumda 3 hazır grup gelir: **Python**, **Flutter**, **Node.js** (toplam 36 komut).
Kendi ayarını yazarsan hazır grupların yerini alır — silmek istersen `"cmdDeck.groups": []`.

36 komutun **hepsinde** anlamlı bir ikon var (`$(beaker)` test, `$(shield)` lint,
`$(cloud-download)` kurulum, `$(trash)` silme, `$(paintcan)` format…). Listeyi düzenlemek için
tek kaynak `examples/default-groups.json`; `npm run sync-defaults` bunu `package.json`'a yazar,
birim testi de ikisinin eşit kaldığını denetler.

| Grup | İkon | Renk |
|---|---|---|
| Python | `$(snake)` | `#4B8BBE` |
| Flutter | `$(device-mobile)` | `#47C5FB` |
| Node.js | `$(server-environment)` | `#83CD29` |

Grup `color` alanı yalnızca durum çubuğu ikonunu boyar (menüde renk gösterilemez, `QuickPickItem`
renk desteklemiyor). Öncelik: grubun kendi `color`'ı → yoksa `cmdDeck.statusBar.color`.

## Komut ekleme / silme / düzenleme

Arayüzden tek tek düzenleme yok; komutlar `cmdDeck.groups` ayarında durur. Toplu taşıma için:

| Komut | Ne yapar |
|---|---|
| `Cmd Deck: Komutları Dışa Aktar` | **Seçim sunar:** panoya kopyalar **ya da** konum seçip dosyaya kaydeder (varsayılan `cmd-deck-groups.json`) |
| `Cmd Deck: Komutları İçe Aktar` | Panodan ya da bir `*.json` dosyasından okur, uygulamadan önce **neyi değiştireceğini özetler** ve onay ister |

Dışa aktarımda "Dosyaya kaydet" seçilirse kaydedilen dosya için **Aç** düğmesi çıkar; içe
aktarımda dosya seçtikten sonra aynı dosya tekrar kullanılabilir — yani liste dosyadan
paylaşılıp her projede geri alınabilir.

İçe aktarımda iki mod var:

- **Grupları birleştir** — aynı isimli komut güncellenir, yeniler eklenir. Gelen listede olmayanlar **silinmez**.
- **Listeyi değiştir** — mevcut liste tamamen gelen liste olur. Gelen listede olmayan komutlar **silinir** (yani silme işlemi bu yolla yapılır).

Yazmadan önce seçilen hedefe göre özet gösterilir (`A: 3 komut, 1 yeni, 1 güncellenecek, 2 silinecek`), sonra **bu proje** (`.vscode/settings.json`) veya **kullanıcı** (global) hedefi sorulur.

Aktarım biçimi `cmdDeck.groups` ile birebir aynıdır ve platform belirteçlerini (`{venv}`, `{rm}` …) olduğu gibi korur.

## Platform belirteçleri

Varsayılan gruplar tek metinde yazılı; yol ve silme komutu çalışma anında platforma göre çözülür.

| Belirteç | macOS / Linux | Windows |
|---|---|---|
| `{python}` | `python3` | `python` |
| `{venv}` | `.venv/bin/` | `.venv\Scripts\` |
| `{venvpy}` | `.venv/bin/python` | `.venv\Scripts\python.exe` |
| `{rm}` | `rm -rf` | `cmd /c rmdir /s /q` |

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
npm test               # 113 birim testi (vitest)
npm run test:integration   # gerçek VSCode içinde smoke test
npm run sync-defaults  # examples/default-groups.json → package.json
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
