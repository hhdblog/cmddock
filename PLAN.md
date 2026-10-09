# cmdkit — VSCode durum çubuğu terminal komut paneli

Durum çubuğundaki bir öğeye tıkla → grup seç → komut seç → komut terminalde çalışsın.

## 1. Kararlı API üzerine kurulu mu?

Evet. Kullanılacak tüm API'ler stabil sürümde (`stable`):

| İhtiyaç | API | Durum |
|---|---|---|
| Durum çubuğu öğesi | `window.createStatusBarItem(StatusBarAlignment.Right, 100)` | stable |
| Tıklamayı komuta bağlama | `statusBarItem.command = 'cmdkit.open'` | stable |
| İki kademeli menü | `window.showQuickPick()` (ardışık iki çağrı) | stable |
| Komutu terminalde çalıştırma | `tasks.executeTask({ type:'shell', command, options })` | stable |
| Yapılandırma okuma | `workspace.getConfiguration('cmdkit')` | stable |
| Ayar değişimini dinleme | `workspace.onDidChangeConfiguration` | stable |
| Kalıcı sayaç | `ExtensionContext.workspaceState` | stable |

Deneysel API, `enabledApiProposals` veya VSCode önizleme sürümü gerekmiyor.

## 2. Mimari karar: kaynak gerçekliği nerede?

**Gruplar ve komutlar `settings.json` içinde** (`cmdkit.groups`), kullanım sayaçları `workspaceState` içinde.

Gerekçe:
- Gruplar elle düzenlenebilir, git'e commit'lenip ekip ile paylaşılabilir.
- `onDidChangeConfiguration` ile canlı yenileme; yeniden yükleme (reload) gerekmez.
- Sayaçları ayarlara yazmak kullanıcının dosyasını kirletirdi.

```jsonc
"cmdkit.groups": [
  {
    "name": "Git",
    "icon": "$(source-control)",
    "commands": [
      { "name": "status",  "command": "git status",   "description": "Çalışma ağacı" },
      { "name": "commit",  "command": "git commit -m", "argsPrompt": "mesaj", "clear": false },
      { "name": "reset",   "command": "git reset --hard", "confirm": "Geri alınamaz!" }
    ]
  },
  { "name": "Docker", "icon": "$(vm)", "commands": [ /* ... */ ] }
]
```

Komut alanları:

| Alan | Tip | Varsayılan | Açıklama |
|---|---|---|---|
| `name` | string | — | Menüde görünen kısa ad |
| `command` | string | — | Shell komutu (tek satır) |
| `description` | string | `""` | Sağdaki gri metin |
| `icon` | string | `$(terminal)` | Codicon (`$(zap)` gibi) |
| `confirm` | string \| bool | `false` | Çalıştırmadan önce onay metni |
| `argsPrompt` | string | — | Varsa çalıştırmadan önce girdi ister, boşluğa göre argümanlara böler |
| `clear` | bool | `false` | `true` ise terminal temizlenerek çalışır |

## 2.1 Varsayılan gruplar (3 grup)

Kurulumda hazır gelen gruplar: **Python**, **Flutter**, **Node.js**. Tam tanım
`examples/default-groups.json` içinde; `package.json` içindeki
`contributes.configurationDefaults` altına aynen kopyalanacak.

| Grup | ikon | kapsam |
|---|---|---|
| Python | `$(symbol-variable)` | venv, pip, pytest, black/ruff/mypy, jupyter |
| Flutter | `$(device-mobile)` | pub get/run, build apk·web·ios, analyze, test, clean |
| Node.js | `$(server-environment)` | install/ci, build, dev, test, tsc, audit, link |

Seçim mantığı:
- Her grupta 10–12 komut: "ne sıklıkla çalışıyorsa" sıralaması hedeflendi.
- Uzun süreli komutlar (`flutter run`, `npm run dev`, `jupyter lab`) `description` ile uyarıldı — terminal açık kalır, `Ctrl+C` ile durur.
- Yıkıcı olanlarda `confirm` zorunlu: `flutter clean`, `npm audit fix`, `rm -rf node_modules`.
- Değişken isteyenlerde `argsPrompt`: `paket kur`, `dosya çalıştır`, `global bağla`.
- Uzun süre derleyenlerde `clear: true`: `npm ci`, `build apk/web/ios`.

Önemli karar — **sanal ortam kalıcı değildir.** Her görev ayrı bir shell açtığı için
`source .venv/bin/activate` bir sonraki komuta taşınmaz. Bu yüzden Python grubunda
sanal ortam yolu (`venv/bin/...`) her komutta açıkça yazılıdır; kurulum yapılmadıysa
kullanıcı bu komutları `python3 -m pip ...` biçiminde kendisi düzenler.

## 3. Dosya yapısı

```
cmdkit/
├── PLAN.md
├── package.json          # manifest + contributes + scripts
├── tsconfig.json
├── esbuild.mjs           # paketleme (tek dosya bundle)
├── .vscodeignore
├── .gitignore
├── README.md
├── LICENSE
├── vitest.config.mts    # birim testleri (vscode → stub takma yolu)
├── scripts/
│   └── make-icon.mjs    # media/icon.png üretici (bağımlılıksız PNG kodlayıcı)
├── media/icon.png       # 128x128 uzantı ikonu
├── examples/
│   └── default-groups.json  # varsayılan listenin TEK kaynağı (npm run sync-defaults)
├── src/
│   ├── extension.ts      # activate/deactivate, komut kayıtları
│   ├── statusBar.ts      # durum çubuğu öğesi + ayar değişimi dinleyici
│   ├── config.ts         # vscode tarafı: ayar okuma (getGroups)
│   ├── normalize.ts      # SAF: tipler + şema normalizasyonu (vscode bağımsız, test edilebilir)
│   ├── args.ts           # SAF: kullanıcı girdisi → argüman dizisi (tırnak destekli)
│   ├── tokens.ts         # SAF: {python}/{venv}/{venvpy}/{rm} platform belirteçleri
│   ├── platform.ts       # Windows uyarısı + panoya Windows karşılığı kopyalama
│   ├── transfer.ts       # SAF: JSON serileştirme, birleştirme, içe aktarım planı
│   ├── style.ts          # SAF: parseIcon (düz ad → $(ad)) ve parseColor (hex/tema)
│   ├── icons.ts          # doğrulanmış kodikon kataloğu (~120 ad, 10 kategori)
│   ├── iconCatalog.ts    # katalog penceresi: canlı ikon + panoya kopyalama
│   ├── plan.ts           # SAF: durum çubuğu öğelerinin planı (düğme, metin, ad, kimlik, öncelik, renk, grup sınırı)
│   ├── menu.ts           # SAF: Cmd menüsünün "diğer menüler" listesi
│   ├── settings.ts       # pano/dosya seçimi + cmdkit.groups ayarına yazma
│   ├── picker.ts         # iki kademeli QuickPick (grup → komut)
│   ├── runner.ts         # confirm, argsPrompt, executeTask + ShellExecution
│   └── usage.ts          # workspaceState sayaçları, sıralama, son komut çözümleme
└── test/
    ├── runTest.ts        # @vscode/test-electron giriş noktası
    ├── stubs/vscode.ts   # birim testleri için vscode takma yolu
    ├── unit/*.test.ts    # 68 birim testi (vitest)
    └── suite/
        ├── index.ts      # mocha girişi (out/test/suite/*.test.js toplanır)
        └── extension.test.ts  # gerçek VSCode'da 4 smoke testi
```

## 4. Uygulama adımları

### Adım 1 — İskelet (build edilebilir, çalışan ama boş eklenti) — ✅ TAMAMLANDI
1. `npm init`, ardından `npm i -D typescript esbuild @types/vscode @types/node @vscode/vsce`
2. `esbuild.mjs`: `src/extension.ts` → `dist/extension.js`, `external: ['vscode']`, `format: 'cjs'`, `sourcemap`
3. `package.json`: `main`, `engines.vscode: ^1.90.0`, `activationEvents: []`
   (VSCode ≥1.74 `contributes.commands` içinden `onCommand` aktivasyonunu kendisi üretir, elle yazmaya gerek yok)
4. `contributes.commands`: `cmdkit.open`, `cmdkit.search`, `cmdkit.runLast`, `cmdkit.reload`
5. `contributes.configuration` → `cmdkit.groups` şeması + `configurationDefaults` ile 3 varsayılan grup
6. Doğrulama: `npm run typecheck` ✔, `npm run build` ✔, `npm run package` ✔ (10.02 KB vsix), izole dizine kurulum ✔

Sürüm kararı: yerel VSCode **1.141.0**, ancak `engines.vscode` bilinçli olarak `^1.90.0`
(kullanılan API'ler çok daha eski → geniş uyumluluk). Bu engel olmaması için
`@types/vscode` **`~1.90.0`** sabitlendi: derleme yeni API kullanımını (ör. yeni Task API'si)
hata olarak yakalar. Kullanılan araç sürümleri: TypeScript 7, esbuild 0.28, vsce 4.


### Adım 2 — Çekirdek akış — ✅ TAMAMLANDI
1. `statusBar.ts`: `StatusBarAlignment.Right`, öncelik `100`, metin `$(terminal) cmd`, `tooltip`, `show()`,
   `onDidChangeConfiguration` + `affectsConfiguration('cmdkit')` ile canlı yenileme
2. `picker.ts` sıralı iki `showQuickPick`: grup → komut. Komut satırı `detail`, kullanıcı açıklaması
   `description`; `matchOnDetail` ile shell metnine göre arama
3. `runner.ts`: `tasks.executeTask` + `ShellExecution`, `TaskScope.Workspace`,
   `panel: Shared` + sabit `TaskDefinition` → tek terminal, `clear: cmd.clear`, `focus: false`,
   `try/catch` ile `showErrorMessage`
4. `deactivate`: dispose `context.subscriptions` üzerinden otomatik (elle `dispose()` gerekmiyor)
5. **Sapma:** `confirm` ve `argsPrompt` Adım 4'ten öne alındı. Varsayılan gruplarda 3 yıkıcı komut
   (`flutter clean`, `npm audit fix`, `rm -rf node_modules`) var; bunlar onaysız çalışırsa ayar
   dosyasındaki hatalı bir öğe doğrudan veri kaybettirir. Doğrulama ekranı aynı pakette geldiği
   için iki adım arasında riskli bir boşluk bırakmamak için taşındı.
6. Ek tasarım kararı: `normalize.ts` ve `args.ts` `vscode` importu içermiyor, bu sayede
   `tsc --noEmit` dışında node üzerinde de doğrulanabiliyor (aşağıdaki test çıktısı).

Doğrulama: `typecheck` ✔ · `build` ✔ (9.0 KB) · `package` ✔ (12.09 KB) · izole kurulum ✔ ·
saf mantık testi ✔ (36 komut normalize edildi, bozuk veri çökmüyor, `splitArgs` 7/7 test)

### Adım 3 — Kullanım kolaylığı — ✅ TAMAMLANDI
1. `usage.ts`: `workspaceState` sayaçları (`cmdkit.usage` = key → `{count, lastRun}`),
   son komut (`cmdkit.last` = `{group, name}`). Anahtar `grup\u001fkomut` — isim çakışmalarına kapalı.
   Bozuk state → boş harita, çökme yok.
2. `cmdkit.search`: `pickAnyCommand` tüm grupları tek listeye düşürür, `description`'da grup,
   `detail`'da shell metni, ikisinde de filtreleme açık.
3. `cmdkit.runLast`: `resolveLast` son komutu **güncel ayarlardan** çözer; komut silinmişse
   "artık ayarlarda yok" mesajı, hiç çalıştırılmamışsa "henüz çalıştırılmadı".
4. `configurationDefaults`: 3 varsayılan grup ✔ (Adım 1'de yapıldı)
5. Durum çubuğu tooltip'i artık grup/komut sayısı + son komut + toplam çalıştırma gösterir.
6. **Tasarım kararı:** grupların kendi sırası **ayardaki gibi kalır**, sadece grup *içindeki*
   komutlar kullanım sayısına göre sıralanır. Grupları da kullanıma göre karıştırmak
   Python/Flutter/Node.js sırasını bozuyordu — komut sırası ise tam istenen davranış.

Doğrulama: `typecheck` ✔ · `build` ✔ (13.2 KB) · `package` ✔ (13.53 KB) · izole kurulum ✔ ·
saf mantık testi ✔ (5× "kur" → üste çıktı, "test" ikinci, kullanılmayanlar ayar sırasında kaldı,
grup sırası Python > Flutter > Node.js olarak korundu, bozuk state ve silinmiş komut çökmüyor)

### Adım 4 — Güvenlik ve platform uyumu — ✅ TAMAMLANDI
1. `confirm` alanı → `showWarningModal` ✔ (Adım 2); onay metnine **gerçek çalışacak komut** yazılır
2. `argsPrompt` girdisi `InputBox` ile alınır, **argüman dizisi olarak** geçilir ✔ (Adım 2,
   tokenizer `args.ts` içinde: tırnak içindeki boşluklar korunur)
3. **Platform belirteçleri** (`src/tokens.ts`, saf + test edilebilir). Varsayılan gruplarda tek metin
   yazılı, yol/silme komutu çalışma anında çözülüyor:

   | belirteç | macOS/Linux | Windows |
   |---|---|---|
   | `{python}` | `python3` | `python` |
   | `{venv}` | `.venv/bin/` | `.venv\Scripts\` |
   | `{venvpy}` | `.venv/bin/python` | `.venv\Scripts\python.exe` |
   | `{rm}` | `rm -rf` | `cmd /c rmdir /s /q` |

   Bilinmeyen belirteçler (`{yok}`) olduğu gibi bırakılır — kullanıcının `{...}` yazan komutu bozulmaz.
4. `platform.ts`: Windows'ta **bir kez** uyarı (globalState bayrağı), `cmdkit.checkPlatform` ile elle
   tetiklenebilen kontrol. Sorunlu komut seçilince Windows karşılığı **panoya kopyalanır**;
   ayarları uzantı kendisi yazmaz (kullanıcı bilinçli yapıştırır).
5. Varsayılanlardaki ham POSIX yolları (`rm -rf node_modules`) `{rm}` ile değiştirildi;
   `package.json` ve `examples/default-groups.json` senkron.

Doğrulama: `typecheck` ✔ · `build` ✔ (17.0 KB) · `package` ✔ (15.08 KB) · izole kurulum ✔ ·
belirteç testi ✔ (macOS: `python3 -m venv .venv`, Windows: `python -m venv .venv` +
`.venv\Scripts\pip install -r requirements.txt` + `cmd /c rmdir /s /q node_modules`;
varsayılanlarda POSIX yolu kalmadı, bilinmeyen belirteç bozulmadı)

**Tuzak notu:** `vscode.ShellQuoting` enumu ile `ShellExecutionOptions.shellQuoting` **farklı tiplerdir**
(biri `ShellQuotedString` için, diğeri karakter kaçış ayarı için). Argümanlar düz `string[]` olduğu için
varsayılan quoting bırakıldı — VSCode'in varsayılanı boşlukları doğru escape ediyor.

### Adım 5 — Test + paket — ✅ TAMAMLANDI1. **Birim testler** (vitest, 48 test): `normalize` (16), `args` (9), `tokens` (16), `usage` (23).
   `vitest.config.mts` içinde `vscode` → `test/stubs/vscode.ts` takma yolu, böylece testler
   VSCode'suz saniyeler içinde koşar. Saf modüller sayesinde mümkün oldu.
2. **Entegrasyon testi** (`@vscode/test-electron` + mocha): gerçek VSCode içinde 7 test —
   manifest açılışta etkinleşmeyi istiyor, uzantı **kendiliğinden** etkinleşiyor,
   manifestteki **tüm** komutlar kayıtlı (drift koruması),
   varsayılan gruplar okunuyor (≥3 grup, ≥36 komut, `{venvpy}` mevcut), komutlar çökmeden çalışıyor,
   komut gerçekten terminal görevi başlatıyor, onay reddedilince komut **çalışmıyor**.
   `VSCODE_TEST_EXECUTABLE` verilirse VSCode indirilmez, yerel kurulum kullanılır.
3. `README.md` (Türkçe): kurulum, kullanım, ayar şeması, belirteç tablosu, davranış notları.
   Marketplace'te bağlantı kırılmasın diye `PLAN.md` bağlantısı düz metin bırakıldı
   (uydurma repo URL'si yazmamak için).
4. `media/icon.png` — `scripts/make-icon.mjs` ile **bağımlılıksız** üretiliyor (kendi PNG kodlayıcısı,
   4x süper örnekleme). `npm run icon` ile yeniden üretilebilir.
5. `package.json` → `icon`, `test` / `test:integration` / `icon` scriptleri.

Doğrulama: `typecheck` ✔ · `vitest` 48/48 ✔ · **entegrasyon 4/4 gerçek VSCode 1.141.0'da** ✔ ·
`package` ✔ (19.1 KB, ikon ve readme dahil) · izole kurulum ✔

Not: Entegrasyon testinin ilk denemesinde `await import()` ile TS kaynağı yüklenemedi
(çalışma anında `.ts` derlenmiyor) → statik import'a çevrildi, esbuild paketliyor.

## 5. Tasarım sırasında verilen kararlar

| Karar | Gerekçe |
|---|---|
| Ardaşık iki `showQuickPick` | `createQuickPick` ile iki kademe + `dispose()` unutulursa sızıntı. Sıralı çağrıda yönetilecek kaynak yok. |
| `tasks.executeTask` | Çıktı terminalde görünür, `cwd` ve shell kullanıcı ayarlarından gelir, shell integration (kısayollar, çıkış kodu) çalışır. |
| `child_process` yok | Terminal yok, çıktı gösterilmiyor, shell entegrasyonu yok; kullanıcı "terminal komutu" istiyor. |
| `terminal.sendText` yok | `createTerminal` hemen ardından yazıldığında shell hazır olmadığı için karakter kaybı yaşanır (klasik bug). |
| Sayaç `workspaceState` içinde | Ayar dosyası kirletilmez, repo temiz kalır. |
| Menü sıralaması: kullanım sayısı, eşitlikte manuel sıra | "Sık kullandıklarım" varsayımı otomatik öğrenir. |

## 6. Bilinen tuzaklar (uygulama sırasında kontrol listesi)

- [ ] `deactivate` içinde `StatusBarItem.dispose()` — unutulursa yeniden yüklemede eski öğe kalır
- [ ] `executeTask` `try/catch` içinde — görev reddedilirse kullanıcı habersiz kalmasın
- [ ] `executeTask` çağrısında `scope` verilmezse task `window` scope'una düşer, terminal açılmayabilir → `scope: vscode.TaskScope.Workspace`
- [ ] `showQuickPick` boş dönerse (`undefined`) çalıştırma — `Esc` de bu yolu verir
- [ ] Komut satırında `&&`, `|` varsa `ShellExecution` doğru davranır (shell'e gider); `ProcessExecution` seçilirse kırılır
- [ ] Ayar değişikliğinde yalnızca `cmdkit` altındaki anahtarlara bakılmalı, `affectsConfiguration` filtresi kullanılmalı
- [ ] Uzun komut listelerinde `QuickPick` `matchOnDescription`/`matchOnDetail` ayarları sıralamayı bozabilir, bilinçli karar verilmeli
- [ ] Uzak (SSH/WSL) ortamda `workspaceFolders[0].uri.fsPath` uzak yoldur — terminal de uzak olduğu için tutarlı, `cwd` boş bırakılmamalı
- [ ] Varsayılanlar POSIX yol kullanıyor (`.venv/bin/...`) — Windows'ta `.venv/Scripts/...` gerekir, ilk açılışta uyarılmalı
- [ ] `flutter build ios` yalnızca macOS'ta çalışır, grup yazılırken platform notu düşülmeli
- [ ] Pencere açılmadan `cmdkit.runLast` çağrılırsa "önce bir komut çalıştırın" mesajı

## 7.1 `.vscode/launch.json` ve entegrasyon testinin bulduğu hata

`.vscode/launch.json` eklendi (dosya yoksa F5 "hata ayıklayıcı seç" listesi açıyor):
`Cmdkit: Run` (`preLaunchTask: npm: build`) ve `Cmdkit: Watch` (`npm: watch`).

Entegrasyon testine **görev çalıştırma** ve **onay reddi** senaryoları eklendi. İlk çalıştırma
gerçek bir hata yakaladı:

```
Variable workspaceFolder can not be resolved. Please open a folder.
```

Klasör açık değilken `cwd: undefined` bırakılırsa VSCode varsayılan olarak
`${workspaceFolder}` değişkenini çözmeye çalışıyor ve **görev hiç başlamıyordu** —
kullanıcı hiçbir hata mesajı da görmüyordu. Düzeltme: `cwd` her zaman açıkça veriliyor,
klasör yoksa `os.homedir()` (düz bir terminalin açıldığı yer). Artık 7/7 geçiyor.

## 7.2 Kurulum sonrası durum çubuğu görünmüyordu

`activationEvents: []` bırakılmıştı (VSCode ≥1.74 `contributes.commands`'tan `onCommand`
aktivasyonunu kendisi üretiyor diye düşünülmüştü — **bu doğru, ama yetersiz**).
Sonuç: durum çubuğu öğesi `activate()` içinde oluşturulduğu için uzantı hiçbir zaman
etkinleşmiyordu. Komut Paleti'nden `Cmdkit` komutları çalışıyordu, durum çubuğu
hiç görünmüyordu. Exthost loglarında hiç aktivasyon kaydı yoktu.

Düzeltme: `"activationEvents": ["onStartupFinished"]`. Durum çubuğu eklentisi her pencere
açılışında etkinleşmek zorundadır, `onStartupFinished` bunun için doğru olay.

Regresyon koruması: iki test eklendi — manifestte `onStartupFinished` var mı, ve uzantı
`activate()` çağrılmadan **kendiliğinden** etkinleşiyor mu.

## 7.3 Komut yönetimi: toplu içe/dışa aktarma

Soruldu: "ekleme / silme / değiştirme yapılıyor mu?" Cevap: hayır — `src/` içinde hiçbir yerde
ayar yazımı yoktu, komutlar yalnızca `settings.json`'dan elle yönetiliyordu.

Kullanıcı webview tabanlı tam düzenleyici yerine **toplu içe/dışa aktarma** istedi
(tek tek düzenleme yerine, çok sayıda komutu tek seferde taşıma/ekleme senaryosu).

| Karar | Gerekçe |
|---|---|
| `cmdkit.export` → **seçim**: pano veya dosya | Kullanıcı isteği: çıktı hem panoya kopyalanabilir hem konum seçilip dosyaya kaydedilebilir (varsayılan `cmdkit-groups.json`, kaydettikten sonra "Aç" düğmesi) |
| `cmdkit.import` → pano veya dosya | Pano en hızlı yol, dosya takım paylaşımı için |
| İki mod: birleştir / değiştir | Birleştirme güvenli (silmez), değiştir ise silme işleminin kendisi — ikisi de gerekliydi |
| Yazmadan önce modal özet | "3 komut silinecek" bilgisi olmadan ayar dosyası yazılmıyor |
| Hedef sorusu (bu proje / kullanıcı) | Aynı listeyi paylaşırken kapsam projeye göre değişir; klasör yoksa doğrudan global |
| Saf mantık `transfer.ts` içinde | `serialize/parse/merge/planImport/removedInGroup` vscode bağımsız → 20 birim testi |
| Kod ikonları `$(json)` / `$(sync)` | Bundle minify olduğu için `export`/`import` kodikonları doğrulanamadı; `json` ve `sync` grep ile doğrulandı |

Regresyon koruması: `manifestteki tüm komutlar kayıtlı` testi yeni komutları da kapsıyor.

Doğrulama: `typecheck` ✔ · birim **68/68** ✔ (20 yeni) · entegrasyon 7/7 ✔ · paket 23.87 KB ✔

## 7.4 Durum çubuğu ikonu, rengi ve ikon kataloğu

İkon "daha fazla seçenek" ve renk isteği geldi. Kapsam, kullanıcının seçtiği yüzeyle sınırlı:
**durum çubuğu düğmesi**.

| Konu | Karar |
|---|---|
| Yeni ayarlar | `cmdkit.statusBar.icon`, `.color`, `.background` |
| Renk kabulü | hex (`#4EC9B0`, `#f00`) veya tema rengi adı (`charts.red`, `statusBarItem.errorBackground`); boş/geçersiz → temaya bırakılır |
| `Cmdkit: İkon Kataloğu` | ~120 ikon, 10 kategori, her satırda ikon canlı çizilir, seçilen ad panoya kopyalanır |
| Grup/komut ikonu da normalleştiriliyor | `"icon": "git-branch"` → `$(git-branch)`; ham yazı menüde görünmesin diye |

**Kodikon adları doğrulandı.** VSCode ikonları listeleyen API sunmuyor; ilk denemede mini bundle'da
CSS sınıfı araması işe yaramadı, sonra ikon kayıt defterinin gerçek biçimi bulundu:
`zap:fe("zap",60038)`. Tüm 763 kayıt taranıp aday 125 adın 18'i elendi (`add`, `box`, `smartphone`,
`tablet`, `nodejs`, `npm`, `plus`, `issue`, `hammer`, `output-window`, `chart`, `brackets`,
`color`, `palette`, `sparkles`, `tree-item`, `kebab-light`, `hard-drive`, `git-compare-changes`).
Katalog yalnızca doğrulanmış adlardan kuruldu; `$(paintcan)` komut ikonu da aynı yöntemle seçildi.

**Test yakaladı:** `parseIcon` ilk yazımda template literal içinde `` `$$(${fallback})` `` kullanıyordu
ve iki dolar işareti üretiyordu (`$$(terminal)`). Birim testi `"icon": "$(terminal)"` beklediği için
kırmızıya düştü. `$` template literal'de kaçış gerektirmez; birleştirme ile yazıldı.

Doğrulama: `typecheck` ✔ · birim **81/81** ✔ (13 yeni: parseIcon, parseColor, katalog bütünlüğü) ·
entegrasyon 7/7 ✔ · paket 26.3 KB ✔

## 7.5 Varsayılan listenin ikonlarla özelleştirilmesi

Yeni ikon/renk özelliğinden sonra varsayılan 36 komut da aynı dili konuşsun istendi: komutların
tamamı `$(terminal)` geri düşüyordu.

| Konu | Karar |
|---|---|
| Grup ikonları | Python `$(snake)`, Flutter `$(device-mobile)`, Node.js `$(server-environment)` |
| Komut ikonları | İşlevi anlatır: `$(beaker)` test, `$(shield)` lint, `$(cloud-download)` kurulum, `$(play)` çalıştır, `$(paintcan)` format, `$(trash)` silme, `$(watch)` dev, `$(book)` Jupyter, `$(list-ordered)` liste |
| Tek kaynak | `examples/default-groups.json` → `npm run sync-defaults` → `package.json` `configurationDefaults` |
| Yeni test | `defaults.test.ts`: iki dosya eşit mi, 3 grup/36 komut, **her ikon katalogda mı**, belirteçler korunmuş mu, POSIX ham yol kalmamış mı |
| Python grubunda yıkıcı komut yoktu | `pip freeze > requirements.txt` dosyayı eziyor → `confirm` eklendi (birim testi "her grupta en az bir onaylı komut" diye kovalıyor ve yakaladı) |

Drift koruması: `configurationDefaults` ile `examples/default-groups.json` elle ikinci kez
kaydırılınca kopuyordu (daha önce bu projede iki kez elle düzeltildi). Artık betik + test var.

Doğrulama: `typecheck` ✔ · birim **88/88** ✔ (7 yeni) · entegrasyon 7/7 ✔ · paket 27.37 KB ✔

## 7.6 Durum çubuğunda grup başına ayrı düğme

Sorun: `cmd` düğmesine basınca önce grup seçiliyor — her seferinde gereksiz bir tıklama.
İstek: her grubun kendi ikonu dursun, tıklanınca doğrudan o grubun komutları açılsın; `cmd`
kalsın ama o da opsiyonel olsun (VSCode'un durum çubuğu sağtık menüsünde gizleme desteği var).

| Konu | Karar |
|---|---|
| Grup düğmesi | Metin yok, yalnızca grup ikonu (`$(snake)`, `$(device-mobile)`, `$(server-environment)`) |
| Tıklama | `cmdkit.openGroup` + grup adı argümanı → `pickCommandsInGroup`, grup seviyesi atlanır |
| Öncelik | `cmd` taban değer, gruplar base-1, base-2 … → `cmd` + gruplar yan yana, ayar sırasına göre (taban 250, aşağıdaki çakışma notuna bak) |
| Görünürlük | `showGroups`, `showMaster`, `hiddenGroups: string[]`, `groupLabel: "" \| "always"` |
| Tooltip | Grup adı + komut sayısı + `En çok: test (×5)` (en çok kullanılan komut) |
| Yeniden kurulum | Yapı değişmedikçe öğeler yeniden oluşturulmuyor — `JSON.stringify` imza karşılaştırması, her çalıştırmada dispose/create olmuyor |
| Saf mantık | `plan.ts` → `planItems(groups, options)`: hangi düğme, hangi metin, hangi öncelik. 13 birim testi |

Renk değişikliği de artık **her** düğmeye uygulanıyor (grup düğmeleri dahil), çünkü renk
`item`'a atanıyor — yani tek ayar tüm düğmeleri birden renklendirir.

### 7.6.1 Sıralama çakışması: durum çubuğu öncelikleri

Görüntüde `[⌨ cmd] [Go Live] [🐍] [📱] [⚙]` çıktı. Sebep: VSCode durum çubuğunu **tüm
eklentilerin** `createStatusBarItem(alignment, priority)` değerlerine göre sıralar; bizim `cmd`
öğesi 100 kullanıyordu ve Live Server da tam 100 kullanıyordu (`ms-vscode.live-server` bundle'ı
okunarak doğrulandı). Aynı öncelik sıralamayı belirsizleştiriyor, düğmeler ayrışıyor.

Kurulu eklentilerin 15.166 JS/TS dosyası taranıp `createStatusBarItem` çağrıları çıkarıldı:

| Öncelik | Kullanan eklentiler |
|---|---|
| `1000` | rainbow-csv |
| `100` | Live Server, Pylance, claude-code-usage |
| `1` | Dart |
| `0` | Dart, Codeium, Prettier (varsayılan) |
| `-1` | Prettier |

200–259 bandı **tamamen boş** çıktı → `MASTER_PRIORITY = 250`, gruplar 249, 248, 247…
Ayrıca `cmdkit.statusBar.priority` ayarı eklendi: ileride başka bir eklenti 250'e denk gelirse
kullanıcı bloğu kaydırabilir. Regresyon testi varsayılan değerin 250 olduğunu sabitliyor.

### 7.6.2 Sağ tık menüsü tüm düğmeleri tek kalemde topluyordu

Gözlem: durum çubuğunda sağ tık → gizle/göster işlemi **tüm** düğmeleri aynı anda etkiliyordu.

Sebep: `createStatusBarItem(alignment, priority)` çağrısında kimlik verilmiyordu ve VSCode
belgelediği gibi "if no identifier was provided … the identifier will match the Extension.id"
kuralı devreye giriyor — yani dört düğmenin de kimliği `cmdkit.cmdkit` oluyordu. Sağ tık
menüsü de öğeleri kimliğe göre grupladığı için tek kalem çıkıyor.

Çözüm: üç argümanlı `createStatusBarItem(id, alignment, priority)` overload'ı kullanıldı.
Kimlikler: `cmdkit.cmd`, `cmdkit.group.Python`, `cmdkit.group.Flutter`, `cmdkit.group.Node.js`.
Artık menüde her düğme ayrı ayrı gizlenip gösterilebiliyor. Aynı isimli iki grup varsa
(`A`, `A`) çakışmamaları için `#2` ekleniyor.

Not: Bir grubun **adı** değişirse kimliği de değişir, o düğmenin gizleme durumu sıfırlanır.

### 7.6.3 Menüde her öğe "Cmdkit (extension)" görünüyordu

Kimlikler ayrıldıktan sonra menüde ayrı kalemler çıktı ama **hepsi aynı etiketle**
("Cmdkit (extension)"). Sebep: `StatusBarItem.name` hiç set edilmemişti; VSCode bu alanı
kullanıcıya gösteriyor ("The name of the entry … descriptive enough that users can understand
what the status bar item is about"), boş olduğunda uzantı adına düşüyor.

Çözüm: `plan.ts`'te her düğmeye `name` verildi — `Cmdkit: Tüm Gruplar` ve
`Cmdkit: <grup adı>`. İki test eklendi: adların tam listesi ve adların kısa/ayırt edici
kalması (menüde makul görünmesi için < 40 karakter).

Doğrulama: `typecheck` ✔ · birim **107/107** ✔ (18 yeni: sıralama, öncelik ve kaydırma, ayrı kimlikler, tekrarlı grup adları, menü adları, gizleme, etiket, tooltip) ·
entegrasyon 7/7 ✔ · paket 32.82 KB ✔

## 7.7 Grup bazlı renk (durum çubuğu ikonu)

İstek: grup tanımında `color` alanı, durum çubuğundaki ikon o renkte görünsün.

| Konu | Karar |
|---|---|
| Veri tipi | `Group.color` **ham string** olarak tutuluyor, `ColorSpec` değil. Parse edilmiş nesne JSON'a girip dışa/içe aktarımda bozulurdu (`{"hex":"..."}` → yeniden okununca undefined) |
| Çözümleme | `plan.ts` içinde `parseColor(group.color)`: hex → doğrudan, `charts.blue` gibi tema adı → `ThemeColor` |
| Öncelik | Grubun kendi `color`'ı → yoksa `cmdkit.statusBar.color` → yoksa tema |
| Varsayılanlar | Python `#4B8BBE`, Flutter `#47C5FB`, Node.js `#83CD29` (marka tonları, koyu çubukta okunaklı) |
| Sınır | Renk **sadece durum çubuğunda** görünür. QuickPick'te renk gösterilemiyor (`QuickPickItem` renk desteklemiyor) — komut bazlı renk bu yüzden eklenmedi |

Yeniden kurulum imzasına `text`/renk eklenmedi: bunlar `build()` yerine döngüde uygulandığı için
imzaya girmeleri her çalıştırmada gereksiz dispose/create tetiklerdi.

Test sırasında iki tuzak: test başlığındaki `JSON'a` kesme işareti tek tırnaklı string'i bozdu
(parse hatası), ve `parseColor('kirmizi')` geçerli bir tema rengi id'si olduğu için reddedilmiyor
(bilinmeyen tema rengi sessizce renksiz kalıyor — kabul edildi, test düzeltildi).

Doğrulama: `typecheck` ✔ · birim **113/113** ✔ · entegrasyon 7/7 ✔ · paket 33.03 KB ✔

## 7.8 Cmd menüsüne "diğer menüler" ayracı

İstek: `Cmd` düğmesi grup listesinden sonra bir ayraçla diğer komutları da göstersin.

| Konu | Karar |
|---|---|
| Kaynak | `src/menu.ts` → `MENU_ACTIONS`, saf liste (`id`, `label`, `description`, `icon`) |
| Çalıştırma | Seçilen satırın `id`'si doğrudan `vscode.commands.executeCommand(id)` ile çalışıyor — ayrı mantık yok |
| Tip | `PickResult = {kind:'command', group, command} \| {kind:'action', id}`; `picker.ts` artık komut ya da eylem döndürüyor |
| Ayraç tipi | `QuickPickItemKind.Separator` ayrı bir arayüz (`SeparatorItem`) olarak tanımlandı — union daraltması `in` kontrolüyle çalışsın diye |
| Listede olanlar | search, runLast, export, import, checkPlatform, iconCatalog, reload |
| Grup/ikon ekranları | Değişmedi: grup düğmesi direkt o grubu açar, arama düzleştirilmiş listede çalışır |

Test sırasında: `debug-rerun` ve `paintcan` gerçek kodikon ama katalogda yoktu, katalog
genişletildi (birim testi ikisinin de katalogda olduğunu doğruluyor).

Doğrulama: `typecheck` ✔ · birim **118/118** ✔ (5 yeni) · entegrasyon 7/7 ✔ · paket 34.25 KB ✔

## 7.9 Durum çubuğu kalabalığı — grup düğmesi sınırı

İşaret (kullanıcı): çok grup olunca durum çubuğu kalabalıklaşıyor, varsayılan hepsi açık gelmesin.

Değerlendirme: bu makinede bile Pylance, Git, Live Server, Codeium, Dart durum çubuğunu
kullanıyor; 3 grup + Cmd = 4 öğe makul, 10+ grup okunmaz hale gelir. Karar: **sayı ayarlanabilir
sınır** (`maxGroupItems`) — "hep ilk 3'ü göster" gibi sabit bir kural değil,
kullanıcı istediğinde 0 ya da 20 yazabiliyor.

| Konu | Karar |
|---|---|
| Nereye uygulanır | Gizleme **önce**, sonra sınır: `hiddenGroups` elenip kalanlar `slice(0, max)`. Böylece "ilk 3 grup" kuralı gizlemelerden bağımsız |
| Sıra kaynağı | Aylardaki grup sırası (kullanım değil) — öngörülebilir; kullanım sıralaması zaten komut içinde var |
| Kayıp gruplar | `Cmd` düğmesi ve `Tüm Komutlarda Ara` erişimi sürüyor; `Cmd` tooltip'inde "N grup düğmesi gizli (3/7 gösteriliyor)" yazıyor — kayıp gibi görünmesin diye |
| Bozuk değer | `NaN`/`Infinity`/ondalık normalize ediliyor (3'e düşüyor), `slice(0, -5)` sessizce boş döndürmesin diye |
| **Sınır ötesindekiler** | Düğmeleri **yine oluşturulur**, sadece gizli başlatılır — sağ tık menüsünde görünsün diye. Kullanıcı sağ tıkla açarsa **korunur** |
| Görünürlük ne zaman uygulanır | Yalnızca `build()` (yapı/imza değiştiğinde). Her `refresh()`'te `show()` çağırmak, kullanıcının sağ tık tercihini ezip gizliyordu |
| `hiddenGroups` | Düğmesi hiç oluşturulmaz — ayar "kalıcı kaldır" demek, "geçici gizle" değil |
| `0` değeri | Artık **sınırsız**: tüm gruplar görünür. Hiç grup düğmesi istenmiyorsa `showGroups: false` (daha net bir yol) |
| Negatif değer | Sınırsız sayılır — `raw > 0` kontrolü sayesinde `slice(0, -5)` sessizce boş dönmüyor |

Doğrulama: `typecheck` ✔ · birim **133/133** ✔ (gizli başlatılanlar planda, öncelik sırası, sınırsız 0, negatif, showGroups false, bozuk değer, ondalık, hiddenGroups oluşturulmaz) ·
entegrasyon 7/7 ✔ · paket 35.3 KB ✔

## 7.10 Varsayılan listeye 2 grup daha: Git ve Firebase

İstek: varsayılan gruplara 2 tane daha ekle. Hangi ikisi olduğu **tahmin edilmedi, veriye bakıldı**
(`~/PROJELER`, `~/Development`, `~/CMD`, `~/StudioProjects`, `~/Desktop` altında 4 seviye taranmış):

| Bulgu | Sonuç |
|---|---|
| 27 `.git` dizini | Git günlük ihtiyaç ve **hiçbir varsayılan grupta yok** → eklendi |
| 4 `firebase.json` (hepsi `FLUTTERS/` altında) + `firebase` CLI kurulu | Flutter backend işi var, Node grubu kapsamıyor → eklendi |
| `pubspec.yaml` 59, `package.json` 49, `requirements.txt` 9 | Mevcut üç grup doğru seçim |
| Dockerfile / Cargo.toml / go.mod / composer.json: **0** | Başlangıçta önerilen Docker grubu **eklenmedi** — kanıt yok |

**Git (15 komut):** durum, fark, log, hepsini ekle, commit (mesaj), push, pull, fetch --all --prune,
dallar, dala geç, yeni dal, stash, stash pop, `reset --soft HEAD~1`, klonla.
`push`, `pull` ve `reset` **onaylı** — kaza ile uzak depoya gönderilmesin diye.

**Firebase (10 komut):** giriş/çıkış, projeleri listele, projeye bağlan, hosting/functions/
firestore:rules deploy (üçü de onaylı), emülatörler, fonksiyon logları, `firebase init` (onaylı).

Grup düğmesi sınırı 5 olduğu için beş grup tam sığarken altıncı grup eklenirse çubuk dolmaz,
`Cmd`'den erişilir — kullanıcı isteğinin doğal sonucu.

Test sırasında: komut adları gruplar arasında **tekrarlanabiliyor** (`test`, `format`, `lint`,
`başlat`) — bu kasıtlı ve güvenli, kullanım anahtarı `grup + komut adı` içeriyor. Test önce
"tüm komut adları benzersiz" diye yazılmıştı ve kırmızıya düştü; kural "grup içinde benzersiz"
olarak düzeltildi ve ayrıca izin verildiğini doğrulayan test eklendi.

Doğrulama: `typecheck` ✔ · birim **130/130** ✔ · entegrasyon 7/7 ✔ · paket 37.12 KB ✔

## 7.11 Gizli başlatılan gruplar sağ tık listesinde görünmüyordu

Kullanıcı raporu: sınırın ötesindeki grupların düğmeleri oluşturulup gizli başlatıldı ama
**sağ tık → Hide Status Bar Items listesinde çıkmıyor**.

Sebep: VSCode'un durum çubuğu sağ tık menüsü, durum çubuğunda **gerçekten çizilen** öğeleri
listeliyor. `item.hide()` ile gizlenen bir öğe hiç çizilmediği için listede de yer almıyor.
(Bundle minify ve yerelleştirilmiş olduğu için bu satır koddan doğrulanamadı; davranış kullanıcının
gözlemiyle teyit edildi ve önceki "ayrı id ver" düzeltmesinin de çalıştığını göstermişti.)

Çözüm: **kendi seçim arayüzümüz.** `Cmdkit: Durum Çubuğu Düğmelerini Seç`
(`canPickMany` QuickPick): görünür düğmeler işaretli başlar, kullanıcı seçip onaylayınca
`hiddenGroups` **kullanıcı ayarlarına** yazılır ve `maxGroupItems: 0` ile sınır kaldırılır —
böylece "5 grubu da aç" seçimi gerçekten kalıcı ve sınırsız olur (aksi halde sınır seçimi yine
kırpardı).

| Alternatif | Neden seçilmedi |
|---|---|
| Hepsi görünür bırak | Kullanıcının ilk isteğiydi: başlangıçta 3 |
| Gizli bırakıp rehbere yaz | Kullanıcı "listede olmalı" dedi, rehber yetmiyor |
| `keybindings`/`when` ifadeleri | Durum çubuğu görünürlüğünü ayarlarla kontrol edemiyor |

Saf yardımcılar `plan.ts`: `visibleGroupNames` (şu an ne görünüyor) ve `hiddenGroupNames`
(seçime göre ne yazılmalı) — 6 test.

Doğrulama: `typecheck` ✔ · birim **139/139** ✔ · entegrasyon 7/7 ✔ · paket 39.21 KB ✔

## 7.12 Hazır grup kütüphanesi

**Uygulandı.** 2026-10-09 · 83 komut, 10 grup.

### Neden kütüphane, neden varsayılan listeye ekleme değil

Varsayılanlar `configurationDefaults` içinde, yani **her kurulumda herkese** gelir.
Şu an 61 komut / 5 grup var ve durum çubuğu zaten kısaltma ihtiyacı duyuyor
(`maxGroupItems: 3`). On grup daha eklenirse Rust kullanmayanın eline de Rust
düşer, menü ve çubuk taşar.

| Seçenek | Sonuç |
|---|---|
| A — listeyi büyüt | Basit ama herkes her şeyi görür |
| **B — yerleşik kütüphane** | **Seçildi.** Kullanıcı istediğini alır, istemeyen hiç görmez |
| C — ikisi | Karma yol, iki yolu da sürdürür |

Varsayılanlar 5 grupda kalır. Yeni komut: `Cmdkit: Hazır Grup Ekle` →
kütüphaneden seç → `cmdkit.groups`'a eklenir.

### Kütüphanedeki 10 grup

İkonlar `src/icons.ts` kataloğundan (103 doğrulanmış kodikon); hepsi tek tek
doğrulandı. `plug`, `key`, `lock`, `graph`, `flame` katalogda **yok**, bu yüzden
kullanılmadı.

| Grup | İkon | Renk | Komut |
|---|---|---|---|
| Docker | `$(package)` | `#2496ED` | 9 |
| GitHub CLI | `$(source-control)` | `#8B949E` | 12 |
| PostgreSQL | `$(database)` | `#4169E1` | 7 |
| Go | `$(server-environment)` | `#00ADD8` | 10 |
| Rust | `$(gear)` | `#DEA584` | 10 |
| Kubernetes | `$(vm)` | `#326CE5` | 10 |
| Java (Maven/Gradle) | `$(symbol-interface)` | `#E76F00` | 8 |
| Redis | `$(server)` | `#DC382C` | 6 |
| Android | `$(device-mobile)` | `#3DDC84` | 6 |
| Vercel | `$(rocket)` | `#FF4A4A` | 5 |
| Surge | `$(zap)` | `#E8A317` | 15 |

**Sıralama gerekçesi:** 1–3 herkes için (en yüksek kullanım × en zengin CLI),
4–8 dikey ama o işi yapan için çok zaman kazandırır, 9–10 mevcut yığına uyuyor
(Flutter/Android, web/Firebase).

**Neden bu 10, neden 30 değil:** özgün ve doğru komut çifti olan her grup burada.
MySQL yok (Postgres ile aynı kalıp), Make yok (proje-özel), Helm yok (kubectl'e
çok yakın), Bash/PowerShell yok (zaten terminalde).

### Komut listeleri

**Docker** (`$(package)`, `#2496ED`)
| Komut | Shell | Not |
|---|---|---|
| derle | `docker compose build` | |
| başlat | `docker compose up -d` | |
| durdur | `docker compose down` | |
| loglar | `docker compose logs -f` | uzun süreli |
| çalışanlar | `docker ps` | |
| kabuğa gir | `docker compose exec` | `argsPrompt`: servis |
| imajlar | `docker images` | |
| temizle | `docker compose down -v --remove-orphans` | `confirm` |
| sistemi temizle | `docker system prune -a` | `confirm` — imajları siler |

**GitHub CLI** (`$(source-control)`, `#8B949E`)
| Komut | Shell |
|---|---|
| durum | `gh status` |
| PR listele | `gh pr list` |
| PR aç | `gh pr create` |
| PR görüntüle | `gh pr view` |
| PR indir | `gh pr checkout` · `argsPrompt`: dal |
| issue aç | `gh issue create` |
| issue listele | `gh issue list` |
| depoyu görüntüle | `gh repo view` |
| çalışmalar | `gh run list` |
| çalışma izle | `gh run watch` |
| sürüm oluştur | `gh release create` · `argsPrompt`: sürüm |
| oturum | `gh auth status` |

**PostgreSQL** (`$(database)`, `#4169E1`)
| Komut | Shell | Not |
|---|---|---|
| bağlan | `psql -U postgres` | uzun süreli |
| veritabanları | `psql -l` | |
| sorgu çalıştır | `psql -c` | `argsPrompt`: SQL |
| yedek al | `pg_dump` | `argsPrompt`: veritabanı |
| geri yükle | `psql -f` | `argsPrompt`: dosya |
| tablo boyutları | `psql -c "\dt+"` | |
| kilitleri izle | `psql -c "SELECT * FROM pg_stat_activity"` | |

**Go** (`$(server-environment)`, `#00ADD8`)
| Komut | Shell | Not |
|---|---|---|
| test | `go test ./...` | |
| derle | `go build ./...` | |
| çalıştır | `go run` | `argsPrompt`: dosya |
| mod tidy | `go mod tidy` | |
| vet | `go vet ./...` | |
| biçim kontrol | `gofmt -l .` | |
| biçim yaz | `gofmt -w .` | |
| lint | `golangci-lint run` | |
| paket ekle | `go get` | `argsPrompt`: paket |
| önbellek temizle | `go clean -cache` | `confirm` |

**Rust** (`$(gear)`, `#DEA584`)
| Komut | Shell | Not |
|---|---|---|
| test | `cargo test` | |
| derle | `cargo build` | |
| sürüm derle | `cargo build --release` | |
| çalıştır | `cargo run` | uzun süreli |
| clippy | `cargo clippy` | |
| biçim | `cargo fmt` | |
| kontrol | `cargo check` | |
| bağımlılık ekle | `cargo add` | `argsPrompt`: crate |
| güncelle | `cargo update` | |
| temizle | `cargo clean` | `confirm` |

**Kubernetes** (`$(vm)`, `#326CE5`)
| Komut | Shell | Not |
|---|---|---|
| pod listele | `kubectl get pods` | |
| servis listele | `kubectl get svc` | |
| tümü | `kubectl get all -A` | |
| pod açıkla | `kubectl describe pod` | `argsPrompt`: ad |
| log izle | `kubectl logs -f` | `argsPrompt`: pod |
| kabuk | `kubectl exec -it` | `argsPrompt`: pod |
| port yönlendir | `kubectl port-forward` | `argsPrompt`: pod/port |
| uygula | `kubectl apply -f` | `argsPrompt`: dosya |
| sil | `kubectl delete -f` | `argsPrompt` + `confirm` |
| aktif context | `kubectl config current-context` | |

**Java — Maven/Gradle** (`$(symbol-interface)`, `#E76F00`)
| Komut | Shell | Not |
|---|---|---|
| derle | `mvn clean install` | |
| test | `mvn test` | |
| paketle | `mvn package` | |
| çalıştır | `mvn spring-boot:run` | uzun süreli |
| tek test | `mvn -Dtest=` | `argsPrompt`: sınıf |
| sarmalayıcıyla | `./mvnw clean install` | |
| gradle derle | `gradle build` | |
| gradle test | `gradle test` | |

**Redis** (`$(server)`, `#DC382C`)
| Komut | Shell | Not |
|---|---|---|
| bağlan | `redis-cli` | uzun süreli |
| ping | `redis-cli ping` | |
| bilgi | `redis-cli info` | |
| izle | `redis-cli monitor` | uzun süreli |
| anahtarlar | `redis-cli keys '*'` | |
| flushall | `redis-cli flushall` | `confirm` — her şeyi siler |

**Android** (`$(device-mobile)`, `#3DDC84`)
| Komut | Shell | Not |
|---|---|---|
| cihazlar | `adb devices` | |
| shell | `adb shell` | uzun süreli |
| logcat | `adb logcat` | uzun süreli |
| apk kur | `adb install` | `argsPrompt`: dosya |
| port yönlendir | `adb reverse` | `argsPrompt`: port |
| kaldır | `adb uninstall` | `argsPrompt` + `confirm` |

**Vercel** (`$(rocket)`, `#FF4A4A`)
| Komut | Shell | Not |
|---|---|---|
| geliştirici sunucusu | `vercel dev --yes` | uzun süreli — CLI ayrıca onay istiyor |
| derle | `vercel build` | |
| loglar | `vercel logs` | uzun süreli · `argsPrompt`: dağıtım URL/ID |
| ortam değişkenleri | `vercel env ls` | proje bağlanmadan çalışmaz |
| yayınla | `vercel --prod` | `confirm` — canlıya çıkarır |

**Surge** (`$(zap)`, `#E8A317`)
| Komut | Shell | Not |
|---|---|---|
| oturum | `surge whoami` | |
| giriş | `surge login` | |
| çıkış | `surge logout` | jetonu geçersizleştirir |
| e-posta doğrula | `surge verify` | ilk yayından önce gerekir |
| projeler | `surge list` | |
| yayınla | `surge` | `argsPrompt`: dizin ve alan adı · `confirm` |
| CNAME ile yayınla | `surge publish` | `confirm` |
| önizleme yayını | `surge --preview` | `argsPrompt`: dizin ve alan adı — üretime dokunmaz |
| sürümler | `surge revs` | `argsPrompt`: alan adı |
| geri al | `surge rollback` | `argsPrompt`: alan adı · `confirm` — canlı sürüm değişir |
| ayarlar | `surge config` | `argsPrompt`: alan adı |
| istatistik | `surge stats` | `argsPrompt`: alan adı |
| DNS | `surge dns` | `argsPrompt`: alan adı |
| SSL | `surge ssl` | `argsPrompt`: alan adı |
| projeyi kaldır | `surge teardown` | `argsPrompt`: alan adı · `confirm` — geri alınamaz |

> `surge` grameri `<hedef> <fiil`: hedef alan adı, dizin ya da boş bırakılırsa
> bulunduğun klasör. Fiilsiz hedef hiçbir şey yapmaz, özet basar — bu yüzden
> `yayınla` komutunda `confirm` şart: hedef ve fiil birlikte veriliyor.

### Tasarım kararları

1. **Veri nerede duracak:** `src/library.ts` içinde tipli `const`, `src/icons.ts`
   deseninin aynısı. `examples/library-groups.json` + sync betiği **yapılmayacak**:
   `configurationDefaults`'ın package.json'da yaşamak zorunda olması yüzden
   JSON'a ihtiyaç vardı, kütüphanede böyle bir kısıt yok. Tek kaynak + tip
   denetimi bedava, drift riski yok.
2. **Yükleme doğrulaması:** `normalizeGroups` gibi eleme — geçersiz komut düşer,
   çökmeye yol açmaz. Kütüphane bozuksa menü açılmaz değil, boş çıkar.
3. **Eklerken mevcut gruplar korunur**, ad çakışırsa uyarılır (overwrite yok).
4. **Hedef sorulur:** `pickTarget()` yeniden kullanılır — bu proje / kullanıcı.
5. **Ekledikten sonra `statusBar.refresh()`** çağrılır, düğmeler anında görünür.
6. **Yalnızca ekleme, silme yok.** Silme zaten `Komut Dosyasını Uygula` →
   `Listeyi değiştir` ile yapılıyor; ikinci bir silme yolu karışıklık yaratır.

### Uygulama durumu

Uygulandı. Kütüphane `src/library.json` içinde; `library.ts` ince bir sarmalayıcı.
İlk kurulum listesi de aynı dosyanın `defaults` dizisinden üretiliyor — böylece
silinen bir varsayılan grup `Hazır Grup Ekle` ile geri getirilebiliyor.

| Grup | Komut | | Grup | Komut |
|---|---|---|---|---|
| Python · Flutter · Node.js | 12/12/12 | | Rust | 10 |
| Git | 15 | | Kubernetes | 10 |
| Firebase | 10 | | Java (Maven/Gradle) | 8 |
| Docker | 9 | | Redis | 6 |
| GitHub CLI | 12 | | Android | 6 |
| PostgreSQL | 7 | | Vercel | 5 |
| Surge | 15 | | | |

16 grup, 161 komut. İlk kurulumda gelen 5 grup, kalan 11 seçime açık.

### Uygulama adımları (tamamlandı)

- [x] `src/library.ts` — 10 grup, tipler, `normalizeLibrary()`
- [x] `test/unit/library.test.ts` — 22 test: ikon katalogda mı, grup/komut adları
      benzersiz mi, yıkıcı komutlar `confirm` istiyor mu, geri alınamaz komutlar
      uyarıyor mu, renkler 6 haneli hex mi, her grupta 5–15 komut mu
- [x] `package.json` — `cmdkit.addGroup` komutu
- [x] `src/menu.ts` — "Hazır Grup Ekle" satırı
- [x] `src/settings.ts` — `addLibraryGroup()`: kütüphane seçici + hedef + yazma
- [x] `src/extension.ts` — komut kaydı + `statusBar.refresh()`
- [x] `README.md` — yeni komut, kütüphane açıklaması

Guard'lar yazılırken iki hatayı yakaladı: `mvn clean install` "yıkıcı" diye
onay istemiyordu (`cargo clean` öyle, `clean` kelimesine bakarak karar yanıltıcı —
açık listeye çevrildi), ve uzun süreli komut listesi `psql -l`'yi de kabuk
sayıyordu (`psql -U postgres` öyle).

### DoD'ya eklenecekler

- [x] `Hazır Grup Ekle` ile eklenen grup listeye eklenir (birim testi)
- [x] Zaten ekli olan grup seçicide çıkmaz (birim testi + mutasyonla doğrulandı)
- [x] Eklenen gruplar **mevcut komutları silmez** (birim testi)
- [x] Eklenen komutlar `confirm` / `argsPrompt` alanlarını korur (birim testi)
- [x] Ayarlara normalize dolguları yazılmaz (birim testi)
- [ ] Uçtan uca elle deneme: eklenen grubun menüde ve durum çubuğunda görünmesi

## 7.13 Dosya tabanlı düzenleme, kütüphane ve veri kaybı zinciri

**Uygulandı.** 2026-10-09.

### Neden dosya tabanlı düzenleme

Dışa/içe aktarım ikişerli seçiciyle çalışıyordu (panoya mı dosyaya mı) ve panoya
kopyalama yolu elle yapıştırılan JSON'u gereksiz yere bozuyordu. Artık tek bir
düzenleme dosyası var: `cmdkit-groups.json`.

- **Komut Listesini Düzenle** — dosyayı açar, soru sormaz; yoksa ayarlardan yazar,
  varsa üzerine yazmaz
- **Komut Dosyasını Uygula** — özet + onay + hedef; kaynak seçicisi kalktı
- **Dosyayı Ayarlardan Yenile** — dosyayı ayarlardaki liste ile üzerine yazar

### Neden `.vscode/` altında

Dosya proje köküne açılıyordu ama uygulandığı yer `.vscode/settings.json` —
kaynak ve hedef ayrı yerlerde. Sonuç: repoda izlenmeyen dosya, monorepo'da yanlış
kapsam, çok köklü alanda keyfî konum. Varsayılan artık `.vscode/` altında.

`cmdkit.groupFile` ayarı eklendi (monorepo için alt pakete yönlendirme).

### Kapatılan veri kaybı yolları

| Yol | Durum |
|---|---|
| Özet, tamamen silinen grupları hiç bildirmiyordu | Her silinen grup ayrı satırda, geri alınamaz uyarısıyla |
| Birleştirme grup ikon/rengini güncellemiyordu | Dosyadaki görünüm değişikliği uygulanıyor |
| Kütüphane eklemesi dosyayı bayat bırakıyordu | Dosya senkronlanıyor (uygulanmamış düzenleme varsa dokunmuyor) |
| Grup silmek elle JSON düzenlemek gerektiriyordu | `Grup Kaldır` hedefli siliyor |
| Varsayılan grup geri getirilemiyordu | `library.json` tek kaynak oldu, `Hazır Grup Ekle` 15 grubu de görüyor |
| Komutsuz grup sessizce yok sayılıyordu | Şemaya `minItems`, mesaj ayrımı |

### Kullanım kılavuzu

`Cmdkit: Komut Dosyası Nasıl Kullanılır` kılavuzu önizlenebilir Markdown olarak
açıyor. Alan listesi şemadan, belirteçler `tokens.ts`'ten okunuyor — yeni alan
eklenirse kılavuzda geçmiyorsa test düşüyor. Kılavuzdaki her JSON bloğu ayrıştırılıyor.

### Menü bölümleri

Yardımcı menü dört bölüme ayrıldı, sıra **kullanım sıklığına** göre:
`run` / `edit` / `view` / `help`.

---

## 8. Doğrulama (Definition of Done)

- [x] `tsc --noEmit` ve `esbuild --bundle` hatasız
- [x] `vsce package` `.vsix` üretir
- [x] `code --install-extension` sonrası durum çubuğu öğesi görünür (kullanıcı doğruladı)
- [x] Tıkla → grup → komut → terminalde çalışır (kullanıcı doğruladı)
- [x] Kurulumda 5 grup / 61 komut okunuyor (entegrasyon testi)
- [x] `confirm` olan komut onaysız çalışmaz (entegrasyon testi)
- [x] `argsPrompt` girdisi tırnaklı yolları koruyarak argümanlara bölünür (birim testleri)
- [x] Çalıştırılan komut sonraki açılışta üste çıkar (birim testleri)
- [x] Workspace yokken (klasör açılmamış pencere) çökmez (entegrasyon testi pencere açmadan koşuyor)
- [x] Klasör yokken komut da çalışır — `cwd` ana dizine düşüyor (entegrasyon testi)
- [x] Esc ile her iki kademede de çıkış — kod yolu `picker.test.ts`'te (Esc → undefined,
      ikinci menü açılmıyor, ayraç seçilince de çıkıyor)
- [ ] Ayar değişikliğinde menünün yeniden yükleme olmadan güncellenmesi elle denenmedi
- [x] Terminal görevi reddedilirse `showErrorMessage` görünümü — kod yolu
      `runner.test.ts`'te (hata fırlatıldığında mesaj gösteriliyor, komut adı ve
      `cmdkit:` öneki geçiyor, sonraki çalıştırma etkilenmiyor); **görünümü
      VS Code'da elle doğrulanmadı**

## 9. Sonraki adımlar

**Bilinen borç (2026-10-09 itibarıyla)**

- Silinen grubu geri getirme yolu yok — **bu bilinçli bir karar, eksik değil.**
  `settings.json` sürüm kontrolünde değil, "son yazılan liste"tir; geri alma
  için tutulan geçmiş olsaydı hangi yazmanın geri alınacağı belirsizleşirdi.
  Bunun yerine silme yolu kasten pahalı: `Grup Kaldır` tek grup ister, silinen
  grup özette "GRUP SİLİNECEK" diye ayrı satırda ve geri alınamaz uyarısıyla
  bildirilir, son grup zaten kaldırılamaz. Kullanıcı silmeden önce uyarılıyor.
  Bir grup kazara giderse kaynak dosya (`cmdkit-groups.json`) çoğu zaman hâlâ
  duruyor ve `Listeyi değiştir` ile geri gelir — dosya senin kontrolünde.
- Bu planın §2/§3/§4 kısımları 3 gruplu/48 testli eski durumu anlatıyor;
  gerçek: 16 grup, 418 test. `README.md` doğru olan belge

**Fikir (kapsam dışı)**

- Keybinding'ler: `keybindings.json` içinde grup/komut ID'lerine doğrudan atama
- Panodan sonuç: `registerTerminalProfileProvider`
- Komut geçmişi ve tekrar çalıştırma (Ctrl+R benzeri)
- Ekstra hedef: seçili metne uygulama, aktif editöre komut gönderme
- Webview tabanlı tek tek komut düzenleyici (kullanıcı şimdilik istemedi)

**Ders notu (testler hakkında)**

Bu oturumda bulunan yedi hatanın altısı kullanıcı elle kullanırken çıktı; testler
yeşildi. Hepsi aynı sınıftı: fonksiyon doğru dönüş değerini veriyordu ama
**kullanıcının gördüğü yanlıştı** — sessiz düşürme, eksik mesaj, görünmeyen
bayrak. Testler dönüş değerlerini doğruluyor, görüneni değil.

Bundan sonra yeni testler önce kullanıcıdan beklenen davranış yazılarak yazılacak:
hangi metin görünecek, hangi bayrak açık olacak. Mevcut guard'lar bu yönde
genişletildi (mesaj metinleri, `supportThemeIcons`, şema senkronu).

## 10. Dağıtım öncesi yapılacaklar

Sürüm **dağıtımın en sonunda** ilerletilecek; yeni özellikler eklendikçe commit'lenip
test edilecek, sürüm atlaması dağıtım günü yapılacak.

- [x] `package.json` → `version`: `0.1.0` → **`0.2.0`** (menü etiketleri değişti,
      iki komut yeniden yazıldı, şema eklendi, içe/dışa aktarım akışı değişti —
      geriye uyumlu bir hata düzeltmesi değil) — `4bb8b50`
- [x] `npm run package` → `cmdkit-0.2.0.vsix` (9 dosya, 60.76 KB)
- [x] `code --install-extension ... --force` — kurulu: `cmdkit@0.2.0`
- [x] `README.md` sürüm/ekran görüntüsü tazelemesi — sürüm `0.2.0`, grup sayısı
      16, hazır grup 11, Surge tabloya eklendi, test sayısı 332, kütüphane kaynağı
      `library.json` olarak düzeltildi (eski metin `library.ts` diyordu).
      Ekran görüntüsü README'de yok, o yüzden eklenmedi — metinsel bir ağırlık
      getirmiyor, VS Code Extensions sayfasında zaten duruyor.
- [ ] Marketplace hesabı/publisher doğrulaması — `publisher: "cmdkit"` henüz
      gerçek bir yayıncı hesabı değil, `vsce publish` öncesi gerekli

> Not: Aynı sürüm numarasıyla `--force` kurulumu çalışır ama VSCode'da
> "güncelleme yok" görünür. Test için yeterli, dağıtım için yetersiz.
