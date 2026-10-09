import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
// esbuild bu import'u test paketine gömer, 'vscode' dışarıda kalır.
import { getGroups } from '../../src/config';
import { runCommand } from '../../src/runner';
import { Command, Group } from '../../src/normalize';

const EXTENSION_ID = 'cmdkit.cmdkit';

interface ManifestCommand {
  command: string;
}
interface Manifest {
  activationEvents?: string[];
  contributes: {
    commands: ManifestCommand[];
  };
}

function readManifest(): Manifest {
  const root = path.resolve(__dirname, '..', '..', '..');
  return JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
}

async function waitFor(condition: () => boolean, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (condition()) return true;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return condition();
}

suite('cmdkit entegrasyon', () => {
  test('manifest açılışta etkinleşmeyi istiyor', () => {
    // Bu olmadan activate() hiç çağrılmaz ve durum çubuğu öğesi hiç oluşmaz.
    const events = readManifest().activationEvents ?? [];
    assert.ok(
      events.includes('onStartupFinished'),
      'activationEvents içinde onStartupFinished yok, durum çubuğu görünmez'
    );
  });

  test('uzantı açılışta kendiliğinden etkinleşiyor', async () => {
    const extension = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(extension, 'uzantı bulunamadı');

    const active = await waitFor(() => extension.isActive, 15000);
    assert.strictEqual(active, true, 'uzantı açılışta etkinleşmedi');
  });

  test('manifestteki tüm komutlar kayıtlı', async () => {
    const registered = await vscode.commands.getCommands(true);
    const declared = readManifest().contributes.commands.map((entry) => entry.command);

    const missing = declared.filter((id) => !registered.includes(id));
    assert.deepStrictEqual(missing, [], `kayıtlı olmayan komutlar: ${missing.join(', ')}`);
  });

  test('varsayılan gruplar okunuyor', async () => {
    const groups = getGroups();

    assert.ok(groups.length >= 3, `en az 3 grup beklenir, ${groups.length} bulundu`);

    const python = groups.find((group) => group.name === 'Python');
    assert.ok(python, 'Python grubu yok');
    assert.ok(
      python.commands.some((command) => command.command.includes('{venvpy}')),
      'Python grubunda {venvpy} belirteci yok'
    );

    const komutlar = groups.reduce((toplam, group) => toplam + group.commands.length, 0);
    assert.ok(komutlar >= 36, `en az 36 komut beklenir, ${komutlar} bulundu`);
  });

  test('durum çubuğu komutu çalıştırılabilir ve çökmez', async () => {
    // pickCommand kullanıcı girdisi bekler; burada yalnızca komutun
    // kayıtlı olduğunu ve hata vermediğini doğruluyoruz.
    await vscode.commands.executeCommand('cmdkit.runLast');
    await vscode.commands.executeCommand('cmdkit.checkPlatform');
  });

  test('komut gerçekten terminal görevi olarak başlatılıyor', async () => {
    const group = getGroups()[0] as Group;
    const probe: Command = {
      name: 'test-echo',
      command: 'echo cmd-decalji-ok',
      description: '',
      icon: '$(terminal)',
      confirm: false,
      clear: false,
    };

    const started = new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('görev başlamadı')), 15000);
      const subscription = vscode.tasks.onDidStartTask((event) => {
        clearTimeout(timeout);
        subscription.dispose();
        resolve(event.execution.task.name);
      });
    });

    const ok = await runCommand(group, probe);
    assert.strictEqual(ok, true, 'runCommand görevi başlatamadı');

    const taskName = await started;
    assert.ok(
      taskName.includes('test-echo'),
      `görev adı beklenenden farklı: ${taskName}`
    );
  });

  test('onay reddedilince komut çalıştırılmıyor', async () => {
    const group = getGroups()[0] as Group;
    const destructive: Command = {
      name: 'test-iptal',
      command: 'echo asla-calismamali',
      description: '',
      icon: '$(terminal)',
      confirm: 'Bu onay otomatik reddedilecek.',
      clear: false,
    };

    let started = false;
    const subscription = vscode.tasks.onDidStartTask(() => {
      started = true;
    });

    // showWarningModal yanıtı verilemez → executeCommand reddedilir.
    await assert.rejects(() => runCommand(group, destructive));
    await new Promise((resolve) => setTimeout(resolve, 300));

    subscription.dispose();
    assert.strictEqual(started, false, 'onaylanmayan komut çalıştı');
  });
});
