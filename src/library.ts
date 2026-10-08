/**
 * Hazır grup kütüphanesi — `Cmd Deck: Hazır Grup Ekle` ile kullanıcıya sunulur.
 *
 * Varsayılanlar `configurationDefaults` içinde olduğu için her kuruluma geliyor;
 * 61 komuttan sonra listeyi büyütmek herkese her şeyi yüklerdi. Kütüphane
 * bunun yerine seçmeyi kullanıcıya bırakır.
 *
 * Veri `src/icons.ts` gibi burada, tipli `const` olarak duruyor: manifest kısıtı
 * olmayan tek veri kümesi bu, dolayısıyla JSON + sync betiğine gerek yok.
 * Çalışma anında `normalizeLibrary` elemesinden geçiyor — bozuk bir kayıt
 * menüyü çökertmek yerine listeden düşer.
 */

export interface LibraryCommand {
  readonly name: string;
  readonly command: string;
  readonly description?: string;
  readonly icon?: string;
  readonly confirm?: string | true;
  readonly argsPrompt?: string;
  readonly clear?: boolean;
}

export interface LibraryGroup {
  readonly name: string;
  readonly icon: string;
  readonly color?: string;
  /** Menüde tek satırda görünen kısa açıklama. */
  readonly summary: string;
  readonly commands: readonly LibraryCommand[];
}

const FALLBACK_ICON = '$(terminal)';

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asCommand(raw: unknown): LibraryCommand | undefined {
  if (typeof raw !== 'object' || raw === null) {
    return undefined;
  }
  const r = raw as Record<string, unknown>;

  const name = asText(r.name);
  const command = asText(r.command);
  if (!name || !command) {
    return undefined;
  }

  const confirm =
    typeof r.confirm === 'string' && r.confirm.length > 0
      ? r.confirm
      : r.confirm === true
        ? `'${command}' çalıştırılsın mı?`
        : undefined;

  return {
    name,
    command,
    description: asText(r.description) || undefined,
    icon: asText(r.icon) || FALLBACK_ICON,
    confirm,
    argsPrompt: asText(r.argsPrompt) || undefined,
    clear: r.clear === true,
  };
}

function asGroup(raw: unknown): LibraryGroup | undefined {
  if (typeof raw !== 'object' || raw === null) {
    return undefined;
  }
  const r = raw as Record<string, unknown>;

  const name = asText(r.name);
  const summary = asText(r.summary);
  const rawCommands = Array.isArray(r.commands) ? r.commands : [];
  const commands = rawCommands.map(asCommand).filter((c): c is LibraryCommand => c !== undefined);

  if (!name || !summary || commands.length === 0) {
    return undefined;
  }

  const color = asText(r.color);
  const icon = asText(r.icon) || FALLBACK_ICON;

  return {
    name,
    summary,
    icon,
    ...(color ? { color } : {}),
    commands,
  };
}

/** Bozuk kayıtları düşürür; geçerli olmayan girdi çökertmez, boş listeye iner. */
export function normalizeLibrary(raw: unknown): LibraryGroup[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map(asGroup).filter((g): g is LibraryGroup => g !== undefined);
}

const RAW: unknown = [
  {
    name: 'Docker',
    icon: '$(package)',
    color: '#2496ED',
    summary: 'derle, başlat, logla, temizle',
    commands: [
      { name: 'derle', command: 'docker compose build', icon: '$(package)', description: 'imajları derler' },
      { name: 'başlat', command: 'docker compose up -d', icon: '$(play)', description: 'arka planda başlatır' },
      { name: 'durdur', command: 'docker compose down', icon: '$(discard)', description: 'kapları indirir' },
      {
        name: 'loglar',
        command: 'docker compose logs -f',
        icon: '$(output)',
        description: 'logları canlı izle (Ctrl+C ile durur)',
      },
      { name: 'çalışanlar', command: 'docker ps', icon: '$(server)', description: 'çalışan kaplar' },
      {
        name: 'kabuğa gir',
        command: 'docker compose exec',
        icon: '$(terminal)',
        argsPrompt: 'servis adı (örn. api)',
        description: 'servisin içine shell',
      },
      { name: 'imajlar', command: 'docker images', icon: '$(files)', description: 'yerel imajlar' },
      {
        name: 'temizle',
        command: 'docker compose down -v --remove-orphans',
        icon: '$(trash)',
        confirm: 'Sistemdeki kaplar, hacimler ve ağlar silinecek. Devam?',
        description: 'kapları ve hacimleri siler',
      },
      {
        name: 'sistemi temizle',
        command: 'docker system prune -a',
        icon: '$(warning)',
        confirm: 'Kullanılmayan tüm imajlar, kaplar ve ağlar silinecek. Bu geri alınamaz. Devam?',
        description: 'tüm kullanılmayan kaynakları siler',
      },
    ],
  },
  {
    name: 'GitHub CLI',
    icon: '$(source-control)',
    color: '#8B949E',
    summary: 'PR, issue ve çalışmalar',
    commands: [
      { name: 'durum', command: 'gh status', icon: '$(source-control)', description: 'PR ve issue özeti' },
      { name: 'PR listele', command: 'gh pr list', icon: '$(git-pull-request)', description: 'açık PR\'lar' },
      { name: 'PR aç', command: 'gh pr create', icon: '$(git-pull-request)', description: 'yeni PR oluşturur' },
      { name: 'PR görüntüle', command: 'gh pr view', icon: '$(git-compare)', description: 'mevcut PR\'ı açar' },
      {
        name: 'PR indir',
        command: 'gh pr checkout',
        icon: '$(cloud-download)',
        argsPrompt: 'dal veya PR numarası',
        description: 'PR\'ın dalına geç',
      },
      { name: 'issue aç', command: 'gh issue create', icon: '$(edit)', description: 'yeni issue' },
      { name: 'issue listele', command: 'gh issue list', icon: '$(list-ordered)', description: 'açık issue\'lar' },
      { name: 'depoyu görüntüle', command: 'gh repo view', icon: '$(repo)', description: 'depo bilgisi' },
      { name: 'çalışmalar', command: 'gh run list', icon: '$(history)', description: 'Actions çalışmaları' },
      {
        name: 'çalışma izle',
        command: 'gh run watch',
        icon: '$(watch)',
        argsPrompt: 'çalışma numarası',
        description: 'çalışmayı canlı izle',
      },
      {
        name: 'sürüm oluştur',
        command: 'gh release create',
        icon: '$(tag)',
        argsPrompt: 'sürüm etiketi (örn. v1.0.0)',
        confirm: 'Sürüm yayınlanacak. Devam?',
        description: 'yeni sürüm oluşturur',
      },
      { name: 'oturum', command: 'gh auth status', icon: '$(account)', description: 'giriş durumu' },
    ],
  },
  {
    name: 'PostgreSQL',
    icon: '$(database)',
    color: '#4169E1',
    summary: 'bağlan, sorgula, yedekle',
    commands: [
      {
        name: 'bağlan',
        command: 'psql -U postgres',
        icon: '$(terminal)',
        description: 'psql kabuğu (Ctrl+C ile çık)',
      },
      { name: 'veritabanları', command: 'psql -l', icon: '$(list-ordered)', description: 'veritabanlarını listeler' },
      {
        name: 'sorgu çalıştır',
        command: 'psql -c',
        icon: '$(search)',
        argsPrompt: 'SQL (örn. SELECT * FROM users LIMIT 10)',
        description: 'tek sorgu çalıştırıp çıkar',
      },
      {
        name: 'yedek al',
        command: 'pg_dump',
        icon: '$(archive)',
        argsPrompt: 'veritabanı adı',
        description: 'SQL dökümü alır',
      },
      {
        name: 'geri yükle',
        command: 'psql -f',
        icon: '$(cloud-upload)',
        argsPrompt: 'SQL dosyası',
        description: 'SQL dosyasını çalıştırır',
      },
      {
        name: 'tablo boyutları',
        command: 'psql -c "\dt+"',
        icon: '$(table)',
        description: 'tablolar ve boyutları',
      },
      {
        name: 'kilitleri izle',
        command: 'psql -c "SELECT * FROM pg_stat_activity"',
        icon: '$(clock)',
        description: 'açık sorgular ve kilitler',
      },
    ],
  },
  {
    name: 'Go',
    icon: '$(server-environment)',
    color: '#00ADD8',
    summary: 'test, derle, mod düzenle',
    commands: [
      { name: 'test', command: 'go test ./...', icon: '$(beaker)', description: 'tüm testler' },
      { name: 'derle', command: 'go build ./...', icon: '$(package)', description: 'derler' },
      {
        name: 'çalıştır',
        command: 'go run',
        icon: '$(play)',
        argsPrompt: 'dosya yolu (örn. ./cmd/api)',
        description: 'çalıştırır (Ctrl+C ile durur)',
      },
      { name: 'mod tidy', command: 'go mod tidy', icon: '$(sync)', description: 'bağımlılıkları düzenler' },
      { name: 'vet', command: 'go vet ./...', icon: '$(shield)', description: 'statik kontrol' },
      { name: 'biçim kontrol', command: 'gofmt -l .', icon: '$(check)', description: 'biçimsiz dosyaları listeler' },
      { name: 'biçim yaz', command: 'gofmt -w .', icon: '$(paintcan)', description: 'biçimi uygular' },
      { name: 'lint', command: 'golangci-lint run', icon: '$(shield)', description: 'golangci-lint' },
      {
        name: 'paket ekle',
        command: 'go get',
        icon: '$(cloud-download)',
        argsPrompt: 'paket (örn. github.com/gin-gonic/gin@latest)',
        description: 'bağımlılık ekler',
      },
      {
        name: 'önbellek temizle',
        command: 'go clean -cache',
        icon: '$(trash)',
        confirm: 'Derleme önbelleği silinecek. Devam?',
        description: 'önbelleği boşaltır',
      },
    ],
  },
  {
    name: 'Rust',
    icon: '$(gear)',
    color: '#DEA584',
    summary: 'cargo: test, clippy, fmt',
    commands: [
      { name: 'test', command: 'cargo test', icon: '$(beaker)', description: 'tüm testler' },
      { name: 'derle', command: 'cargo build', icon: '$(package)', description: 'debug derleme' },
      { name: 'sürüm derle', command: 'cargo build --release', icon: '$(rocket)', description: 'optimize derleme' },
      {
        name: 'çalıştır',
        command: 'cargo run',
        icon: '$(play)',
        description: 'çalıştırır (Ctrl+C ile durur)',
      },
      { name: 'clippy', command: 'cargo clippy', icon: '$(shield)', description: 'linter' },
      { name: 'biçim', command: 'cargo fmt', icon: '$(paintcan)', description: 'biçimlendirir' },
      { name: 'kontrol', command: 'cargo check', icon: '$(check)', description: 'derlemeden kontrol eder' },
      {
        name: 'bağımlılık ekle',
        command: 'cargo add',
        icon: '$(cloud-download)',
        argsPrompt: 'crate (örn. serde --features derive)',
        description: 'bağımlılık ekler',
      },
      { name: 'güncelle', command: 'cargo update', icon: '$(sync)', description: 'bağımlılıkları günceller' },
      {
        name: 'temizle',
        command: 'cargo clean',
        icon: '$(trash)',
        confirm: 'target/ klasörü silinecek, sonraki derleme yavaş olacak. Devam?',
        description: 'derleme çıktılarını siler',
      },
    ],
  },
  {
    name: 'Kubernetes',
    icon: '$(vm)',
    color: '#326CE5',
    summary: 'pod, log, exec, apply',
    commands: [
      { name: 'pod listele', command: 'kubectl get pods', icon: '$(list-ordered)', description: 'pod\'ları listeler' },
      { name: 'servis listele', command: 'kubectl get svc', icon: '$(server)', description: 'servisleri listeler' },
      { name: 'tümü', command: 'kubectl get all -A', icon: '$(list-selection)', description: 'tüm kaynaklar, tüm ns' },
      {
        name: 'pod açıkla',
        command: 'kubectl describe pod',
        icon: '$(symbol-class)',
        argsPrompt: 'pod adı',
        description: 'pod detayları ve olaylar',
      },
      {
        name: 'log izle',
        command: 'kubectl logs -f',
        icon: '$(output)',
        argsPrompt: 'pod adı',
        description: 'logları canlı izle',
      },
      {
        name: 'kabuk',
        command: 'kubectl exec -it',
        icon: '$(terminal)',
        argsPrompt: 'pod adı',
        description: 'pod içinde shell',
      },
      {
        name: 'port yönlendir',
        command: 'kubectl port-forward',
        icon: '$(link)',
        argsPrompt: 'pod/servis ve port (örn. svc/api 8080:80)',
        description: 'yerel port yönlendirmesi',
      },
      {
        name: 'uygula',
        command: 'kubectl apply -f',
        icon: '$(cloud-upload)',
        argsPrompt: 'manifest dosyası',
        description: 'manifesti uygular',
      },
      {
        name: 'sil',
        command: 'kubectl delete -f',
        icon: '$(trash)',
        argsPrompt: 'manifest dosyası',
        confirm: 'Manifestteki kaynaklar silinecek. Devam?',
        description: 'manifesti siler',
      },
      {
        name: 'aktif context',
        command: 'kubectl config current-context',
        icon: '$(globe)',
        description: 'aktif context ve cluster',
      },
    ],
  },
  {
    name: 'Java (Maven/Gradle)',
    icon: '$(symbol-interface)',
    color: '#E76F00',
    summary: 'derle, test, paketle',
    commands: [
      { name: 'derle', command: 'mvn clean install', icon: '$(package)', description: 'derleyip kurar' },
      { name: 'test', command: 'mvn test', icon: '$(beaker)', description: 'testler' },
      { name: 'paketle', command: 'mvn package', icon: '$(archive)', description: 'jar/war üretir' },
      {
        name: 'çalıştır',
        command: 'mvn spring-boot:run',
        icon: '$(play)',
        description: 'uygulamayı başlatır (Ctrl+C ile durur)',
      },
      {
        name: 'tek test',
        command: 'mvn -Dtest=',
        icon: '$(search)',
        argsPrompt: 'sınıf adı (örn. UserServiceTest#findById)',
        description: 'tek testi çalıştırır',
      },
      {
        name: 'sarmalayıcıyla',
        command: './mvnw clean install',
        icon: '$(tools)',
        description: 'projedeki Maven sarmalayıcısıyla',
      },
      { name: 'gradle derle', command: 'gradle build', icon: '$(layers)', description: 'Gradle derleme' },
      { name: 'gradle test', command: 'gradle test', icon: '$(beaker)', description: 'Gradle testleri' },
    ],
  },
  {
    name: 'Redis',
    icon: '$(server)',
    color: '#DC382C',
    summary: 'bağlan, izle, flushall',
    commands: [
      {
        name: 'bağlan',
        command: 'redis-cli',
        icon: '$(terminal)',
        description: 'Redis kabuğu (Ctrl+C ile çık)',
      },
      { name: 'ping', command: 'redis-cli ping', icon: '$(check)', description: 'sunucu yanıt veriyor mu' },
      { name: 'bilgi', command: 'redis-cli info', icon: '$(symbol-variable)', description: 'sunucu bilgileri' },
      {
        name: 'izle',
        command: 'redis-cli monitor',
        icon: '$(debug-console)',
        description: 'komutları canlı izle (Ctrl+C ile durur)',
      },
      {
        name: 'anahtarlar',
        command: "redis-cli keys '*'",
        icon: '$(list-ordered)',
        description: 'tüm anahtarlar (büyük kümede yavaş)',
      },
      {
        name: 'flushall',
        command: 'redis-cli flushall',
        icon: '$(trash)',
        confirm: 'TÜM anahtarlar silinecek. Bu geri alınamaz. Devam?',
        description: 'tüm verileri siler',
      },
    ],
  },
  {
    name: 'Android',
    icon: '$(device-mobile)',
    color: '#3DDC84',
    summary: 'cihazlar, logcat, apk kur',
    commands: [
      { name: 'cihazlar', command: 'adb devices', icon: '$(device-mobile)', description: 'bağlı cihazlar' },
      {
        name: 'shell',
        command: 'adb shell',
        icon: '$(terminal)',
        description: 'cihaz kabuğu (Ctrl+C ile çık)',
      },
      {
        name: 'logcat',
        command: 'adb logcat',
        icon: '$(output)',
        description: 'cihaz logları (Ctrl+C ile durur)',
      },
      {
        name: 'apk kur',
        command: 'adb install',
        icon: '$(package)',
        argsPrompt: 'apk dosyası',
        description: 'APK yükler',
      },
      {
        name: 'port yönlendir',
        command: 'adb reverse',
        icon: '$(link)',
        argsPrompt: 'port (örn. tcp:8080 tcp:8080)',
        description: 'cihazdan makineye port yönlendirmesi',
      },
      {
        name: 'kaldır',
        command: 'adb uninstall',
        icon: '$(trash)',
        argsPrompt: 'paket adı (örn. com.ornek.uygulama)',
        confirm: 'Uygulama ve verileri cihazdan silinecek. Devam?',
        description: 'uygulamayı kaldırır',
      },
    ],
  },
  {
    name: 'Vercel',
    icon: '$(rocket)',
    color: '#FF4A4A',
    summary: 'dev sunucu, log, yayınla',
    commands: [
      {
        name: 'geliştirici sunucusu',
        command: 'vercel dev',
        icon: '$(play)',
        description: 'yerel sunucu (Ctrl+C ile durur)',
      },
      { name: 'derle', command: 'vercel build', icon: '$(package)', description: 'üretim derlemesi' },
      {
        name: 'loglar',
        command: 'vercel logs',
        icon: '$(history)',
        description: 'çalışma zamanı logları (Ctrl+C ile durur)',
      },
      {
        name: 'ortam değişkenleri',
        command: 'vercel env ls',
        icon: '$(symbol-key)',
        description: 'tanımlı ortam değişkenleri',
      },
      {
        name: 'yayınla',
        command: 'vercel --prod',
        icon: '$(rocket)',
        confirm: 'Üretim ortamına yayınlanacak. Devam?',
        description: 'canlıya çıkarır',
      },
    ],
  },
];

export const LIBRARY_GROUPS: readonly LibraryGroup[] = normalizeLibrary(RAW);