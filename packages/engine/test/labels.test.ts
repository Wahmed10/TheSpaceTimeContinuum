import { expect, it } from 'vitest';
import { LabelLayout, type LabelCandidate } from '../src/labels/LabelLayout';
function label(x: number, y: number, selected = false): LabelCandidate {
  return {
    x,
    y,
    width: 100,
    selected,
    visible: true,
    show: false,
    importance: 1,
  };
}
it('reserves adjacent cells and gives selection priority over insertion order', () => {
  const labels = [label(50, 50), label(140, 50, true), label(800, 50)];
  const layout = new LabelLayout();
  expect(layout.place(labels)).toBe(2);
  expect(labels.map((l) => l.show)).toEqual([false, true, true]);
  labels[1]!.visible = false;
  expect(layout.place(labels)).toBe(2);
  expect(labels.map((l) => l.show)).toEqual([true, false, true]);
});
it('caps a dense catalog at 64 visible labels, preserving selected items', () => {
  const labels = Array.from({ length: 10000 }, (_, i) =>
    label((i % 100) * 200, Math.floor(i / 100) * 64),
  );
  labels[9999]!.selected = true;
  expect(new LabelLayout().place(labels)).toBe(64);
  expect(labels[9999]!.show).toBe(true);
  expect(labels.filter((l) => l.show)).toHaveLength(64);
});
it('prioritizes hovered labels below selection and above catalog importance', () => {
  const labels = [label(50, 50), label(50, 50), label(50, 50, true)];
  labels[1]!.hovered = true;
  const layout = new LabelLayout();
  layout.place(labels);
  expect(labels.map((l) => l.show)).toEqual([false, false, true]);
  labels[2]!.visible = false;
  layout.place(labels);
  expect(labels.map((l) => l.show)).toEqual([false, true, false]);
});
