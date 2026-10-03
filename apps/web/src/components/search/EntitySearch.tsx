'use client';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, RefObject } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { EXPLORABLE_BODIES } from '@space/domain';
import type { EntityKind } from '@space/domain';
import Icon from '../ui/Icon';
import { searchEntities, SEARCH_QUERY_LIMIT } from '../../lib/catalogSearch';

const labels: Record<EntityKind, string> = {
  star: 'Star',
  planet: 'Planet',
  moon: 'Moon',
  dwarf: 'Dwarf planet',
  asteroid: 'Asteroid',
  satellite: 'Satellite',
  spacecraft: 'Spacecraft',
  barycenter: 'Barycentre',
};

export default function EntitySearch({
  onChoose,
  onClose,
  returnFocus,
}: {
  onChoose(id: string): void;
  onClose(): void;
  returnFocus: RefObject<HTMLElement | null>;
}) {
  const listId = useId(),
    input = useRef<HTMLInputElement>(null);
  const composing = useRef(false);
  const [draft, setDraft] = useState(''),
    [query, setQuery] = useState(''),
    [active, setActive] = useState(0);
  const results = useMemo(() => searchEntities(query), [query]);
  const optionId = (id: string) =>
    `${listId}-${id.replace(/[^a-z0-9-]/gi, '-')}`;
  const current = results[Math.min(active, results.length - 1)];
  useEffect(() => {
    if (current)
      document
        .getElementById(optionId(current.id))
        ?.scrollIntoView({ block: 'nearest' });
  }, [current, listId]);
  function commit(value: string) {
    setQuery(value);
    setActive(0);
  }
  function key(event: KeyboardEvent<HTMLInputElement>) {
    if (
      composing.current ||
      event.nativeEvent.isComposing ||
      event.nativeEvent.keyCode === 229
    )
      return;
    const last = results.length - 1;
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      if (last < 0) return;
      if (event.key === 'Home') setActive(0);
      else if (event.key === 'End') setActive(last);
      else
        setActive(
          (index) =>
            (index + (event.key === 'ArrowDown' ? 1 : -1) + results.length) %
            results.length,
        );
    } else if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      if (current) onChoose(current.id);
    }
  }
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          className="search-dialog"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            input.current?.focus();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (returnFocus.current?.isConnected) returnFocus.current.focus();
          }}
          onEscapeKeyDown={(event) => {
            if (composing.current || event.isComposing) event.preventDefault();
          }}
        >
          <Dialog.Title className="sr-only">Find a world</Dialog.Title>
          <Dialog.Description className="sr-only">
            Search all {EXPLORABLE_BODIES.length} available catalog worlds by
            name, alias or ID. Use arrow keys to choose a result, then Enter to
            explore.
          </Dialog.Description>
          <div className="search-box">
            <Icon name="search" />
            <input
              ref={input}
              role="combobox"
              aria-label="Find a world"
              aria-autocomplete="list"
              aria-expanded="true"
              aria-controls={listId}
              aria-activedescendant={current ? optionId(current.id) : undefined}
              autoComplete="off"
              spellCheck={false}
              placeholder="Where would you like to go?"
              maxLength={SEARCH_QUERY_LIMIT}
              value={draft}
              onChange={(event) => {
                const value = event.target.value.slice(0, SEARCH_QUERY_LIMIT);
                setDraft(value);
                if (!composing.current) commit(value);
              }}
              onKeyDown={key}
              onCompositionStart={() => {
                composing.current = true;
              }}
              onCompositionEnd={(event) => {
                composing.current = false;
                const value = event.currentTarget.value.slice(
                  0,
                  SEARCH_QUERY_LIMIT,
                );
                setDraft(value);
                commit(value);
              }}
            />
            <Dialog.Close aria-label="Close search">
              <kbd>esc</kbd>
            </Dialog.Close>
          </div>
          <div className="search-heading">
            {query.trim() ? 'SEARCH RESULTS' : 'WORLDS TO EXPLORE'}
            <span role="status" aria-live="polite">
              {results.length}{' '}
              {results.length === 1 ? 'destination' : 'destinations'}
            </span>
          </div>
          <div
            id={listId}
            role="listbox"
            aria-label="Worlds to explore"
            data-query={query}
          >
            {results.map((result, index) => (
              <button
                type="button"
                role="option"
                aria-label={`${result.name}, ${labels[result.kind]}`}
                aria-selected={result.id === current?.id}
                id={optionId(result.id)}
                data-entity-id={result.id}
                key={result.id}
                tabIndex={-1}
                className="search-result"
                onMouseDown={(event) => event.preventDefault()}
                onPointerMove={(event) => {
                  if (event.pointerType === 'mouse' && !composing.current)
                    setActive(index);
                }}
                onClick={() => onChoose(result.id)}
              >
                <i style={{ background: result.color }} />
                <span>
                  {result.name}
                  <small>{labels[result.kind]} · Solar system</small>
                </span>
                <Icon name="arrow" />
              </button>
            ))}
          </div>
          {!results.length && (
            <p className="empty-search">
              No worlds found. Try Earth, Europa, Pluto or Charon.
            </p>
          )}
          <div className="search-foot">
            ↑ ↓ Home End to choose<span>Enter to explore · Esc to close</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
