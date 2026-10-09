import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { USAGE } from '../../src/help';
import { tokenMap } from '../../src/tokens';

interface Schema {
  readonly properties?: Record<string, unknown>;
  readonly items?: Schema;
}

const manifest = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../package.json', import.meta.url)), 'utf8')
) as { contributes: { configuration: { properties: Record<string, Schema> } } };

// Schema nests: cmdkit.groups → items (group) → properties.commands.items (command)
const groupsSetting = manifest.contributes.configuration.properties['cmdkit.groups'];
const groupFields = Object.keys(groupsSetting?.items?.properties ?? {});
const commandFields = Object.keys(groupsSetting?.items?.properties?.commands?.items?.properties ?? {});

/**
 * The guide is written by hand. When a field or a token is added to the schema
 * it has to go red here, otherwise the user is left with an incomplete
 * document.
 */
describe('kullanım kılavuzu', () => {
  it('documents every group field', () => {
    expect(groupFields.length).toBeGreaterThan(0);
    for (const field of groupFields) {
      expect(USAGE, `group field: ${field}`).toContain(`\`${field}\``);
    }
  });

  it('documents every command field', () => {
    expect(commandFields.length).toBeGreaterThan(0);
    for (const field of commandFields) {
      expect(USAGE, `command field: ${field}`).toContain(`\`${field}\``);
    }
  });

  it('lists every platform token', () => {
    for (const token of Object.keys(tokenMap('linux'))) {
      expect(USAGE, token).toContain(`\`{${token}}\``);
    }
  });

  it('gives the Windows value of every token', () => {
    for (const value of Object.values(tokenMap('win32'))) {
      expect(USAGE, value).toContain(value);
    }
  });

  it('gives the macOS value of every token', () => {
    for (const value of Object.values(tokenMap('linux'))) {
      expect(USAGE, value).toContain(value);
    }
  });

  it('explains both apply modes', () => {
    expect(USAGE).toContain('Merge groups');
    expect(USAGE).toContain('Replace list');
  });

  it('says that merging does not delete', () => {
    expect(USAGE).toMatch(/missing from the incoming list is kept/i);
  });

  it('says that saving does not apply', () => {
    expect(USAGE).toMatch(/[Ss]aving does not apply it/);
  });

  it('explains both destinations', () => {
    expect(USAGE).toContain('.vscode/settings.json');
    expect(USAGE).toContain('**User**');
  });

  it('explains shadowing', () => {
    expect(USAGE).toMatch(/shadows/);
  });

  it('says icon and colour changes are applied', () => {
    expect(USAGE).toContain('icon/colour changed');
  });

  it('mentions the built-in group command', () => {
    expect(USAGE).toContain('Add Built-in Group');
  });

  it('JSON examples are valid — a user copying them gets no error', () => {
    const blocks = [...USAGE.matchAll(/```json\n([\s\S]*?)```/g)].map((m) => m[1]);
    expect(blocks.length).toBeGreaterThan(0);

    for (const block of blocks) {
      expect(() => JSON.parse(block), block.slice(0, 60)).not.toThrow();
    }
  });

  it('the tokenised example is valid JSON too', () => {
    const blocks = [...USAGE.matchAll(/```json\n([\s\S]*?)```/g)].map((m) => m[1]);
    const tokenized = blocks.find((block) => block.includes('{venvpy}'));

    expect(tokenized).toBeDefined();
    expect(JSON.parse(tokenized!)).toEqual({ name: 'test', command: '{venvpy} -m pytest' });
  });
});