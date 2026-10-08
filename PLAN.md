# cmd-deck — VSCode durum çubuğu terminal komut paneli

Durum çubuğundaki bir öğeye tıkla → grup seç → komut seç → komut terminalde çalışsın.

## 1. Kararlı API üzerine kurulu mu?

Evet. Kullanılacak tüm API'ler stabil sürümde (`stable`):

| İhtiyaç | API | Durum |
|---|---|---|
| Durum çubuğu öğesi | `window.createStatusBarItem(StatusBarAlignment.Right, 100)` | stable |
| Tıklamayı komuta bağlama | `statusBarItem.command = 'cmd-deck.open'` | stable |
| İki kademeli menü | `window.showQuickPick()` (ardışık iki çağrı) | stable |
| Komutu terminalde çalıştırma | `tasks.executeTask({ type:'shell', command, options })` | stable |
| Yapılandırma okuma | `workspace.getConfiguration('cmdDeck')` | stable |
| Ayar değişimini dinleme | `workspace.onDidChangeConfiguration` | stable |
| Kalıcı sayaç | `ExtensionContext.workspaceState` | stable |

Deneysel API, `enabledApiProposals` veya VSCode önizleme sürümü gerekmiyor.

## 2. Mimari karar: kaynak gerçekliği nerede?

**Gruplar ve komutlar `settings.json` içinde** (`cmdDeck.groups`), kullanım sayaçları `workspaceState` içinde.

Gerekçe:
- Gruplar elle düzenlenebilir, git'e commit'lenip ekip ile paylaşılabilir.
- `onDidChangeConfiguration` ile canlı yenileme; yeniden yükleme (reload) gerekmez.
- Sayaçları ayarlara yazmak kullanıcının dosyasını kirletirdi.

```jsonc
"cmdDeck.groups": [
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
cmd-deck/
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
│   └── default-groups.json  # package.json configurationDefaults kaynağı
├── src/
│   ├── extension.ts      # activate/deactivate, komut kayıtları
│   ├── statusBar.ts      # durum çubuğu öğesi + ayar değişimi dinleyici
│   ├── config.ts         # vscode tarafı: ayar okuma (getGroups)
│   ├── normalize.ts      # SAF: tipler + şema normalizasyonu (vscode bağımsız, test edilebilir)
│   ├── args.ts           # SAF: kullanıcı girdisi → argüman dizisi (tırnak destekli)
│   ├── tokens.ts         # SAF: {python}/{venv}/{venvpy}/{rm} platform belirteçleri
│   ├── platform.ts       # Windows uyarısı + panoya Windows karşılığı kopyalama
│   ├── picker.ts         # iki kademeli QuickPick (grup → komut)
│   ├── runner.ts         # confirm, argsPrompt, executeTask + ShellExecution
│   └── usage.ts          # workspaceState sayaçları, sıralama, son komut çözümleme
└── test/
    ├── runTest.ts        # @vscode/test-electron giriş noktası
    ├── stubs/vscode.ts   # birim testleri için vscode takma yolu
    ├── unit/*.test.ts    # 48 birim testi (vitest)
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
4. `contributes.commands`: `cmd-deck.open`, `cmd-deck.search`, `cmd-deck.runLast`, `cmd-deck.reload`
5. `contributes.configuration` → `cmdDeck.groups` şeması + `configurationDefaults` ile 3 varsayılan grup
6. Doğrulama: `npm run typecheck` ✔, `npm run build` ✔, `npm run package` ✔ (10.02 KB vsix), izole dizine kurulum ✔

Sürüm kararı: yerel VSCode **1.141.0**, ancak `engines.vscode` bilinçli olarak `^1.90.0`
(kullanılan API'ler çok daha eski → geniş uyumluluk). Bu engel olmaması için
`@types/vscode` **`~1.90.0`** sabitlendi: derleme yeni API kullanımını (ör. yeni Task API'si)
hata olarak yakalar. Kullanılan araç sürümleri: TypeScript 7, esbuild 0.28, vsce 4.


### Adım 2 — Çekirdek akış — ✅ TAMAMLANDI
1. `statusBar.ts`: `StatusBarAlignment.Right`, öncelik `100`, metin `$(terminal) cmd`, `tooltip`, `show()`,
   `onDidChangeConfiguration` + `affectsConfiguration('cmdDeck')` ile canlı yenileme
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
1. `usage.ts`: `workspaceState` sayaçları (`cmdDeck.usage` = key → `{count, lastRun}`),
   son komut (`cmdDeck.last` = `{group, name}`). Anahtar `grup\u001fkomut` — isim çakışmalarına kapalı.
   Bozuk state → boş harita, çökme yok.
2. `cmd-deck.search`: `pickAnyCommand` tüm grupları tek listeye düşürür, `description`'da grup,
   `detail`'da shell metni, ikisinde de filtreleme açık.
3. `cmd-deck.runLast`: `resolveLast` son komutu **güncel ayarlardan** çözer; komut silinmişse
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
4. `platform.ts`: Windows'ta **bir kez** uyarı (globalState bayrağı), `cmd-deck.checkPlatform` ile elle
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
- [ ] Ayar değişikliğinde yalnızca `cmdDeck` altındaki anahtarlara bakılmalı, `affectsConfiguration` filtresi kullanılmalı
- [ ] Uzun komut listelerinde `QuickPick` `matchOnDescription`/`matchOnDetail` ayarları sıralamayı bozabilir, bilinçli karar verilmeli
- [ ] Uzak (SSH/WSL) ortamda `workspaceFolders[0].uri.fsPath` uzak yoldur — terminal de uzak olduğu için tutarlı, `cwd` boş bırakılmamalı
- [ ] Varsayılanlar POSIX yol kullanıyor (`.venv/bin/...`) — Windows'ta `.venv/Scripts/...` gerekir, ilk açılışta uyarılmalı
- [ ] `flutter build ios` yalnızca macOS'ta çalışır, grup yazılırken platform notu düşülmeli
- [ ] Pencere açılmadan `cmd-deck.runLast` çağrılırsa "önce bir komut çalıştırın" mesajı

## 7.1 `.vscode/launch.json` ve entegrasyon testinin bulduğu hata

`.vscode/launch.json` eklendi (dosya yoksa F5 "hata ayıklayıcı seç" listesi açıyor):
`Cmd Deck: Run` (`preLaunchTask: npm: build`) ve `Cmd Deck: Watch` (`npm: watch`).

Entegrasyon testine **görev çalıştırma** ve **onay reddi** senaryoları eklendi. İlk çalıştırma
gerçek bir hata yakaladı:

```
Variable workspaceFolder can not be resolved. Please open a folder.
```

Klasör açık değilken `cwd: undefined` bırakılırsa VSCode varsayılan olarak
`${workspaceFolder}` değişkenini çözmeye çalışıyor ve **görev hiç başlamıyordu** —
kullanıcı hiçbir hata mesajı da görmüyordu. Düzeltme: `cwd` her zaman açıkça veriliyor,
klasör yoksa `os.homedir()` (düz bir terminalin açıldığı yer). Artık 7/7 geçiyor.

### 7.2 Kurulum sonrası durum çubuğu görünmüyordu

`activationEvents: []` bırakılmıştı (VSCode ≥1.74 `contributes.commands`'tan `onCommand`
aktivasyonunu kendisi üretiyor diye düşünülmüştü — **bu doğru, ama yetersiz**).
Sonuç: durum çubuğu öğesi `activate()` içinde oluşturulduğu için uzantı hiçbir zaman
etkinleşmiyordu. Komut Paleti'nden `Cmd Deck` komutları çalışıyordu, durum çubuğu
hiç görünmüyordu. Exthost loglarında hiç aktivasyon kaydı yoktu.

Düzeltme: `"activationEvents": ["onStartupFinished"]`. Durum çubuğu eklentisi her pencere
açılışında etkinleşmek zorundadır, `onStartupFinished` bunun için doğru olay.

Regresyon koruması: iki test eklendi — manifestte `onStartupFinished` var mı, ve uzantı
`activate()` çağrılmadan **kendiliğinden** etkinleşiyor mu.
