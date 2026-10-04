'use client';
import * as Dialog from '@radix-ui/react-dialog';
export default function HappeningNow() {
  return (
    <Dialog.Root>
      <Dialog.Trigger className="happening-trigger">
        Happening now
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="happening-drawer">
          <Dialog.Title>Happening now</Dialog.Title>
          <Dialog.Description>
            Events are not available yet. Explore the catalog or choose a date
            to travel through time.
          </Dialog.Description>
          <Dialog.Close className="secondary-button">
            Close happening now
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
