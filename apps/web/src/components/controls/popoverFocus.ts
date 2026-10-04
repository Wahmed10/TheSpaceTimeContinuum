/** A closing popover must not steal focus from a surface already opened. */
export function preserveActiveFocus(event: Event) {
  const active = document.activeElement;
  if (
    active instanceof HTMLElement &&
    active !== document.body &&
    active.isConnected &&
    !(event.target instanceof HTMLElement && event.target.contains(active))
  )
    event.preventDefault();
}
