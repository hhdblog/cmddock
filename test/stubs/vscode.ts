/**
 * Birim testlerinin `vscode` modülünü çalışma anında yüklemesini engeller.
 * Test edilen saf modüller (normalize, args, tokens, usage) vscode'u yalnızca
 * tip olarak kullanıyor; bu takma yalnızca güvenlik ağı.
 */
export class Memento {
  get<T>(_key: string, defaultValue?: T): T | undefined {
    return defaultValue;
  }

  update(_key: string, _value: unknown): Thenable<void> {
    return Promise.resolve();
  }

  keys(): readonly string[] {
    return [];
  }
}

export const workspace = {};
export const window = {};
export const tasks = {};
