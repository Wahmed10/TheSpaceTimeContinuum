'use client';
import type { RefObject } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useObjectsInView } from '../../engine-bridge/useObjectsInView';
import { useEngineStore } from '../../engine-bridge/useEngineStore';

export default function ObjectsInView({
  onChoose,
  onClose,
  returnFocus,
}: {
  onChoose(id: string): void;
  onClose(): void;
  returnFocus: RefObject<HTMLElement | null>;
}) {
  const objects = useObjectsInView();
  const ready = useEngineStore((state) => state.ready);
  return (
    <Dialog.Root
      open
      modal={false}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Content
          className="objects-in-view"
          aria-modal={false}
          onInteractOutside={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (returnFocus.current?.isConnected) returnFocus.current.focus();
          }}
        >
          <div className="objects-heading">
            <Dialog.Title>Objects in view</Dialog.Title>
            <Dialog.Close className="secondary-button">Close list</Dialog.Close>
          </div>
          <Dialog.Description>
            Objects with centers in the view; some may be behind another body.
            Move the map to explore more. All catalog worlds are also in search.
          </Dialog.Description>
          <p role="status">
            {ready
              ? `${objects.length} ${objects.length === 1 ? 'world' : 'worlds'} in view`
              : 'Waiting for the map.'}
          </p>
          <ul aria-label="Objects with centers in view">
            {objects.map((object) => (
              <li key={object.id}>
                <button
                  className="object-list-choice"
                  data-entity-id={object.id}
                  onClick={() => {
                    onChoose(object.id);
                    onClose();
                  }}
                >
                  <span>{object.name}</span>
                  <small>
                    {object.kind === 'dwarf' ? 'Dwarf planet' : object.kind}
                  </small>
                </button>
              </li>
            ))}
          </ul>
          {ready && !objects.length && (
            <p>
              No catalog centers are in this view. Move or zoom the map, or use
              Find a world.
            </p>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
