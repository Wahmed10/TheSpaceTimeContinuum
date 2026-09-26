export interface LabelCandidate {
  x: number;
  y: number;
  width: number;
  visible: boolean;
  selected: boolean;
  hovered?: boolean;
  show: boolean;
  importance: number;
}

/** Inputs are pre-sorted by importance; selection gets first choice.
 * Reserve all touched 96x32 cells, including crossing cell boundaries.
 */
export class LabelLayout {
  private cells = new Set<number>();
  place(labels: readonly LabelCandidate[], limit = 64) {
    this.cells.clear();
    for (const label of labels) label.show = false;
    let count = 0;
    for (let pass = 0; pass < 3; pass++) {
      for (const label of labels) {
        const priority = label.selected ? 0 : label.hovered ? 1 : 2;
        if (!label.visible || priority !== pass || count >= limit) continue;
        if (!Number.isFinite(label.x) || !Number.isFinite(label.y)) continue;
        const left = Math.floor((label.x + 12) / 96);
        const right = Math.floor((label.x + 12 + label.width) / 96);
        const top = Math.floor((label.y - 8) / 32);
        const bottom = Math.floor((label.y + 8) / 32);
        let occupied = false;
        for (let y = top; y <= bottom; y++) {
          for (let x = left; x <= right; x++)
            occupied ||= this.cells.has(y * 65536 + x);
        }
        if (occupied) continue;
        label.show = true;
        count++;
        for (let y = top; y <= bottom; y++) {
          for (let x = left; x <= right; x++) this.cells.add(y * 65536 + x);
        }
      }
    }
    return count;
  }
}
