import { Group, countCommands } from './normalize';
import { ColorSpec, parseColor, parseIcon } from './style';

export const MASTER_ID = 'cmdkit';
export const MASTER_STATUS_BAR_ID_PREFIX = 'cmdkit';
export const ENTRY_NAME_PREFIX = 'Cmdkit';
export const MASTER_LABEL = 'Cmd';

/**
 * İlk kurulumda kaç grup düğmesi gösterilsin. Kullanıcı sonradan
 * `cmdkit.statusBar.maxGroupItems` ile değiştirir; 0 = sınırsız.
 */
export const DEFAULT_MAX_GROUP_ITEMS = 3;

/**
 * Varsayılan bant. VSCode durum çubuğunu TÜM eklentilerin öncelik değerlerine göre
 * sıralar (yüksek = daha sol), yani bizim düğmelerimizin araya girmemesi için
 * kullanılmayan bir bant seçilmeli. Bu makinedeki eklentiler -1, 0, 1, 100 ve 1000
 * kullanıyor; 100 bantı Live Server/Pylance ile çakışıyordu. 200-259 boş.
 * Çakışma olursa `cmdkit.statusBar.priority` ile kaydırılabilir.
 */
export const MASTER_PRIORITY = 250;

export interface StatusBarOptions {
  /** false ise yalnızca "cmd" düğmesi kalır. */
  readonly showGroups: boolean;
  /** false ise grup düğmesi gizlenir, sadece grup düğmeleri kalır. */
  readonly showMaster: boolean;
  /** Bu isimli gruplar hiç gösterilmez. */
  readonly hiddenGroups: readonly string[];
  /**
   * Durum çubuğunda en fazla kaç grup düğmesi gösterilsin. Fazlası yalnızca
   * Cmd düğmesi ve arama üzerinden erişilebilir kalır.
   * 0 veya negatif = sınırsız (tüm gruplar gösterilir).
   */
  readonly maxGroupItems?: number;
  /** "cmd" düğmesinin ikonu (cmdkit.statusBar.icon). */
  readonly masterIcon: string;
  /** "cmd" düğmesinin önceliği; grup düğmeleri bundan 1, 2, 3... azalır. */
  readonly masterPriority?: number;
  /** Grup düğmesinde ikonun yanına yazılacak metin; boş dönerse yalnızca ikon. */
  readonly groupLabel: (group: Group) => string;
  /** En çok kullanılan komut bilgisi (saf veri). */
  readonly topCommand?: (group: Group) => { name: string; count: number } | undefined;
}

export interface StatusBarPlanItem {
  readonly kind: 'master' | 'group';
  /** master için MASTER_ID, grup düğmesinde grup adı. */
  readonly id: string;
  /**
   * VSCode durum çubuğu öğesinin kimliği. Sağ tık menüsü ("Hide Status Bar Items")
   * bu kimliğe göre grupluyor; id verilmezse hepsi eklenti kimliğine düşüyor ve
   * tek tıkla hepsi gizleniyor. Bu yüzden her düğmeye ayrı id veriyoruz.
   */
  readonly statusBarId: string;
  /**
   * Sağ tık menüsünde ("Hide Status Bar Items") görünen ad. VSCode bu alanı
   * kullanıcıya gösterir; set edilmezse uzantı adına düşer ve menüde her öğe
   * "Cmdkit (extension)" olarak aynı görünür.
   */
  readonly name: string;
  readonly text: string;
  /**
   * true ise düğme başlangıçta görünür; false ise sınır nedeniyle gizli
   * başlatılır ama **oluşturulur** — böylece durum çubuğu sağ tık menüsünde
   * listelenir ve kullanıcı kendi açabilir.
   */
  readonly visible: boolean;
  /** Bu düğmenin ön plan rengi; yoksa genel cmdkit.statusBar.color uygulanır. */
  readonly color?: ColorSpec;
  readonly tooltipLines: string[];
  readonly priority: number;
}

function masterItem(
  groups: readonly Group[],
  options: StatusBarOptions,
  basePriority: number
): StatusBarPlanItem {
  return {
    kind: 'master',
    id: MASTER_ID,
    text: `${options.masterIcon} ${MASTER_LABEL}`,
    visible: true,
    name: `${ENTRY_NAME_PREFIX}: Tüm Gruplar`,
    statusBarId: `${MASTER_STATUS_BAR_ID_PREFIX}.cmd`,
    tooltipLines: [
      `**Cmdkit** — ${groups.length} grup, ${countCommands(groups)} komut`,
      'Tıkla: grup seç → komut çalıştır',
    ],
    priority: basePriority,
  };
}

export interface VisibilityInput {
  readonly hiddenGroups: readonly string[];
  readonly maxGroupItems?: number;
}

/** Şu anda çubukta görünen grup adları (gizleme + sınır uygulanmış hâli). */
export function visibleGroupNames(
  groups: readonly Group[],
  input: VisibilityInput
): string[] {
  const hidden = new Set(input.hiddenGroups);
  const raw =
    typeof input.maxGroupItems === 'number' && Number.isFinite(input.maxGroupItems)
      ? Math.trunc(input.maxGroupItems)
      : DEFAULT_MAX_GROUP_ITEMS;

  return groups
    .filter((group) => !hidden.has(group.name))
    .filter((_, index) => raw <= 0 || index < raw)
    .map((group) => group.name);
}

/** Kullanıcının seçimine göre `hiddenGroups` için ne yazılmalı. */
export function hiddenGroupNames(
  groups: readonly Group[],
  selected: readonly string[]
): string[] {
  const picked = new Set(selected);
  return groups.filter((group) => !picked.has(group.name)).map((group) => group.name);
}

/**
 * Durum çubuğunda hangi öğelerin, hangi sırayla ve hangi metinle gösterileceğini
 * hesaplar. Renk ve ikon uygulaması statusBar.ts'de, burada sadece plan var —
 * böylece ayar mantığı test edilebilir kalıyor.
 */
export function planItems(
  groups: readonly Group[],
  options: StatusBarOptions
): StatusBarPlanItem[] {
  const plan: StatusBarPlanItem[] = [];
  const base = options.masterPriority ?? MASTER_PRIORITY;

  if (options.showMaster) {
    plan.push(masterItem(groups, options, base));
  }

  if (!options.showGroups) {
    return plan;
  }

  const hidden = new Set(options.hiddenGroups);
  const raw =
    typeof options.maxGroupItems === 'number' && Number.isFinite(options.maxGroupItems)
      ? Math.trunc(options.maxGroupItems)
      : DEFAULT_MAX_GROUP_ITEMS;

  // Gizlenenler önce eleniyor; böylece "ilk N grup" kuralı hiddenGroups'tan
  // bağımsız ve öngörülebilir kalıyor. 0 ya da negatif = sınırsız.
  const notHidden = groups.filter((group) => !hidden.has(group.name));
  const unlimited = raw <= 0;

  // Aynı isimli iki grup (ayarları elle yazarken olabilir) aynı id üretmesin.
  const nameOccurrences = new Map<string, number>();
  const uniqueName = (name: string): string => {
    const count = (nameOccurrences.get(name) ?? 0) + 1;
    nameOccurrences.set(name, count);
    return count === 1 ? name : `${name}#${count}`;
  };

  notHidden.forEach((group, index) => {
    const icon = parseIcon(group.icon);
    const label = options.groupLabel(group);
    const text = label ? `${icon} ${label}` : icon;
    const lines = [`**${group.icon} ${group.name}** — ${group.commands.length} komut`];

    const top = options.topCommand?.(group);
    if (top) {
      lines.push(`En çok: ${top.name} (×${top.count})`);
    }

    lines.push('', 'Tıkla: bu grubun komutları');

    plan.push({
      kind: 'group',
      id: group.name,
      name: `${ENTRY_NAME_PREFIX}: ${group.name}`,
      color: parseColor(group.color),
      visible: unlimited || index < raw,
      statusBarId: `${MASTER_STATUS_BAR_ID_PREFIX}.group.${uniqueName(group.name)}`,
      text,
      tooltipLines: lines,
      // Grup düğmeleri cmd'in hemen sağında ve birbirinin sağında olsun diye azalan sıra.
      // Öncelik sıralamayı korur: gizli başlatılanlar da yerini alıyor ki
      // kullanıcı açtığında çubuktaki sırası bozulmasın.
      priority: base - 1 - index,
    });
  });

  return plan;
}