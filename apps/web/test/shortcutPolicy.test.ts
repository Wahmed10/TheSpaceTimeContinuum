import { expect, it } from 'vitest';
import {
  allowPageShortcut,
  type ShortcutContext,
} from '../src/lib/shortcutPolicy';
const plain: ShortcutContext = {
  key: ' ',
  defaultPrevented: false,
  isComposing: false,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  targetOwnsKeyboard: false,
  panelOpen: false,
};
it.each([
  'defaultPrevented',
  'isComposing',
  'ctrlKey',
  'metaKey',
  'altKey',
  'shiftKey',
  'targetOwnsKeyboard',
  'panelOpen',
] as const)('yields when %s owns the event', (flag) => {
  for (const key of [' ', 'Backspace', '/', 'o', 'f', 'l', '[', ']'])
    expect(allowPageShortcut({ ...plain, key, [flag]: true })).toBe(false);
});
it('allows canvas/page shortcuts and shifted question mark, but never IME 229 or modified help', () => {
  for (const key of [' ', 'Backspace', '/', 'o', 'f', 'l', '[', ']'])
    expect(allowPageShortcut({ ...plain, key })).toBe(true);
  expect(allowPageShortcut({ ...plain, key: '?', shiftKey: true })).toBe(true);
  expect(
    allowPageShortcut({ ...plain, key: '?', shiftKey: true, ctrlKey: true }),
  ).toBe(false);
  expect(allowPageShortcut({ ...plain, keyCode: 229 })).toBe(false);
});
