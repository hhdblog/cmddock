# AGENTS.md — Cmdkit Proje Çalışma Kuralları

Durum çubuğundan tek tıkla hazır terminal komutları çalıştıran VS Code eklentisi.
Yayında: `marketplace.visualstudio.com/items?itemName=hhdblog.cmdkit`
Yeni bir sohbet başlatıldığında bu dosyadaki kurallara göre devam edilir.

## Dil — en önemli kural

**Bu uzantıda kullanıcıya görünen her şey İngilizcedir.**

Marketplace'te herkese açık olduğu için, ekranı gören kişi İngilizce konuşan bir
yabancı olabilir. Şunlar İngilizce **olmak zorunda**:

- `package.json` → `description`, komut başlıkları, ayar açıklamaları
- `README.md`, `CHANGELOG.md`, `LICENSE`
- `src/library.json` → grup adları, özetler, komut adları, `description`,
  `argsPrompt`, `confirm` metinleri
- `src/icons.ts` → ikon ipuçları
- `src/help.ts` → kullanım kılavuzu (`USAGE` sabiti)
- Kullanıcıya gösterilen her mesaj: `showWarningMessage`, `showErrorMessage`,
  `showInformationMessage`, QuickPick etiket/açıklama/`placeHolder`
- Durum çubuğu tooltip satırları
- Hata mesajları (`parseFailureReason`, özet satırları, komut çalıştırma hataları)

### Türkçe kalabilecekler

Bunlar **ürün değil, çalışma alanı**. Kullanıcıyı VS Code'da veya marketplace'te
görmez; yalnız repoya girip okuyan geliştirici okur.

- **Kod yorumları** (`//`, `/** */`) — 2026-10-09'da kullanıcı kararıyla ertelendi
- **Bu dosya** (`AGENTS.md`)
- **`docs/PLAN.md`** — tasarım günlüğü

Kısa yol: **eklentiye ne girdiyse İngilizce.** Kod, ekran, dokümantasyon, hata
mesajı. Geri kalan geliştirici içidir, Türkçe kalır.

Commit mesajları da Türkçe yazılır (kullanıcı isteği).

> Dikkat: 0.2.1'de CHANGELOG Türkçe yazılmış ve kullanıcı düzeltmemi istemişti.
> Bu kural o hatadan sonra eklendi. Yeni metin eklerken hangi kategoriye girdiğini
> baştan doğru seç.

## Ortam ve Çalıştırma

- Proje kökü: `/Users/hhd/PROJELER/VSCODES/cmdkit`
- Shell: zsh · Node 18+ · VS Code 1.90+ (`engines.vscode: ^1.90.0`)
- `npm run build` → önce `scripts/sync-defaults.mjs` çalıştırır (`library.json` →
  `package.json` `configurationDefaults`), sonra esbuild. **Yarn değil npm.**
- `npm test` → vitest, 418 test. `npm run typecheck` → `tsc --noEmit`
- `npm run package` → `cmdkit-<sürüm>.vsix`
- `npm run test:integration` gerçek VS Code indirir. İndirmesin ise:
  `VSCODE_TEST_EXECUTABLE="/Applications/Visual Studio Code.app/Contents/MacOS/Electron"`

## Proje Yapısı

```
src/
  extension.ts      # komut kaydı, aktivasyon
  statusBar.ts      # durum çubuğu öğeleri
  plan.ts           # hangi düğmeler görünsün (saf, test edilebilir)
  picker.ts         # iki kademeli QuickPick
  runner.ts         # onay → argsPrompt → executeTask
  settings.ts       # düzenleme/uygulama akışı, ayar yazımı
  transfer.ts       # JSON okuma, özet, merge/replace
  normalize.ts      # ham JSON → Group/Command
  library.json      # KOMUT KÜTÜPHANESİ — tek kaynak, 16 grup / 167 komut
  jsonc.ts          # yorum temizleyici
  args.ts           # splitArgs, buildCommandLine
  icons.ts          # doğrulanmış kodikon kataloğu
test/
  stubs/vscode.ts   # vscode takması; yeni test yazarken burayı genişlet
  unit/             # vitest
  suite/            # gerçek VS Code içinde (mocha)
schemas/cmdkit-groups.json  # kullanıcı dosyası için JSON şeması
docs/PLAN.md       # tasarım günlüğü (repoda, ama paketlenmiyor)
```

## Veri Akışı

`src/library.json` **tek kaynak**. `npm run build` onu okuyup `package.json`
içindeki `configurationDefaults` alanını üretir. **İki dosyayı elle senkronlama.**
Kütüphaneye komut eklerken sadece `library.json`'ı düzenle.

## Dikkat Edilecek Tuzaklar

- **`src/icons.ts` ikonları gerçekten var olmalı.** VS Code ikon listeleme API'si
  sunmuyor, katalog elle tutuluyor. Yeni ikon eklemeden önce `test/unit/library.test.ts`
  çalıştır — guard yoksa hata düşürür.
- **Yıkıcı komutlar `confirm` ister.** Guard `test/unit/library.test.ts` içinde
  açık bir listede tutuluyor; yeni yıkıcı komut eklerken listeye de ekle. Testi
  yazdıktan sonra `confirm`'u kaldırıp **gerçekten düştüğünü gör** — yazılmış testin
  çalıştığını kanıtlamadan geçmiyoruz.
- **JSON'da `\` kaybolur.** `psql -c "\dt+"` yazarken JSON kaçışı gerekir; bu hata
  bir kez yaşandı. Metin içinde ters eğik çizgi olan komutlar dikkat ister.
- **`.vscodeignore` yeni kök dosya eklersen güncelle.** Yoksa paketlenir.
  `docs/` ve `*.map` bilerek dışarıda.
- **Marketplace sürüm numarası geri alınamaz.** Her düzeltme yeni sürüm demek.

## Test Disiplini

- Yeni davranış için **önce beklenen davranışı yaz**, sonra kodu yaz.
- Bir testi "yazdım" diye bırakma: `confirm`'u kaldır, `matchOnDetail`'ı sil,
  belirteci boz — **test gerçekten düşüyor mu** kontrol et.
- Gerçek VS Code gerektiren davranış (durum çubuğu görünümü, tooltip, terminal
  açılışı) takma ile ölçülemez. 2026-10-09'da tooltip için üç tur denendi,
  hiçbiri işe yaramadı, geri alındı. **Bu tür durumlarda tahmin yürütme, kullanıcıya
  sor.**

## Git

- Repo: `github.com/hhdblog/cmdkit` (public), branch `main`
- Değişiklik önce commit edilir, sonra push edilir. Push öncesi sorulur.
- Commit mesajları Türkçe, hangi hatanın/kararın sebep olduğunu yaz.
- `npm version patch --no-git-tag-version` ile sürüm atlanır (tag'siz; commit elle).