import { DeckGroup, countCommands } from './normalize';
import { ColorSpec, parseColor, parseIcon } from './style';

export const MASTER_ID = 'cmd-deck';
export const MASTER_STATUS_BAR_ID_PREFIX = 'cmd-deck';
export const ENTRY_NAME_PREFIX = 'Cmd Deck';
export const MASTER_LABEL = 'Cmd';

/**
 * Varsayılan bant. VSCode durum çubuğunu TÜM eklentilerin öncelik değerlerine göre
 * sıralar (yüksek = daha sol), yani bizim düğmelerimizin araya girmemesi için
 * kullanılmayan bir bant seçilmeli. Bu makinedeki eklentiler -1, 0, 1, 100 ve 1000
 * kullanıyor; 100 bantı Live Server/Pylance ile çakışıyordu. 200-259 boş.
 * Çakışma olursa `cmdDeck.statusBar.priority` ile kaydırılabilir.
 */
export const MASTER_PRIORITY = 250;

export interface StatusBarOptions {
  /** false ise yalnızca "cmd" düğmesi kalır. */
  readonly showGroups: boolean;
  /** false ise grup düğmesi gizlenir, sadece grup düğmeleri kalır. */
  readonly showMaster: boolean;
  /** Bu isimli gruplar hiç gösterilmez. */
  readonly hiddenGroups: readonly string[];
  /** "cmd" düğmesinin ikonu (cmdDeck.statusBar.icon). */
  readonly masterIcon: string;
  /** "cmd" düğmesinin önceliği; grup düğmeleri bundan 1, 2, 3... azalır. */
  readonly masterPriority?: number;
  /** Grup düğmesinde ikonun yanına yazılacak metin; boş dönerse yalnızca ikon. */
  readonly groupLabel: (group: DeckGroup) => string;
  /** En çok kullanılan komut bilgisi (saf veri). */
  readonly topCommand?: (group: DeckGroup) => { name: string; count: number } | undefined;
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
   * "Cmd Deck (extension)" olarak aynı görünür.
   */
  readonly name: string;
  readonly text: string;
  /** Bu düğmenin ön plan rengi; yoksa genel cmdDeck.statusBar.color uygulanır. */
  readonly color?: ColorSpec;
  readonly tooltipLines: string[];
  readonly priority: number;
}

function masterItem(
  groups: readonly DeckGroup[],
  options: StatusBarOptions,
  basePriority: number
): StatusBarPlanItem {
  return {
    kind: 'master',
    id: MASTER_ID,
    text: `${options.masterIcon} ${MASTER_LABEL}`,
    name: `${ENTRY_NAME_PREFIX}: Tüm Gruplar`,
    statusBarId: `${MASTER_STATUS_BAR_ID_PREFIX}.cmd`,
    tooltipLines: [
      `**Cmd Deck** — ${groups.length} grup, ${countCommands(groups)} komut`,
      'Tıkla: grup seç → komut çalıştır',
    ],
    priority: basePriority,
  };
}

/**
 * Durum çubuğunda hangi öğelerin, hangi sırayla ve hangi metinle gösterileceğini
 * hesaplar. Renk ve ikon uygulaması statusBar.ts'de, burada sadece plan var —
 * böylece ayar mantığı test edilebilir kalıyor.
 */
export function planItems(
  groups: readonly DeckGroup[],
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
  const visible = groups.filter((group) => !hidden.has(group.name));

  // Aynı isimli iki grup (ayarları elle yazarken olabilir) aynı id üretmesin.
  const nameOccurrences = new Map<string, number>();
  const uniqueName = (name: string): string => {
    const count = (nameOccurrences.get(name) ?? 0) + 1;
    nameOccurrences.set(name, count);
    return count === 1 ? name : `${name}#${count}`;
  };

  visible.forEach((group, index) => {
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
      statusBarId: `${MASTER_STATUS_BAR_ID_PREFIX}.group.${uniqueName(group.name)}`,
      text,
      tooltipLines: lines,
      // Grup düğmeleri cmd'in hemen sağında ve birbirinin sağında olsun diye azalan sıra.
      priority: base - 1 - index,
    });
  });

  return plan;
}