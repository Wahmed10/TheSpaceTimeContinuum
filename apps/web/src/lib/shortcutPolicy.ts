export interface ShortcutContext {
  key: string;
  defaultPrevented: boolean;
  isComposing: boolean;
  keyCode?: number;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  targetOwnsKeyboard: boolean;
  panelOpen: boolean;
}

/** Page shortcuts yield to controls, panels, composition and browser commands.
 * Shift is allowed only for the literal ? help shortcut. Camera keys stay local.
 */
export function allowPageShortcut(context: ShortcutContext): boolean {
  return (
    !context.defaultPrevented &&
    !context.isComposing &&
    context.keyCode !== 229 &&
    !context.ctrlKey &&
    !context.metaKey &&
    !context.altKey &&
    (!context.shiftKey || context.key === '?') &&
    !context.targetOwnsKeyboard &&
    !context.panelOpen
  );
}

export function pageOwnsShortcut(event: KeyboardEvent): boolean {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return false;
  return allowPageShortcut({
    key: event.key,
    defaultPrevented: event.defaultPrevented,
    isComposing: event.isComposing,
    keyCode: event.keyCode,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
    altKey: event.altKey,
    shiftKey: event.shiftKey,
    targetOwnsKeyboard:
      target.isContentEditable ||
      !!target.closest(
        'input,select,textarea,button,a,summary,[role="button"],[role="checkbox"],[role="combobox"],[role="slider"],[role="listbox"],.object-card',
      ),
    panelOpen: !!document.querySelector(
      '[role="dialog"],[role="alertdialog"],[role="menu"]',
    ),
  });
}
