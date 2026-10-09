import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  ConfigurationTarget,
  MemoryMemento,
  messages,
  openedDocuments,
  queueMessage,
  queueOpenDialog,
  quickPickCalls,
  queueQuickPick,
  resetConfiguration,
  setConfiguration,
  setOpenDocument,
  setWorkspaceFolders,
  Uri,
  writes,
} from '../stubs/vscode';
import { LIBRARY_GROUPS } from '../../src/library';
import { normalizeGroups } from '../../src/normalize';
import {
  addLibraryGroup,
  applyGroupFile,
  editGroupFile,
  reloadGroupFile,
  removeGroup,
} from '../../src/settings';

/** Gerçek dosya sistemi kullanır; geçici klasör test sonunda silinir. */
let dir: string;

function context() {
  return {
    subscriptions: [],
    workspaceState: new MemoryMemento(),
    globalState: new MemoryMemento(),
  };
}

function groupFile(): string {
  return join(dir, '.vscode', 'cmdkit-groups.json');
}

function read(): string {
  return readFileSync(groupFile(), 'utf8');
}

const ONE_GROUP = [{ name: 'Git', commands: [{ name: 'durum', command: 'git status' }] }];

/** Bir sonraki QuickPick'ta seçilecek modu/hedefi hazırlar. */
const MERGE = { mode: 'merge' };
const REPLACE = { mode: 'replace' };
const PROJECT = { target: ConfigurationTarget.Workspace };
const USER = { target: ConfigurationTarget.Global };

beforeEach(() => {
  resetConfiguration();
  dir = mkdtempSync(join(tmpdir(), 'cmdkit-test-'));
  setWorkspaceFolders(dir);
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('editGroupFile', () => {
  beforeEach(() => {
    setConfiguration('cmdkit', { groups: ONE_GROUP });
  });

  it('dosya yoksa ayarlardan yazıp açar', async () => {
    await editGroupFile(context() as never);

    expect(read()).toContain('git status');
    expect(openedDocuments).toHaveLength(1);
  });

  it('yazdığı dosyada normalize dolguları olmaz', async () => {
    await editGroupFile(context() as never);

    expect(read()).not.toContain('"confirm": false');
  });

  it('dosya varsa üzerine yazmaz', async () => {
    mkdirSync(join(dir, '.vscode'), { recursive: true });
    writeFileSync(groupFile(), 'KULLANICI ELLE YAZDI', 'utf8');

    await editGroupFile(context() as never);

    expect(read()).toBe('KULLANICI ELLE YAZDI');
  });

  it('dosya yolunu hatırlar', async () => {
    const ctx = context();

    await editGroupFile(ctx as never);

    expect(ctx.workspaceState.get('cmdkit.groupFilePath')).toBe(groupFile());
  });

  it('dosya silinmişse yeniden oluşturur', async () => {
    const ctx = context();
    await editGroupFile(ctx as never);
    rmSync(groupFile());

    await editGroupFile(ctx as never);

    expect(read()).toContain('git status');
  });

  it('ayarlarda komut yoksa uyarır ve dosya yazmaz', async () => {
    setConfiguration('cmdkit', { groups: [] });

    await editGroupFile(context() as never);

    expect(messages.at(-1)?.kind).toBe('warning');
    expect(() => read()).toThrow();
  });
});

describe('reloadGroupFile', () => {
  beforeEach(() => {
    setConfiguration('cmdkit', { groups: ONE_GROUP });
  });

  it('dosya yoksa önce düzenlemeyi ister', async () => {
    await reloadGroupFile(context() as never);

    expect(messages.at(-1)?.text).toContain('Edit Command List');
    expect(writes).toHaveLength(0);
  });

  it('dosyayı ayarlardaki liste ile üzerine yazar', async () => {
    const ctx = context();
    await editGroupFile(ctx as never);
    writeFileSync(groupFile(), '[{"name":"Baska","commands":[]}]', 'utf8');

    await reloadGroupFile(ctx as never);

    expect(read()).toContain('git status');
    expect(read()).not.toContain('Baska');
  });

  it('üzerine yazarken de normalize dolguları yazmaz', async () => {
    const ctx = context();
    await editGroupFile(ctx as never);

    await reloadGroupFile(ctx as never);

    expect(read()).not.toContain('"clear": false');
  });
});

describe('applyGroupFile', () => {
  beforeEach(() => {
    setConfiguration('cmdkit', { groups: ONE_GROUP });
  });

  function withFile(contents: string) {
    mkdirSync(join(dir, '.vscode'), { recursive: true });
    writeFileSync(groupFile(), contents, 'utf8');
    const ctx = context();
    // Yol hatırlanmış olmalı, yoksa applyGroupFile dosya seçtirmek ister.
    void ctx.workspaceState.update('cmdkit.groupFilePath', groupFile());
    return ctx;
  }

  it('hatırlanan dosyadan okur, dosya seçtirmez', async () => {
    // İçerik ayarlardan farklı olmalı, yoksa "değişiklik yok" yolu çalışır.
    const ctx = withFile(
      JSON.stringify([{ name: 'Git', commands: [{ name: 'yeni', command: 'x' }] }])
    );
    queueQuickPick(MERGE, PROJECT);
    queueMessage('Yaz');

    await applyGroupFile(ctx as never);

    expect(writes).toHaveLength(1);
  });

  it('yol hatırlanmamışsa dosya seçtirir', async () => {
    mkdirSync(join(dir, '.vscode'), { recursive: true });
    writeFileSync(
      groupFile(),
      JSON.stringify([{ name: 'Git', commands: [{ name: 'yeni', command: 'x' }] }]),
      'utf8'
    );
    const ctx = context();
    queueOpenDialog(Uri.file(groupFile()));
    queueQuickPick(MERGE, PROJECT);
    queueMessage('Yaz');

    await applyGroupFile(ctx as never);

    expect(writes).toHaveLength(1);
    expect(ctx.workspaceState.get('cmdkit.groupFilePath')).toBe(groupFile());
  });

  it('geçersiz içerikte hata verir ve yazmaz', async () => {
    const ctx = withFile('{ bu json değil');

    await applyGroupFile(ctx as never);

    expect(messages.at(-1)?.kind).toBe('error');
    expect(writes).toHaveLength(0);
  });

  it('onay düğmesine basılmazsa yazmaz', async () => {
    const ctx = withFile(JSON.stringify(ONE_GROUP));
    queueQuickPick(MERGE, PROJECT);
    queueMessage(undefined); // kullanıcı vazgeçti

    await applyGroupFile(ctx as never);

    expect(writes).toHaveLength(0);
  });

  it('mod seçilmezse yazmaz', async () => {
    const ctx = withFile(JSON.stringify(ONE_GROUP));
    queueQuickPick(undefined);

    await applyGroupFile(ctx as never);

    expect(writes).toHaveLength(0);
  });

  it('değişiklik yoksa onay bile göstermez ve ayarlara dokunmaz', async () => {
    const ctx = withFile(JSON.stringify(ONE_GROUP));
    queueQuickPick(MERGE);

    await applyGroupFile(ctx as never);

    expect(writes).toHaveLength(0);
    expect(messages.at(-1)?.text).toContain('nothing was written');
  });

  it('yeni komutu birleştirip yazar', async () => {
    const ctx = withFile(
      JSON.stringify([
        { name: 'Git', commands: [{ name: 'durum', command: 'git status' }, { name: 'yeni', command: 'x' }] },
      ])
    );
    queueQuickPick(MERGE, PROJECT);
    queueMessage('Yaz');

    await applyGroupFile(ctx as never);

    expect(writes).toHaveLength(1);
    expect(writes[0].target).toBe(ConfigurationTarget.Workspace);
    expect((writes[0].value as { commands: { name: string }[] }[])[0].commands.map((c) => c.name)).toEqual(['durum', 'yeni']);
  });

  it('ayarlara normalize dolguları yazmaz', async () => {
    const ctx = withFile(
      JSON.stringify([
        { name: 'Git', commands: [{ name: 'durum', command: 'git status' }, { name: 'yeni', command: 'x' }] },
      ])
    );
    queueQuickPick(MERGE, PROJECT);
    queueMessage('Yaz');

    await applyGroupFile(ctx as never);

    expect(JSON.stringify(writes[0].value)).not.toContain('"confirm": false');
    expect(JSON.stringify(writes[0].value)).not.toContain('"clear": false');
  });

  it('seçilen hedefi kullanır', async () => {
    const ctx = withFile(
      JSON.stringify([{ name: 'Git', commands: [{ name: 'yeni', command: 'x' }] }])
    );
    queueQuickPick(REPLACE, USER);
    queueMessage('Yaz');

    await applyGroupFile(ctx as never);

    expect(writes[0].target).toBe(ConfigurationTarget.Global);
  });

  it('Listeyi değiştir modunda listede olmayan komutu siler', async () => {
    const ctx = withFile(
      JSON.stringify([{ name: 'Git', commands: [{ name: 'yeni', command: 'x' }] }])
    );
    queueQuickPick(REPLACE, PROJECT);
    queueMessage('Yaz');

    await applyGroupFile(ctx as never);

    const written = (writes[0].value as { commands: { name: string }[] }[])[0];
    expect(written.commands.map((c) => c.name)).toEqual(['yeni']);
  });

  it('uygulama sonrası ayarlar okunabilir kalır', async () => {
    const ctx = withFile(
      JSON.stringify([{ name: 'Git', commands: [{ name: 'yeni', command: 'x', confirm: 'Emin mi?' }] }])
    );
    queueQuickPick(REPLACE, PROJECT);
    queueMessage('Yaz');

    await applyGroupFile(ctx as never);

    const stored = new Map(
      (writes[0].value as { commands: Record<string, unknown>[] }[])[0].commands.map((c) => [c.name, c])
    );
    expect(stored.get('yeni')?.confirm).toBe('Emin mi?');
  });
});
describe('addLibraryGroup', () => {
  beforeEach(() => {
    setConfiguration('cmdkit', { groups: ONE_GROUP });
  });

  function libraryPick(name: string) {
    return queuePickByLabel(name);
  }

  it('kütüphaneden grup seçer ve listeye ekler', async () => {
    libraryPick('Docker');
    queueQuickPick({ target: ConfigurationTarget.Workspace });
    queueMessage('Yaz');

    await addLibraryGroup(context());

    expect(writes).toHaveLength(1);
    const written = writes[0].value as { name: string; commands: unknown[] }[];
    expect(written.map((g) => g.name)).toEqual(['Git', 'Docker']);
    expect(written[1].commands.length).toBe(9);
  });

  it('mevcut komutlara dokunmaz', async () => {
    libraryPick('Docker');
    queueQuickPick({ target: ConfigurationTarget.Workspace });
    queueMessage('Yaz');

    await addLibraryGroup(context());

    const written = writes[0].value as { name: string; commands: { name: string }[] }[];
    expect(written[0].commands.map((c) => c.name)).toEqual(['durum']);
  });

  it('zaten ekili olan grubu seçicide göstermez', async () => {
    setConfiguration('cmdkit', {
      groups: [...ONE_GROUP, { name: 'Docker', commands: [{ name: 'x', command: 'y' }] }],
    });
    libraryPick('Go');
    queueQuickPick({ target: ConfigurationTarget.Workspace });
    queueMessage('Yaz');

    await addLibraryGroup(context());

    const offered = (quickPickCalls[0].items as { label: string }[]).map((item) => item.label);
    expect(offered.join(' ')).not.toContain('Docker');
    // Ayarlarda Git ve Docker var; kütüphanedeki diğer 13 sunulmalı.
    expect(offered.length).toBe(LIBRARY_GROUPS.length - 2);
  });

  it('seçilen grubu mevcut grupların sonuna ekler', async () => {
    setConfiguration('cmdkit', {
      groups: [...ONE_GROUP, { name: 'Docker', commands: [{ name: 'x', command: 'y' }] }],
    });
    libraryPick('Go');
    queueQuickPick({ target: ConfigurationTarget.Workspace });
    queueMessage('Yaz');

    await addLibraryGroup(context());

    const written = (writes[0].value as { name: string }[]).map((g) => g.name);
    expect(written).toEqual(['Git', 'Docker', 'Go']);
  });

  it('hepsi ekliyse uyarır ve yazmaz', async () => {
    setConfiguration('cmdkit', {
      groups: LIBRARY_GROUPS.map((group) => ({
        name: group.name,
        commands: [{ name: 'x', command: 'y' }],
      })),
    });

    await addLibraryGroup(context());

    expect(messages.at(-1)?.text).toContain('are already added');
    expect(writes).toHaveLength(0);
  });

  it('seçimden vazgeçilirse yazmaz', async () => {
    queueQuickPick(undefined);

    await addLibraryGroup(context());

    expect(writes).toHaveLength(0);
  });

  it('hedef seçilmezse yazmaz', async () => {
    libraryPick('Docker');
    queueQuickPick(undefined);

    await addLibraryGroup(context());

    expect(writes).toHaveLength(0);
  });

  it('onaylanmazsa yazmaz', async () => {
    libraryPick('Docker');
    queueQuickPick({ target: ConfigurationTarget.Workspace });
    queueMessage(undefined);

    await addLibraryGroup(context());

    expect(writes).toHaveLength(0);
  });

  it('eklenen gruba normalize dolguları yazmaz', async () => {
    libraryPick('Redis');
    queueQuickPick({ target: ConfigurationTarget.Workspace });
    queueMessage('Yaz');

    await addLibraryGroup(context());

    expect(JSON.stringify(writes[0].value)).not.toContain('"confirm": false');
  });

  it('yıkıcı komutlar confirm alanını korur', async () => {
    libraryPick('Redis');
    queueQuickPick({ target: ConfigurationTarget.Workspace });
    queueMessage('Yaz');

    await addLibraryGroup(context());

    const written = writes[0].value as { commands: { name: string; confirm?: string }[] }[];
    const flushall = written[1].commands.find((c) => c.name === 'flushall');
    expect(flushall?.confirm).toBeTruthy();
  });

  it('argsPrompt komutları argüman istemini korur', async () => {
    libraryPick('Go');
    queueQuickPick({ target: ConfigurationTarget.Workspace });
    queueMessage('Yaz');

    await addLibraryGroup(context());

    const written = writes[0].value as { commands: { name: string; argsPrompt?: string }[] }[];
    const run = written[1].commands.find((c) => c.name === 'run');
    expect(run?.argsPrompt).toBeTruthy();
  });

  it('seçilen hedefe yazar', async () => {
    libraryPick('Go');
    queueQuickPick({ target: ConfigurationTarget.Global });
    queueMessage('Yaz');

    await addLibraryGroup(context());

    expect(writes[0].target).toBe(ConfigurationTarget.Global);
  });
});

/** Kütüphane seçicisinde adı geçen öğeyi döndürür (stub kuyruk sırasıyla verir). */
function queuePickByLabel(name: string): void {
  const group = LIBRARY_GROUPS.find((candidate) => candidate.name === name);
  if (!group) {
    throw new Error(`kütüphanede yok: ${name}`);
  }
  queueQuickPick({
    label: `${group.icon} ${group.name}`,
    description: group.summary,
    detail: `${group.commands.length} komut`,
    group,
  });
}

describe('kütüphane ekledikten sonra düzenleme dosyası senkronlanır', () => {
  beforeEach(() => {
    setConfiguration('cmdkit', { groups: ONE_GROUP });
  });

  /** Dosyayı oluşturur, yolu hatırlatır ve ayarlarla aynı içerikle doldurur. */
  async function inSyncFile() {
    const ctx = context();
    await editGroupFile(ctx as never);
    return ctx;
  }

  it('dosya yoksa dokunmaz', async () => {
    const ctx = context();
    queuePickByLabel('Docker');
    queueQuickPick({ target: ConfigurationTarget.Workspace });
    queueMessage('Yaz');

    await addLibraryGroup(ctx as never);

    expect(() => read()).toThrow();
  });

  it('dosya ayarlarla aynıysa yeni grubu da içine alır', async () => {
    const ctx = await inSyncFile();
    queuePickByLabel('Docker');
    queueQuickPick({ target: ConfigurationTarget.Workspace });
    queueMessage('Yaz');

    await addLibraryGroup(ctx as never);

    const written = JSON.parse(read()) as { name: string }[];
    expect(written.map((g) => g.name)).toEqual(['Git', 'Docker']);
  });

  it('senkronlama da normalize dolguları yazmaz', async () => {
    const ctx = await inSyncFile();
    queuePickByLabel('Docker');
    queueQuickPick({ target: ConfigurationTarget.Workspace });
    queueMessage('Yaz');

    await addLibraryGroup(ctx as never);

    expect(read()).not.toContain('"confirm": false');
  });

  /**
   * Dosyada uygulanmamış düzenleme varsa senkronlama onu ezerdi — kullanıcının
   * işi kaybolurdu. Dosya olduğu gibi bırakılır ve uyarı verilir.
   */
  it('dosyada uygulanmamış düzenleme varsa dokunmaz ve uyarır', async () => {
    const ctx = await inSyncFile();
    writeFileSync(groupFile(), JSON.stringify(ONE_GROUP), 'utf8');
    setConfiguration('cmdkit', {
      groups: [...ONE_GROUP, { name: 'Docker', commands: [{ name: 'x', command: 'y' }] }],
    });
    queuePickByLabel('Go');
    queueQuickPick({ target: ConfigurationTarget.Workspace });
    queueMessage('Yaz');

    await addLibraryGroup(ctx as never);

    expect(read()).not.toContain('Go');
    expect(messages.some((message) => message.text.includes('differs from your settings'))).toBe(true);
  });

  it('dosyada kaydedilmemiş düzenleme varsa dokunmaz', async () => {
    const ctx = await inSyncFile();
    setOpenDocument(groupFile(), true);
    queuePickByLabel('Docker');
    queueQuickPick({ target: ConfigurationTarget.Workspace });
    queueMessage('Yaz');

    await addLibraryGroup(ctx as never);

    expect(read()).not.toContain('Docker');
  });

  it('onaylanmazsa dosyaya da dokunmaz', async () => {
    const ctx = await inSyncFile();
    queuePickByLabel('Docker');
    queueQuickPick({ target: ConfigurationTarget.Workspace });
    queueMessage(undefined);

    await addLibraryGroup(ctx as never);

    expect(read()).not.toContain('Docker');
  });
});

describe('removeGroup', () => {
  beforeEach(() => {
    setConfiguration('cmdkit', {
      groups: [...ONE_GROUP, { name: 'Docker', commands: [{ name: 'x', command: 'y' }] }],
    });
  });

  function pick(name: string) {
    const group = normalizeGroups([
      { name, commands: [{ name: 'x', command: 'y' }] },
    ])[0];
    queueQuickPick({ label: `${group!.icon} ${group!.name}`, description: '1 komut', group });
  }

  it('seçilen grubu listeden çıkarır', async () => {
    pick('Docker');
    queueQuickPick({ target: ConfigurationTarget.Workspace });
    queueMessage('Yaz');

    await removeGroup(context() as never);

    const written = (writes[0].value as { name: string }[]).map((g) => g.name);
    expect(written).toEqual(['Git']);
  });

  it('yalnızca seçilen grubu siler, diğerlerine dokunmaz', async () => {
    pick('Docker');
    queueQuickPick({ target: ConfigurationTarget.Workspace });
    queueMessage('Yaz');

    await removeGroup(context() as never);

    expect(writes).toHaveLength(1);
    expect(JSON.stringify(writes[0].value)).toContain('git status');
  });

  it('onay metni kaç komutun gittiğini söyler', async () => {
    pick('Docker');
    queueQuickPick({ target: ConfigurationTarget.Workspace });
    queueMessage('Yaz');

    await removeGroup(context() as never);

    const modal = messages.find((m) => m.text.includes('will be deleted'));
    expect(modal?.text).toContain('1 commands');
    expect(modal?.text).toContain('cannot be undone');
  });

  it('onaylanmazsa yazmaz', async () => {
    pick('Docker');
    queueQuickPick({ target: ConfigurationTarget.Workspace });
    queueMessage(undefined);

    await removeGroup(context() as never);

    expect(writes).toHaveLength(0);
  });

  it('seçimden vazgeçilirse yazmaz', async () => {
    queueQuickPick(undefined);

    await removeGroup(context() as never);

    expect(writes).toHaveLength(0);
  });

  it('grup yoksa uyarır', async () => {
    setConfiguration('cmdkit', { groups: [] });

    await removeGroup(context() as never);

    expect(writes).toHaveLength(0);
    expect(messages.at(-1)?.kind).toBe('warning');
  });

  it('son grubu silmeyi reddeder', async () => {
    setConfiguration('cmdkit', { groups: ONE_GROUP });
    const group = normalizeGroups(ONE_GROUP)[0];
    queueQuickPick({ label: `${group!.icon} ${group!.name}`, description: '1 komut', group });

    await removeGroup(context() as never);

    expect(writes).toHaveLength(0);
    expect(messages.at(-1)?.text).toContain('only group');
  });

  it('dosya senkronsa silinen grubu dosyadan da çıkarır', async () => {
    const ctx = context();
    await editGroupFile(ctx as never);
    pick('Docker');
    queueQuickPick({ target: ConfigurationTarget.Workspace });
    queueMessage('Yaz');

    await removeGroup(ctx as never);

    const fromFile = JSON.parse(read()) as { name: string }[];
    expect(fromFile.map((g) => g.name)).toEqual(['Git']);
  });

  it('dosyada uygulanmamış düzenleme varsa uyarır — geri gelmesin diye', async () => {
    const ctx = context();
    await editGroupFile(ctx as never);
    // Dosyada Docker silinmiş ama ayarlarda hâlâ var: kullanıcının uygulanmamış işi
    writeFileSync(groupFile(), JSON.stringify(ONE_GROUP), 'utf8');
    pick('Docker');
    queueQuickPick({ target: ConfigurationTarget.Workspace });
    queueMessage('Yaz');

    await removeGroup(ctx as never);

    expect(messages.some((m) => m.text.includes('is still in the editing file'))).toBe(true);
    expect(messages.some((m) => m.text.includes('it comes back'))).toBe(true);
  });

  it('seçilen hedefe yazar', async () => {
    pick('Docker');
    queueQuickPick({ target: ConfigurationTarget.Global });
    queueMessage('Yaz');

    await removeGroup(context() as never);

    expect(writes[0].target).toBe(ConfigurationTarget.Global);
  });
});

describe('düzenleme dosyasının yeri', () => {
  beforeEach(() => {
    setConfiguration('cmdkit', { groups: ONE_GROUP });
  });

  it('varsayılan .vscode/ altında', async () => {
    await editGroupFile(context() as never);

    expect(read()).toContain('git status');
  });

  it('.vscode klasörü yoksa oluşturur', async () => {
    expect(existsSync(join(dir, '.vscode'))).toBe(false);

    await editGroupFile(context() as never);

    expect(existsSync(join(dir, '.vscode'))).toBe(true);
  });

  it('cmdkit.groupFile göreli yolu ilk klasörün köküne göre çözer', async () => {
    setConfiguration('cmdkit', {
      groups: ONE_GROUP,
      groupFile: 'packages/api/cmdkit-groups.json',
    });

    await editGroupFile(context() as never);

    expect(existsSync(join(dir, 'packages', 'api', 'cmdkit-groups.json'))).toBe(true);
  });

  it('cmdkit.groupFile mutlak yolu olduğu gibi kullanır', async () => {
    const absolute = join(dir, 'ozel', 'liste.json');
    setConfiguration('cmdkit', { groups: ONE_GROUP, groupFile: absolute });

    await editGroupFile(context() as never);

    expect(existsSync(absolute)).toBe(true);
  });

  it('yol hatırlanmışsa ayar değişikliği yerine o yol kullanılır', async () => {
    const first = join(dir, '.vscode', 'cmdkit-groups.json');
    const ctx = context();
    await editGroupFile(ctx as never);
    expect(ctx.workspaceState.get('cmdkit.groupFilePath')).toBe(first);

    setConfiguration('cmdkit', {
      groups: ONE_GROUP,
      groupFile: 'packages/api/cmdkit-groups.json',
    });
    await editGroupFile(ctx as never);

    expect(existsSync(join(dir, 'packages', 'api'))).toBe(false);
  });
});
