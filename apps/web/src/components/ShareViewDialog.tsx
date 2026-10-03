'use client';
import { useRef, useState } from 'react';
import type { RefObject } from 'react';
import * as Dialog from '@radix-ui/react-dialog';

export default function ShareViewDialog({
  url,
  onClose,
  returnFocus,
}: {
  url: string | null;
  onClose(): void;
  returnFocus: RefObject<HTMLButtonElement | null>;
}) {
  const input = useRef<HTMLTextAreaElement>(null);
  const [message, setMessage] = useState('');
  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setMessage('Link copied.');
    } catch {
      input.current?.focus();
      input.current?.select();
      setMessage('The link is selected. Use your device’s Copy command.');
    }
  }
  return (
    <Dialog.Root
      open={url !== null}
      onOpenChange={(open) => {
        if (!open) {
          setMessage('');
          onClose();
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          className="help-dialog"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            input.current?.focus();
            input.current?.select();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocus.current?.focus();
          }}
        >
          <Dialog.Title>Share this view</Dialog.Title>
          <Dialog.Description>
            Share the selected world, time, layers and view settings. Copy the
            link below.
          </Dialog.Description>
          <label htmlFor="shared-view-url">View link</label>
          <textarea
            id="shared-view-url"
            ref={input}
            className="share-url"
            readOnly
            value={url ?? ''}
            rows={4}
            onFocus={(event) => event.target.select()}
          />
          <p role="status">
            {message ||
              'Automatic copying is unavailable. You can select and copy this link.'}
          </p>
          <button className="primary-button" onClick={copy}>
            Copy link
          </button>{' '}
          <Dialog.Close className="secondary-button">Close</Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
