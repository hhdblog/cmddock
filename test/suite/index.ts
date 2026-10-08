import * as fs from 'node:fs';
import * as path from 'node:path';
import Mocha from 'mocha';

export function run(): Promise<void> {
  const mocha = new Mocha({ ui: 'tdd', color: true, timeout: 20000 });
  const suiteRoot = __dirname;

  fs.readdirSync(suiteRoot)
    .filter((file) => file.endsWith('.test.js'))
    .forEach((file) => mocha.addFile(path.resolve(suiteRoot, file)));

  return new Promise((resolve, reject) => {
    mocha.run((failures) => {
      if (failures > 0) {
        reject(new Error(`${failures} test başarısız`));
      } else {
        resolve();
      }
    });
  });
}
