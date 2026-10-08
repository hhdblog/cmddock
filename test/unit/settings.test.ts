import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  ConfigurationTarget,
  MemoryMemento,
  messages,
  openedDocuments,
  queueMessage,
  queueOpenDialog,
  queueQuickPick,
  resetConfiguration,
  setConfiguration,
  setWorkspaceFolders,
  Uri,
  writes,
} from '../stubs/vscode';
import { applyGroupFile, editGroupFile, reloadGroupFile } from '../../src/settings';

/** Gerçek dosya sistemi kullanır; geçici klasör test sonunda silinir. */
let dir: string;

function context() {
  return {
    subscriptions: [],
    workspaceState: new MemoryMemento(),
    globalState: new MemoryMemento(),
  };
}

function groupFile(...extra: unknown[]): string {
  return join(dir, 'cmd-deck-groups.json');
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
  dir = mkdtempSync(join(tmpdir(), 'cmd-deck-test-'));
  setWorkspaceFolders(dir);
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('editGroupFile', () => {
  beforeEach(() => {
    setConfiguration('cmdDeck', { groups: ONE_GROUP });
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
    writeFileSync(groupFile(), 'KULLANICI ELLE YAZDI', 'utf8');

    await editGroupFile(context() as never);

    expect(read()).toBe('KULLANICI ELLE YAZDI');
  });

  it('dosya yolunu hatırlar', async () => {
    const ctx = context();

    await editGroupFile(ctx as never);

    expect(ctx.workspaceState.get('cmdDeck.groupFilePath')).toBe(groupFile());
  });

  it('dosya silinmişse yeniden oluşturur', async () => {
    const ctx = context();
    await editGroupFile(ctx as never);
    rmSync(groupFile());

    await editGroupFile(ctx as never);

    expect(read()).toContain('git status');
  });

  it('ayarlarda komut yoksa uyarır ve dosya yazmaz', async () => {
    setConfiguration('cmdDeck', { groups: [] });

    await editGroupFile(context() as never);

    expect(messages.at(-1)?.kind).toBe('warning');
    expect(() => read()).toThrow();
  });
});

describe('reloadGroupFile', () => {
  beforeEach(() => {
    setConfiguration('cmdDeck', { groups: ONE_GROUP });
  });

  it('dosya yoksa önce düzenlemeyi ister', async () => {
    await reloadGroupFile(context() as never);

    expect(messages.at(-1)?.text).toContain('Komut Listesini Düzenle');
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
    setConfiguration('cmdDeck', { groups: ONE_GROUP });
  });

  function withFile(contents: string) {
    writeFileSync(groupFile(), contents, 'utf8');
    const ctx = context();
    // Yol hatırlanmış olmalı, yoksa applyGroupFile dosya seçtirmek ister.
    void ctx.workspaceState.update('cmdDeck.groupFilePath', groupFile());
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
    expect(ctx.workspaceState.get('cmdDeck.groupFilePath')).toBe(groupFile());
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
    expect(messages.at(-1)?.text).toContain('hiçbir şey yazılmadı');
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