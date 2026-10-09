# Changelog

Bu dosya VS Code Marketplace'te uzantı sayfasında gösterilir.

## 0.2.1

Marketplace'e çıkan ilk düzeltme sürümü. Komut kütüphanesi değişmedi; görünürlük ve
paketleme düzeltmeleri.

### Görünürlük

- **Keywords 4 → 9.** `productivity`, `cli`, `shell`, `command palette`, `workflow`
  eklendi. Arama sonuçlarında daha fazla yer kaplıyor.
- **Marketplace sayfası alanları.** `repository`, `homepage`, `bugs` ve `galleryBanner`
  eklendi — "View Repository" ve "Report Issue" düğmeleri artık çalışıyor. Kaynak kod
  görünür olduğu için uzantının güven mesajı güçlendi.

### Paketleme

- **Paket 61 KB → 41 KB.** `PLAN.md` (900 satır tasarım günlüğü) ve kaynak haritası
  (214 KB) paketlenmiyor. Kaynak haritası yerelde üretilmeye devam ediyor, hata ayıklama
  bozulmadı.
- `.vscodeignore` eklendi: kaynak dosyalar, testler, yapılandırmalar paketlenmiyor.

### Düzeltmeler

- **Python grubu rengi** `#4B8BBE` → `#FFD43B` (Python'un resmî sarısı). Koyu temada
  kontrast 4.85 → 12.46; Flutter'un tonuna benzerliği giderildi.
- **Cmd düğmesi** varsayılan olarak turkuaz (`#4EC9B0`) — uzantı simgesiyle aynı renk.
- **README'den `PLAN.md` referansı kaldırıldı.** Tasarım günlüğü `docs/` altına taşındı.