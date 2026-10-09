import * as os from 'node:os';
import * as vscode from 'vscode';
import { buildCommandLine, splitArgs } from './args';
import { Command, Group } from './normalize';
import { expandTokens } from './tokens';

const TASK_SOURCE = 'cmdkit';
const RUN_LABEL = 'Çalıştır';

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function confirmRun(command: Command): Promise<boolean> {
  if (command.confirm === false) {
    return true;
  }

  const answer = await vscode.window.showWarningMessage(
    `${command.confirm}\n\nÇalıştırılacak: ${expandTokens(command.command)}`,
    { modal: true },
    RUN_LABEL
  );

  return answer === RUN_LABEL;
}

/** undefined = kullanıcı iptal etti, [] = argümansız çalıştır. */
async function promptArgs(command: Command): Promise<string[] | undefined> {
  if (!command.argsPrompt) {
    return [];
  }

  const answer = await vscode.window.showInputBox({
    prompt: command.argsPrompt,
    placeHolder: `Başlatılacak: ${expandTokens(command.command)}`,
    ignoreFocusOut: true,
  });

  if (answer === undefined) {
    return undefined;
  }

  // argsSingle: girdinin tamamı tek argüman. `git commit -m` gibi bir bayrak
  // serbest metin bekliyorsa bölmek yanlış: "fix: yaz düzeltmesi" üç parçaya
  // ayrılır, mesaj "fix:" olur, gerisi pathspec olur. VSCode dizi elemanını
  // kendisi tırnaklıyor, tırnak eklememize gerek yok.
  if (command.argsSingle) {
    const trimmed = answer.trim();
    return trimmed.length > 0 ? [trimmed] : [];
  }

  return splitArgs(answer);
}

export async function runCommand(
  group: Group,
  command: Command
): Promise<boolean> {
  if (!(await confirmRun(command))) {
    return false;
  }

  const args = await promptArgs(command);
  if (args === undefined) {
    return false;
  }

  // Klasör açık değilken cwd'yi boş bırakmak VSCode'in '${workspaceFolder}'
  // değişkenini çözmeye çalışmasına ve görevin hiç başlamamasına yol açıyor.
  // Terminal ne yapıyorsa onu yapıyoruz: klasör yoksa ana dizin.
  const cwd =
    vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? os.homedir();

  // {venv} / {venvpy} / {rm} belirteçleri platforma göre çözülür.
  const commandLine = expandTokens(command.command);

  // Argümanlar dizi olarak geçer, string birleştirme yok → shell injection yok.
  // && / | içeren komutlar da sorunsuz çalışır, çünkü ShellExecution shell'e gider.
  // shellQuoting verilmiyor: VSCode'in varsayılanı boşlukları doğru escape eder.
  // (ShellQuoting enumı ShellQuotedString içindir, ShellExecutionOptions.shellQuoting
  //  farklı bir tip — karıştırmamak için varsayılan bırakıldı.)
  const options: vscode.ShellExecutionOptions = { cwd };

  // Tek dize overload'ı: VSCode 1.141'de ShellExecution(command, args) komutun
  // kendisini tırnaklıyor ("'git checkout' main" → command not found). Tırnaklamayı
  // kendimiz yapıyoruz, kabuğa olduğu gibi geçiyoruz.
  const execution = new vscode.ShellExecution(
    buildCommandLine(commandLine, args),
    options
  );

  // TaskDefinition sabit tutuluyor: tüm komutlar tek terminali paylaşır (panel: Shared).
  const task = new vscode.Task(
    { type: TASK_SOURCE },
    vscode.TaskScope.Workspace,
    `${group.name}: ${command.name}`,
    TASK_SOURCE,
    execution
  );

  task.presentationOptions = {
    reveal: vscode.TaskRevealKind.Always,
    focus: false,
    panel: vscode.TaskPanelKind.Shared,
    clear: command.clear,
  };

  try {
    await vscode.tasks.executeTask(task);
    return true;
  } catch (error) {
    void vscode.window.showErrorMessage(
      `cmdkit: "${command.name}" başlatılamadı — ${errorText(error)}`
    );
    return false;
  }
}
