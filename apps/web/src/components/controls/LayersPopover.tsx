'use client';
import { useId, useMemo } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { LAYERS } from '@space/domain';
import { useEngineStore } from '../../engine-bridge/useEngineStore';
import { mapCommand } from '../../engine-bridge/timeCommands';
import Icon from '../ui/Icon';
import { preserveActiveFocus } from './popoverFocus';

export default function LayersPopover() {
  const engine = useEngineStore((s) => s.engine),
    perf = useEngineStore((s) => s.perf),
    mapState = useEngineStore((s) => s.mapState);
  const prefix = useId();
  const layers = useMemo(
    () =>
      engine?.getLayerStates() ??
      LAYERS.map((layer) => ({
        ...layer,
        requested: mapState?.layers?.includes(layer.id) ?? layer.defaultOn,
        available: false,
        loaded: false,
        visible: false,
      })),
    [engine, perf, mapState],
  );
  return (
    <Popover.Root>
      <Popover.Trigger className="icon-button" aria-label="Layers">
        <Icon name="layers" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="popover layers-popover"
          aria-label="Map layers"
          sideOffset={12}
          align="end"
          collisionPadding={12}
          onCloseAutoFocus={preserveActiveFocus}
        >
          <h3>Make space your own</h3>
          <p>
            Explore 21 catalog worlds. Enabled layers may be hidden at this
            distance.
          </p>
          {layers.map((layer) => (
            <div className="layer-setting" key={layer.id}>
              <label className="setting-row" htmlFor={`${prefix}-${layer.id}`}>
                <span>{layer.label}</span>
                <input
                  id={`${prefix}-${layer.id}`}
                  type="checkbox"
                  checked={layer.requested}
                  disabled={!layer.available || !engine}
                  aria-describedby={`${prefix}-${layer.id}-status`}
                  onChange={(e) =>
                    mapCommand((current) =>
                      current.setLayer(layer.id, e.target.checked),
                    )
                  }
                />
              </label>
              <span className="layer-state" id={`${prefix}-${layer.id}-status`}>
                {!layer.available
                  ? 'Unavailable'
                  : !layer.requested
                    ? 'Hidden'
                    : !layer.loaded
                      ? 'Loading'
                      : layer.visible
                        ? 'Visible'
                        : 'Enabled; hidden at this distance'}
              </span>
            </div>
          ))}
          <p className="popover-foot">
            Satellites, near-Earth asteroids and spacecraft are not available
            yet.
          </p>
          <Popover.Close className="secondary-button panel-close">
            Close layers
          </Popover.Close>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
