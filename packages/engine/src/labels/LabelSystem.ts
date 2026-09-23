export class LabelSystem {
  private labels = new Map<string, HTMLDivElement>();
  private cells = new Set<string>();
  constructor(private host: HTMLElement) {}
  add(id: string, name: string, color: string) {
    const el = document.createElement('div');
    el.className = 'space-label';
    el.textContent = name;
    el.style.setProperty('--label-color', color);
    el.setAttribute('aria-hidden', 'true');
    this.host.appendChild(el);
    this.labels.set(id, el);
  }
  begin() {
    this.cells.clear();
  }
  update(
    id: string,
    x: number,
    y: number,
    visible: boolean,
    selected: boolean,
  ) {
    const el = this.labels.get(id);
    if (!el) return;
    const cell = `${Math.floor(x / 96)}:${Math.floor(y / 32)}`;
    const show = visible && (selected || !this.cells.has(cell));
    el.hidden = !show;
    if (show) {
      this.cells.add(cell);
      el.style.transform = `translate3d(${x + 12}px,${y - 8}px,0)`;
      el.classList.toggle('selected', selected);
    }
  }
  dispose() {
    for (const el of this.labels.values()) el.remove();
    this.labels.clear();
  }
}
