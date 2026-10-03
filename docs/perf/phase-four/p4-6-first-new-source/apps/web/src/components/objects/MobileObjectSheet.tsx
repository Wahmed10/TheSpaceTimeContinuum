'use client';
import { useId, useState } from 'react';
import type { ReactNode } from 'react';

export default function MobileObjectSheet({
  name,
  header,
  children,
  onClose,
}: {
  name: string;
  header: ReactNode;
  children: ReactNode;
  onClose(): void;
}) {
  const [snap, setSnap] = useState<'peek' | 'half' | 'full'>('half');
  const contentId = useId();
  return (
    <aside
      className="object-card"
      aria-label={`${name} details`}
      data-snap={snap}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerMove={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      onPointerCancel={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
      onTouchMove={(event) => event.stopPropagation()}
      onTouchEnd={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === 'Escape') {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <div
        className="sheet-snap-controls"
        role="group"
        aria-label="Object card size"
      >
        {(['peek', 'half', 'full'] as const).map((size) => (
          <button
            key={size}
            type="button"
            aria-pressed={snap === size}
            aria-controls={contentId}
            onClick={() => setSnap(size)}
          >
            {size[0]!.toUpperCase() + size.slice(1)}
          </button>
        ))}
      </div>
      <div className="object-card-header">{header}</div>
      <div
        className="object-card-scroll"
        id={contentId}
        tabIndex={0}
        role="region"
        aria-label={`${name} measurements and sources`}
      >
        {children}
      </div>
    </aside>
  );
}
