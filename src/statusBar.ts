import * as vscode from 'vscode';
import { getGroups } from './config';
import { DeckGroup, countCommands } from './normalize';
import { DEFAULT_MAX_GROUP_ITEMS, MASTER_ID, MASTER_PRIORITY, planItems, StatusBarPlanItem } from './plan';
import { ColorSpec, parseColor, parseIcon } from './style';
import { countOf, readLast, readUsage, UsageMap } from './usage';

const OPEN_COMMAND = 'cmd-deck.open';
const OPEN_GROUP_COMMAND = 'cmd-deck.openGroup';
const DEFAULT_ICON = 'terminal';

export interface StatusBarHandle {
  readonly items: readonly vscode.StatusBarItem[];
  refresh(): void;
}

function setting(key: string): unknown {
  return vscode.workspace.getConfiguration('cmdDeck.statusBar').get(key);
}

function applyColor(value: ColorSpec): string | vscode.ThemeColor | undefined {
  if (!value) {
    return undefined;
  }
  return 'hex' in value ? value.hex : new vscode.ThemeColor(value.theme);
}

/**
 * Durum çubuğu bütün eklentilerin öncelikleriyle birlikte sıralanır, bu yüzden
 * başka bir eklenti aynı değeri kullanırsa düğmelerimizin arasına girer
 * (Live Server 100 kullanıyordu). Değer ayardan kaydırılabilir.
 */
function masterPriority(): number {
  const value = setting('priority');
  return typeof value === 'number' && Number.isFinite(value) ? value : MASTER_PRIORITY;
}

function maxGroupItems(): number {
  const value = setting('maxGroupItems');
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : DEFAULT_MAX_GROUP_ITEMS;
}

function hiddenGroups(): readonly string[] {
  const value = setting('hiddenGroups');
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

/** Gruptaki en çok kullanılan komut — tooltip'te "En çok: X (×5)" olarak görünür. */
function topCommandFactory(usage: UsageMap) {
  return (group: DeckGroup): { name: string; count: number } | undefined => {
    let best: { name: string; count: number } | undefined;
    for (const command of group.commands) {
      const count = countOf(usage, group.name, command.name);
      if (count > 0 && (!best || count > best.count)) {
        best = { name: command.name, count };
      }
    }
    return best;
  };
}

export function createStatusBar(context: vscode.ExtensionContext): StatusBarHandle {
  const items: vscode.StatusBarItem[] = [];
  let signature = '';

  function build(plan: StatusBarPlanItem[]): void {
    for (const item of items) {
      item.dispose();
    }
    items.length = 0;

    for (const entry of plan) {
      // id verilmezse hepsi eklenti kimliğini alır ve sağ tık menüsü tek kalemde
      // toplanır; ayrı id ile her düğme ayrı gizlenebilir/gösterilebilir.
      const item = vscode.window.createStatusBarItem(
        entry.statusBarId,
        vscode.StatusBarAlignment.Right,
        entry.priority
      );
      // Menüde ("Hide Status Bar Items") görünecek ad; set edilmezse menüde
      // "Cmd Deck (extension)" yazar ve tüm düğmeler aynı görünür.
      item.name = entry.name;
      item.command =
        entry.kind === 'group'
          ? {
              command: OPEN_GROUP_COMMAND,
              title: `${entry.id} komutları`,
              arguments: [entry.id],
            }
          : OPEN_COMMAND;
      items.push(item);
    }
  }

  const refresh = (): void => {
    const groups = getGroups();
    const usage = readUsage(context.workspaceState);
    const last = readLast(context.workspaceState);

    const plan = planItems(groups, {
      showGroups: setting('showGroups') !== false,
      showMaster: setting('showMaster') !== false,
      hiddenGroups: hiddenGroups(),
      maxGroupItems: maxGroupItems(),
      masterIcon: parseIcon(setting('icon'), DEFAULT_ICON),
      masterPriority: masterPriority(),
      groupLabel: setting('groupLabel') === 'always' ? (group: DeckGroup) => group.name : () => '',
      topCommand: topCommandFactory(usage),
    });

    // Öğeler yalnızca yapı değiştiğinde yeniden kurulur; her çalıştırmada
    // dispose/create yapılmasın diye imza karşılaştırması var.
    const nextSignature = JSON.stringify(
      // İmzada yalnızca build() sırasında kullanılan alanlar var; metin, renk ve
      // tooltip döngüde uygulandığı için gereksiz yeniden kurulum tetiklemesin.
      plan.map((entry) => [
        entry.kind,
        entry.id,
        entry.statusBarId,
        entry.name,
        entry.priority,
        entry.visible,
      ])
    );
    if (nextSignature !== signature) {
      build(plan);
      signature = nextSignature;
      // Görünürlük yalnızca yapı değiştiğinde uygulanıyor. Sınırın ötesindeki
      // gruplar burada gizleniyor; kullanıcı sağ tıkla açarsa bir sonraki
      // komut çalıştırmasında tekrar gizlenmiyor (pre tercihi bozulmasın).
      plan.forEach((entry, index) => {
        const item = items[index];
        if (!item) return;
        if (entry.visible) item.show();
        else item.hide();
      });
    }

    const color = applyColor(parseColor(setting('color')));
    const background = applyColor(parseColor(setting('background')));
    const empty = groups.length === 0;

    plan.forEach((entry, index) => {
      const item = items[index];
      if (!item) {
        return;
      }

      // Sınırın ötesindeki düğmeler de burada boyanır. Metin atanmazsa
      // kullanıcı sağ tık → "Hide Status Bar Items" → Show ile açtığında
      // içi boş, görünmez bir düğmeyle karşılaşır. Görünürlük build() aşamasında
      // kararlaştırıldığı için show()/hide() bu döngüde çağrılmaz.
      item.text = empty && entry.kind === 'master' ? `${entry.text}!` : entry.text;
      // Grup düğmesinin kendi rengi varsa o, yoksa genel renk geçerli.
      item.color = applyColor(entry.color) ?? color;
      item.backgroundColor = background;

      const lines =
        entry.kind === 'master' && !empty
          ? [
              `**Cmd Deck** — ${groups.length} grup, ${countCommands(groups)} komut`,
              ...omittedNote(plan, groups.length),
              last
                ? `Son: ${resolveLastLabel(groups, last.group, last.name) ?? 'artık ayarlarda yok'}`
                : 'Son: henüz çalıştırılmadı',
              `${totalRuns(usage)} çalıştırma`,
              '',
              'Tıkla: grup seç → komut çalıştır',
            ]
          : empty
            ? ['Cmd Deck — "cmdDeck.groups" boş, komut yok']
            : entry.tooltipLines;

      item.tooltip = new vscode.MarkdownString(lines.join('\n\n'));
    });
  };

  refresh();

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('cmdDeck')) {
        refresh();
      }
    })
  );

  // dispose: deactivate içinde subscriptions üzerinden otomatik yapılır.
  return {
    get items() {
      return items;
    },
    refresh,
  };
}

/** Çubukta sığmayan grupları açıkça söyle, yoksa "kayıp grup" gibi görünür. */
function omittedNote(plan: StatusBarPlanItem[], totalGroups: number): string[] {
  const groups = plan.filter((entry) => entry.kind === 'group');
  const shown = groups.filter((entry) => entry.visible).length;
  const omitted = groups.length - shown;

  return omitted > 0
    ? [
        `${omitted} grup düğmesi gizli (sağ tık → Show ile açılabilir, ${shown}/${totalGroups} görünür)`,
      ]
    : [];
}

function totalRuns(usage: UsageMap): number {
  return Object.values(usage).reduce((sum, record) => sum + record.count, 0);
}

function resolveLastLabel(
  groups: readonly DeckGroup[],
  groupName: string,
  commandName: string
): string | null {
  const group = groups.find((candidate) => candidate.name === groupName);
  const command = group?.commands.find((candidate) => candidate.name === commandName);
  return command ? `${groupName} › ${commandName}` : null;
}

export { MASTER_ID, MASTER_PRIORITY };