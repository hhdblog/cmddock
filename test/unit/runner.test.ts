import { beforeEach, describe, expect, it } from 'vitest';
import * as os from 'node:os';
import {
  executedTasks,
  failNextTask,
  inputBoxCalls,
  messages,
  queueInputBox,
  queueMessage,
  resetConfiguration,
  setWorkspaceFolders,
  Task,
} from '../stubs/vscode';
import { runCommand } from '../../src/runner';
import { Command, Group } from '../../src/normalize';

/**
 * `runner` testlerinin merkezî sorusu: **terminalde ne satırı çalışıyor?**
 * Diğer her şey bunun türevi. VSCode'a erişmeden görebilmek için
 * `executeTask`'e giden görevin `execution.commandLine`'ına bakıyoruz.
 */

const GROUP: Group = {
  name: 'Git',
  icon: '$(source-control)',
  commands: [],
};

function command(overrides: Partial<Command> = {}): Command {
  return {
    name: 'status',
    command: 'git status',
    description: '',
    icon: '$(terminal)',
    confirm: false,
    clear: false,
    ...overrides,
  };
}

/** executeTask'e giden son görevin çalıştıracağı satır. */
function lastCommandLine(): string | undefined {
  return executedTasks.at(-1)?.execution.commandLine;
}

function lastTask(): Task | undefined {
  return executedTasks.at(-1);
}

beforeEach(() => {
  resetConfiguration();
});

describe('runCommand — ne çalıştırıyor', () => {
  it('komutu olduğu gibi terminale verir', async () => {
    const ran = await runCommand(GROUP, command());

    expect(ran).toBe(true);
    expect(lastCommandLine()).toBe('git status');
  });

  it('argümansız komutta sondaki boşluğu bırakmaz', async () => {
    await runCommand(GROUP, command({ command: 'git fetch' }));

    expect(lastCommandLine()).toBe('git fetch');
  });

  it('argsPrompt girdisini komuta ekler', async () => {
    queueInputBox('main');

    await runCommand(GROUP, command({ command: 'git checkout', argsPrompt: 'dal adı' }));

    // buildCommandLine her argümanı tek tırnakla çeviriyor — daima, koşulsuz.
    // Zararsız ama gerekli: kullanıcı "a b" yazarsa tek argüman olmalı.
    expect(lastCommandLine()).toBe("git checkout 'main'");
  });

  it('argsSingle girdiyi bölmez — tırnak içinde kalan boşluk korunur', async () => {
    queueInputBox('fix: yaz düzeltmesi');

    await runCommand(
      GROUP,
      command({ command: 'git commit -m', argsPrompt: 'mesaj', argsSingle: true })
    );

    expect(lastCommandLine()).toBe("git commit -m 'fix: yaz düzeltmesi'");
  });

  it('argsSingle olmayan komutta boşluklar argümana ayrılır', async () => {
    queueInputBox('bir iki üç');

    await runCommand(
      GROUP,
      command({ command: 'git checkout', argsPrompt: 'dal adı' })
    );

    expect(lastCommandLine()).toBe("git checkout 'bir' 'iki' 'üç'");
  });

  it('&& içeren komut olduğu gibi kalır', async () => {
    await runCommand(GROUP, command({ command: 'cd a && cd b' }));

    expect(lastCommandLine()).toBe('cd a && cd b');
  });

  it('pipe içeren komut olduğu gibi kalır', async () => {
    await runCommand(GROUP, command({ command: 'psql -l | head' }));

    expect(lastCommandLine()).toBe('psql -l | head');
  });

  it('tırnak işareti içeren argüman kabuk değişmez', async () => {
    queueInputBox("echo 'haha'");

    await runCommand(
      GROUP,
      command({ command: 'sh -c', argsPrompt: 'betik', argsSingle: true })
    );

    // POSIX kaçışı: içteki tek tırnak kapat-aç-kaçır (sh -c "echo 'haha'' değil).
    expect(lastCommandLine()).toBe(`sh -c 'echo '\\''haha'\\'''`);
  });
});

describe('runCommand — kullanıcı onayı', () => {
  it('confirm false ise sormaz', async () => {
    const ran = await runCommand(GROUP, command({ confirm: false }));

    expect(ran).toBe(true);
    expect(messages.filter((m) => m.kind === 'warning')).toHaveLength(0);
  });

  it('confirm metni gösterilir ve komut da yazılır', async () => {
    queueMessage('Çalıştır');

    await runCommand(GROUP, command({ confirm: 'Geri alınamaz!' }));

    const warning = messages.find((m) => m.kind === 'warning');
    expect(warning?.text).toContain('Geri alınamaz!');
    expect(warning?.text).toContain('git status');
  });

  it('onay reddedilirse hiçbir şey çalışmaz', async () => {
    queueMessage(undefined);

    const ran = await runCommand(GROUP, command({ confirm: 'Emin misin?' }));

    expect(ran).toBe(false);
    expect(executedTasks).toHaveLength(0);
  });

  it('onaydan sonra argsPrompt sorulmaz — iptal edildiyse', async () => {
    queueMessage(undefined);

    await runCommand(
      GROUP,
      command({ confirm: 'Emin misin?', argsPrompt: 'metin' })
    );

    expect(inputBoxCalls).toHaveLength(0);
  });

  it('belirteçler onay metninde çözülmüş görünür', async () => {
    queueMessage('Çalıştır');

    await runCommand(GROUP, command({ confirm: 'Silinsin mi?', command: 'go clean {rm}' }));

    const warning = messages.find((m) => m.kind === 'warning');
    expect(warning?.text).toContain('go clean rm -rf');
    expect(warning?.text).not.toContain('{rm}');
  });
});

describe('runCommand — girdi iptali', () => {
  it('argsPrompt Esc ile iptal edilirse çalıştırmaz', async () => {
    queueInputBox(undefined);

    const ran = await runCommand(
      GROUP,
      command({ command: 'git checkout', argsPrompt: 'dal adı' })
    );

    expect(ran).toBe(false);
    expect(executedTasks).toHaveLength(0);
  });

  it('boş girdi argümansız çalıştırma demektir, iptal değil', async () => {
    queueInputBox('');

    const ran = await runCommand(
      GROUP,
      command({ command: 'git checkout', argsPrompt: 'dal adı' })
    );

    expect(ran).toBe(true);
    expect(lastCommandLine()).toBe('git checkout');
  });

  it('argsSingle boş girdi de iptal değil', async () => {
    queueInputBox('   ');

    const ran = await runCommand(
      GROUP,
      command({ command: 'git commit -m', argsPrompt: 'mesaj', argsSingle: true })
    );

    expect(ran).toBe(true);
    expect(lastCommandLine()).toBe('git commit -m');
  });

  it('argsPrompt yoksa hiç sorulmaz', async () => {
    await runCommand(GROUP, command());

    expect(inputBoxCalls).toHaveLength(0);
  });

  it('kullanıcıya ne sorulduğu komutla birlikte gösterilir', async () => {
    queueInputBox('x');

    await runCommand(
      GROUP,
      command({ command: 'kubectl logs', argsPrompt: 'pod adı' })
    );

    expect(inputBoxCalls[0]?.options?.prompt).toBe('pod adı');
    expect(inputBoxCalls[0]?.options?.placeHolder).toContain('kubectl logs');
  });
});

describe('runCommand — görev kurulumu', () => {
  it('açık klasör varsa orada çalışır', async () => {
    setWorkspaceFolders('/Users/hhd/proje');

    await runCommand(GROUP, command());

    expect(lastTask()?.execution.options?.cwd).toBe('/Users/hhd/proje');
  });

  it('klasör yoksa ana dizinde çalışır — görev hiç başlamasın diye', async () => {
    await runCommand(GROUP, command());

    expect(lastTask()?.execution.options?.cwd).toBe(os.homedir());
  });

  it('birden çok klasörde ilki kullanılır', async () => {
    setWorkspaceFolders('/bir', '/iki');

    await runCommand(GROUP, command());

    expect(lastTask()?.execution.options?.cwd).toBe('/bir');
  });

  it('ad "grup: komut" biçimindedir', async () => {
    await runCommand(GROUP, command({ name: 'durum' }));

    expect(lastTask()?.name).toBe('Git: durum');
  });

  it('terminal her seferinde açılır', async () => {
    await runCommand(GROUP, command());

    expect(lastTask()?.presentationOptions?.reveal).toBe(1);
  });

  it('odak terminale kaymaz — fare başka yerdeyken çalışmayı bozmaz', async () => {
    await runCommand(GROUP, command());

    expect(lastTask()?.presentationOptions?.focus).toBe(false);
  });

  it('clear false ise terminal temizlenmez', async () => {
    await runCommand(GROUP, command({ clear: false }));

    expect(lastTask()?.presentationOptions?.clear).toBe(false);
  });

  it('clear true ise terminal temizlenerek açılır', async () => {
    await runCommand(GROUP, command({ clear: true }));

    expect(lastTask()?.presentationOptions?.clear).toBe(true);
  });
});

describe('runCommand — hata yolu', () => {
  it('görev başlatılamazsa hata mesajı gösterilir', async () => {
    failNextTask('terminal yok');

    const ran = await runCommand(GROUP, command({ name: 'derle' }));

    expect(ran).toBe(false);
    expect(executedTasks).toHaveLength(0);

    const error = messages.find((m) => m.kind === 'error');
    expect(error?.text).toContain('derle');
    expect(error?.text).toContain('terminal yok');
  });

  it('hata mesajında cmddock adı geçer', async () => {
    failNextTask('patlama');

    await runCommand(GROUP, command({ name: 'test' }));

    expect(messages.find((m) => m.kind === 'error')?.text).toContain('cmddock:');
  });

  it('hata sonrası bir sonraki çalıştırma yine denenir', async () => {
    failNextTask('bir kez');

    await runCommand(GROUP, command());
    const ran = await runCommand(GROUP, command());

    expect(ran).toBe(true);
    expect(executedTasks).toHaveLength(1);
  });
});