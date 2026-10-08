import { beforeEach, describe, expect, it } from 'vitest';
import { resetConfiguration, setConfiguration } from '../stubs/vscode';
import { getGroups, readRawGroups } from '../../src/config';

const HAND_WRITTEN = [
  {
    name: 'Git',
    commands: [
      { name: 'durum', command: 'git status' },
      { name: 'temizle', command: 'rm -rf dist' },
      { name: 'bozuk', command: '' },
    ],
  },
];

describe('config', () => {
  beforeEach(() => {
    resetConfiguration();
  });

  describe('readRawGroups', () => {
    it('ayarı normalize etmeden olduğu gibi döndürür', () => {
      setConfiguration('cmdDeck', { groups: HAND_WRITTEN });

      expect(readRawGroups()).toEqual(HAND_WRITTEN);
    });

    it('komut eksik alanlarını doldurmaz', () => {
      setConfiguration('cmdDeck', { groups: [{ name: 'Git', commands: [{ name: 'a', command: 'b' }] }] });

      const raw = readRawGroups() as { commands: Record<string, unknown>[] }[];
      expect(Object.keys(raw[0].commands[0]).sort()).toEqual(['command', 'name']);
    });

    it('ayar yoksa undefined döner', () => {
      expect(readRawGroups()).toBeUndefined();
    });
  });

  describe('getGroups', () => {
    it('eksik alanları doldurur', () => {
      setConfiguration('cmdDeck', {
        groups: [{ name: 'Git', commands: [{ name: 'durum', command: 'git status' }] }],
      });

      expect(getGroups()[0].commands[0]).toEqual({
        name: 'durum',
        command: 'git status',
        description: '',
        icon: '$(terminal)',
        confirm: false,
        argsPrompt: undefined,
        clear: false,
      });
    });

    it('command boş olan komutu düşürür', () => {
      setConfiguration('cmdDeck', { groups: HAND_WRITTEN });

      expect(getGroups()[0].commands.map((c) => c.name)).toEqual(['durum', 'temizle']);
    });

    it('ayar bir dizi değilse boş liste döner', () => {
      setConfiguration('cmdDeck', { groups: 'metin' });

      expect(getGroups()).toEqual([]);
    });
  });
});