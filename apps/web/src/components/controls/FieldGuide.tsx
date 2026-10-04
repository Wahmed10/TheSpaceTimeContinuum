'use client';
import type { RefObject } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
export default function FieldGuide({
  open,
  onOpenChange,
  returnFocus,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  returnFocus: RefObject<HTMLElement | null>;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          className="help-dialog"
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            returnFocus.current?.focus();
          }}
        >
          <Dialog.Title>Your field guide</Dialog.Title>
          <Dialog.Description>
            A few simple ways to travel through the 21-world catalog.
          </Dialog.Description>
          {[
            ['Drag / arrow keys', 'Orbit your destination'],
            ['Scroll / + − / pinch', 'Move closer or farther away'],
            ['Shift + drag', 'Pan the view'],
            ['F', 'Focus the selected world'],
            ['Space', 'Play or pause time'],
            ['L', 'Return to live time'],
            ['[ / ]', 'Change playback speed'],
            ['Backspace', 'Return to your previous view'],
            ['/', 'Find a world'],
            ['O', 'Open Objects in view'],
            ['?', 'Open this field guide'],
            ['Escape', 'Dismiss the active panel or card'],
          ].map(([key, description]) => (
            <div className="setting-row" key={key}>
              <kbd>{key}</kbd>
              <span>{description}</span>
            </div>
          ))}
          <p>
            Camera keys work when the map has focus. Page shortcuts leave
            buttons, inputs and open panels in control of their own keys.
            Objects in view is a selectable text alternative to the map and
            remains open while you move the camera. Find a world searches the
            complete catalog, including worlds outside the current view.
          </p>
          <p>
            Explore scale enlarges distant worlds for visibility. True scale
            preserves their physical radii. Card measurements always use
            physical coordinates. Satellite, asteroid, spacecraft and event data
            are not available yet.
          </p>
          <Dialog.Close className="primary-button">
            Ready to explore
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
