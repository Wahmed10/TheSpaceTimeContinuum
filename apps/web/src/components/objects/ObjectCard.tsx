'use client';
import { useId, useMemo, useState } from 'react';
import type { RefObject } from 'react';
import type { BodySpec } from '@space/domain';
import { useEngineStore } from '../../engine-bridge/useEngineStore';
import { readObjectSnapshot } from '../../engine-bridge/objectSnapshot';
import { focusObject, mapCommand } from '../../engine-bridge/timeCommands';
import {
  certaintyLabel,
  entityLayer,
  entityType,
} from '../../lib/formatEntity';
import Icon from '../ui/Icon';
import ObjectMetrics from './ObjectMetrics';
import ProvenanceDetails from './ProvenanceDetails';
import MobileObjectSheet from './MobileObjectSheet';

export default function ObjectCard({
  body,
  onShare,
  returnFocus,
}: {
  body: BodySpec;
  onShare(trigger: HTMLButtonElement): void;
  returnFocus: RefObject<HTMLElement | null>;
}) {
  const engine = useEngineStore((state) => state.engine),
    perf = useEngineStore((state) => state.perf),
    unit = useEngineStore((state) => state.distanceUnit),
    following = useEngineStore((state) => state.following),
    mapState = useEngineStore((state) => state.mapState);
  const [details, setDetails] = useState(false);
  const detailsId = useId();
  // Use the existing <=4 Hz perf bridge, plus cold selection/settings commands.
  // No frame callback or extra renderer/clock subscription belongs to the card.
  const snapshot = useMemo(
    () => readObjectSnapshot(engine, body.id),
    [engine, body.id, perf],
  );
  const layer = useMemo(
    () =>
      engine
        ?.getLayerStates()
        .find((entry) => entry.id === entityLayer(body.kind)),
    [engine, body.kind, perf, mapState],
  );
  function close() {
    mapCommand((current) => current.select(null));
    returnFocus.current?.focus();
  }
  return (
    <MobileObjectSheet
      name={body.name}
      onClose={close}
      header={
        <>
          <div className="card-top">
            <span className="eyebrow" data-testid="entity-type">
              {entityType(body)}
            </span>
            <button
              className="icon-button"
              aria-label="Close object card"
              onClick={close}
            >
              <Icon name="close" />
            </button>
          </div>
          <h2>
            {body.name}
            <span style={{ background: body.color }} />
          </h2>
          <p className="position-certainty">
            {certaintyLabel(
              snapshot.metrics?.certainty ?? body.provenance.certainty,
            )}{' '}
            position
          </p>
        </>
      }
    >
      <p className="description">{body.description}</p>
      <ObjectMetrics body={body} metrics={snapshot.metrics} unit={unit} />
      <div className="card-actions">
        <button className="primary-button" onClick={() => focusObject(body.id)}>
          <Icon name="focus" /> Get closer
        </button>
        <button
          className={'secondary-button ' + (following ? 'active' : '')}
          aria-pressed={following}
          onClick={() =>
            mapCommand((current) => current.follow(following ? null : body.id))
          }
        >
          {following ? 'Following' : 'Follow'}
        </button>
      </div>
      {layer && (
        <div className="object-layer-status">
          <span>
            {layer.label}:{' '}
            {!layer.available
              ? 'unavailable'
              : !layer.requested
                ? 'hidden'
                : layer.visible
                  ? 'visible'
                  : 'enabled; this view may hide distant objects'}
          </span>
          {layer.available && (
            <button
              className="secondary-button"
              aria-label={`${layer.requested ? 'Hide' : 'Show'} ${layer.label} layer`}
              aria-pressed={layer.requested}
              onClick={() =>
                mapCommand((current) =>
                  current.setLayer(layer.id, !layer.requested),
                )
              }
            >
              {layer.requested ? 'Hide layer' : 'Show layer'}
            </button>
          )}
        </div>
      )}
      <button
        className="detail-toggle"
        aria-expanded={details}
        aria-controls={detailsId}
        onClick={() => setDetails(!details)}
      >
        {details ? 'Less' : 'More'} about this world{' '}
        <span>{details ? '−' : '+'}</span>
      </button>
      <div id={detailsId} hidden={!details}>
        <ProvenanceDetails body={body} simulationUtc={snapshot.simulationUtc} />
      </div>
      <button
        className="card-share secondary-button"
        aria-label={`Share ${body.name} view`}
        onClick={(event) => onShare(event.currentTarget)}
      >
        <Icon name="share" /> Share view
      </button>
      <p className="provenance">
        <span className="provenance-dot" /> Physical measurements · ICRF / SSB
      </p>
    </MobileObjectSheet>
  );
}
