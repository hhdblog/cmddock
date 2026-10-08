import * as path from 'node:path';
import { runTests } from '@vscode/test-electron';

async function main(): Promise<void> {
  try {
    // VSCODE_TEST_EXECUTABLE verilirse indirme yapmadan o sürüm kullanılır.
    const userDefinedExecutable = process.env.VSCODE_TEST_EXECUTABLE;

    const folder = await runTests({
      extensionDevelopmentPath: path.resolve(__dirname, '..', '..'),
      extensionTestsPath: path.resolve(__dirname, 'suite', 'index'),
      ...(userDefinedExecutable ? { vscodeExecutablePath: userDefinedExecutable } : {}),
    });

    process.exit(0);
  } catch (error) {
    console.error('Entegrasyon testi başarısız:', error);
    process.exit(1);
  }
}

void main();
