import { LabelLayout } from './LabelLayout';
import type { LabelCandidate } from './LabelLayout';

interface Label extends LabelCandidate {
  id: string;
  name: string;
  color: string;
  slot: number;
}
interface Slot {
  element: HTMLDivElement;
  label: Label | null;
  hiddenAt: number;
}

export class LabelSystem {
  private labels = new Map<string, Label>();
  private ordered: Label[] = [];
  private layout = new LabelLayout();
  private pool: Slot[] = [];
  constructor(private host: HTMLElement) {
    for (let i = 0; i < 64; i++) {
      const element = document.createElement('div');
      element.className = 'space-label';
      element.setAttribute('aria-hidden', 'true');
      element.hidden = true;
      element.dataset.visible = 'false';
      this.host.appendChild(element);
      this.pool.push({ element, label: null, hiddenAt: 0 });
    }
  }
  add(id: string, name: string, color: string, importance = 0) {
    if (this.labels.has(id)) throw new Error(`Duplicate label ${id}`);
    // Measure once during registration, never in the frame loop.
    const probe = document.createElement('div');
    probe.className = 'space-label';
    probe.textContent = name;
    probe.style.visibility = 'hidden';
    this.host.appendChild(probe);
    const width = Math.max(16, probe.getBoundingClientRect().width);
    probe.remove();
    const label: Label = {
      id,
      name,
      color,
      importance,
      width,
      x: 0,
      y: 0,
      visible: false,
      selected: false,
      show: false,
      slot: -1,
    };
    this.labels.set(id, label);
    this.ordered.push(label);
    this.ordered.sort(
      (a, b) => b.importance - a.importance || a.id.localeCompare(b.id),
    );
  }
  begin() {
    for (const label of this.ordered) label.visible = false;
  }
  remove(id: string) {
    const label = this.labels.get(id);
    if (!label) return;
    if (label.slot >= 0) this.release(this.pool[label.slot]!);
    this.labels.delete(id);
    this.ordered.splice(this.ordered.indexOf(label), 1);
  }
  update(
    id: string,
    x: number,
    y: number,
    visible: boolean,
    selected: boolean,
    hovered = false,
  ) {
    const label = this.labels.get(id);
    if (!label) return;
    label.x = x;
    label.y = y;
    label.visible = visible;
    label.selected = selected;
    label.hovered = hovered;
  }
  end(now: number) {
    this.layout.place(this.ordered);
    for (const slot of this.pool) {
      if (!slot.label || slot.label.show) continue;
      if (!slot.hiddenAt) slot.hiddenAt = now;
      slot.element.dataset.visible = 'false';
      if (now - slot.hiddenAt >= 150) this.release(slot);
    }
    for (const label of this.ordered) {
      if (!label.show) continue;
      if (label.slot < 0) {
        let index = -1;
        for (let i = 0; i < this.pool.length; i++)
          if (!this.pool[i]!.label) {
            index = i;
            break;
          }
        // Visible candidates take precedence over an old label's fade.
        if (index < 0)
          for (let i = 0; i < this.pool.length; i++)
            if (!this.pool[i]!.label!.show) {
              index = i;
              break;
            }
        if (index < 0) continue;
        const slot = this.pool[index]!;
        this.release(slot);
        label.slot = index;
        slot.label = label;
        slot.element.textContent = label.name;
        slot.element.style.setProperty('--label-color', label.color);
        slot.element.hidden = false;
      }
      const slot = this.pool[label.slot]!;
      slot.hiddenAt = 0;
      slot.element.dataset.visible = 'true';
      slot.element.style.transform = `translate3d(${label.x + 12}px,${label.y - 8}px,0)`;
      slot.element.classList.toggle('selected', label.selected);
    }
  }
  private release(slot: Slot) {
    if (slot.label) slot.label.slot = -1;
    slot.label = null;
    slot.hiddenAt = 0;
    slot.element.hidden = true;
    slot.element.dataset.visible = 'false';
  }
  dispose() {
    for (const slot of this.pool) slot.element.remove();
    this.labels.clear();
    this.ordered.length = this.pool.length = 0;
  }
}
