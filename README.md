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
| Komut çalıştır | Durum çubuğundaki `cmd` öğesine tıkla → grup → komut |
| Grup seviyesine inmeden ara | <kbd>Ctrl</kbd>+<kbd>P</kbd> → `Cmd Deck: Tüm Komutlarda Ara` |
| Son komutu tekrarla | `Cmd Deck: Son Komutu Tekrar Çalıştır` |
| Windows uyumluluğunu denetle | `Cmd Deck: Platform Uyumluluğunu Kontrol Et` |

Komut listesinde **en çok kullandıkların üstte** çıkar; sayı eşitse `settings.json` sırası korunur.
Grubun kendi sırası hep ayardaki gibi kalır.

## Komutlarını tanımlama

`settings.json` içinde `cmdDeck.groups`:

```jsonc
"cmdDeck.groups": [
  {
    "name": "Git",
    "icon": "$(source-control)",
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
| `icon` | hayır | Codicon, varsayılan `$(terminal)` |
| `confirm` | hayır | `true` veya metin → çalıştırmadan önce onay |
| `argsPrompt` | hayır | Çalıştırmadan önce girdi ister |
| `clear` | hayır | `true` → terminal temizlenerek çalışır |

Kurulumda 3 hazır grup gelir: **Python**, **Flutter**, **Node.js** (toplam 36 komut).
Kendi ayarını yazarsan hazır grupların yerini alır — silmek istersen `"cmdDeck.groups": []`.

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
npm test               # 48 birim testi (vitest)
npm run test:integration   # gerçek VSCode içinde smoke test
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
