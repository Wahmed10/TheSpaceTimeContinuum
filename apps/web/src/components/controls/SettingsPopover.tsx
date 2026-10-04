'use client';
import { useState } from 'react';
import type { RefObject } from 'react';
import Link from 'next/link';
import * as Popover from '@radix-ui/react-popover';
import type { CameraFrame, QualitySetting } from '@space/engine';
import type { DistanceUnit } from '../../lib/formatEntity';
import type { ReducedMotionSetting } from '../../lib/userSettings';
import { useEngineStore } from '../../engine-bridge/useEngineStore';
import { updateUserSettings } from '../../engine-bridge/userSettingsBridge';
import {
  mapCommand,
  previousView,
  publicViewHref,
  solarOverview,
} from '../../engine-bridge/timeCommands';
import {
  parseExploreLocation,
  serializeExploreState,
} from '../../lib/routeState';
import Icon from '../ui/Icon';
import { preserveActiveFocus } from './popoverFocus';

export default function SettingsPopover({
  triggerRef,
  onHelp,
  onShare,
}: {
  triggerRef: RefObject<HTMLButtonElement | null>;
  onHelp(): void;
  onShare(): void;
}) {
  const [open, setOpen] = useState(false);
  const engine = useEngineStore((s) => s.engine),
    selectedId = useEngineStore((s) => s.selectedId),
    quality = useEngineStore((s) => s.quality),
    tier = useEngineStore((s) => s.tier),
    unit = useEngineStore((s) => s.distanceUnit),
    reduced = useEngineStore((s) => s.reducedMotion),
    system = useEngineStore((s) => s.systemReducedMotion),
    mapState = useEngineStore((s) => s.mapState),
    routeState = useEngineStore((s) => s.routeState),
    backend = useEngineStore((s) => s.backend);
  const scale = mapState?.scale ?? routeState?.scale ?? 'explore';
  const compatibilityHref = serializeExploreState(
    routeState ?? parseExploreLocation('/', '').state,
    { renderer: 'webgl' },
  );
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        ref={triggerRef}
        className="icon-button"
        aria-label="Settings"
      >
        <Icon name="settings" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="popover settings-popover"
          aria-label="Your observatory"
          sideOffset={12}
          align="end"
          collisionPadding={12}
          onCloseAutoFocus={preserveActiveFocus}
        >
          <h3>Your observatory</h3>
          <label className="setting-row">
            Graphics
            <select
              aria-label="Graphics"
              value={quality}
              onChange={(e) =>
                updateUserSettings({
                  quality: e.target.value as QualitySetting,
                })
              }
            >
              {['auto', 'low', 'medium', 'high', 'ultra'].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <p className="quality-state">
            Requested: {quality}. Active tier:{' '}
            {engine ? (tier === 'auto' ? 'adapting' : tier) : 'connecting'}.
            Renderer: {backend}.
          </p>
          <label className="setting-row">
            Distances
            <select
              aria-label="Distances"
              value={unit}
              onChange={(e) =>
                updateUserSettings({
                  distanceUnit: e.target.value as DistanceUnit,
                })
              }
            >
              {['km', 'mi', 'AU'].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label className="setting-row">
            Reduced motion
            <select
              aria-label="Reduced motion"
              value={reduced}
              onChange={(e) =>
                updateUserSettings({
                  reducedMotion: e.target.value as ReducedMotionSetting,
                })
              }
            >
              <option value="system">System</option>
              <option value="on">On</option>
              <option value="off">Off</option>
            </select>
          </label>
          <p>
            System preference: {system ? 'reduced motion' : 'full motion'}. Your
            override applies to camera and LIVE transitions.
          </p>
          <div className="setting-row">
            <span>Display scale</span>
            <button
              className="secondary-button"
              aria-pressed={scale === 'true'}
              aria-label={scale === 'true' ? 'True scale' : 'Explore scale'}
              disabled={!engine}
              onClick={() =>
                mapCommand((current) =>
                  current.setScale(scale === 'true' ? 'explore' : 'true'),
                )
              }
            >
              {scale === 'true' ? 'True scale' : 'Explore scale'}
            </button>
          </div>
          <label className="setting-row">
            Reference frame
            <select
              aria-label="Reference frame"
              disabled={!engine}
              value={mapState?.frame ?? routeState?.frame ?? 'ICRF_SSB'}
              onChange={(e) =>
                mapCommand((current) =>
                  current.setFrame(e.target.value as CameraFrame),
                )
              }
            >
              <option value="ICRF_SSB">Solar system barycenter</option>
              <option value="ICRF_HELIO">Sun centered</option>
              <option value="ICRF_BODY:earth">Earth centered</option>
              <option value="FIXED:earth">Earth fixed</option>
            </select>
          </label>
          <label className="setting-row">
            View preset
            <select
              aria-label="View preset"
              disabled={!engine}
              value={
                mapState?.camera?.preset ?? routeState?.camera.preset ?? 'close'
              }
              onChange={(e) =>
                mapCommand((current) =>
                  current.focus(current.focusedId, {
                    wide: e.target.value === 'wide',
                    select: selectedId !== null,
                    recordHistory: false,
                  }),
                )
              }
            >
              <option value="close">Close</option>
              <option value="wide">Wide</option>
            </select>
          </label>
          <div className="settings-actions">
            <button
              className="secondary-button"
              disabled={!engine}
              onClick={previousView}
            >
              Previous view
            </button>
            <button
              className="secondary-button"
              disabled={!engine}
              onClick={() => {
                solarOverview();
                setOpen(false);
              }}
            >
              Solar system overview
            </button>
            <button
              className="secondary-button"
              disabled={!engine}
              onClick={() => {
                setOpen(false);
                onShare();
              }}
            >
              Share this view
            </button>
            <button
              className="secondary-button"
              onClick={() => {
                setOpen(false);
                onHelp();
              }}
            >
              Field guide
            </button>
            <button className="secondary-button" disabled>
              Objects in view — unavailable
            </button>
            <Link href="/about/data" onClick={() => setOpen(false)}>
              About the data ↗
            </Link>
            <a
              href={compatibilityHref}
              onClick={(e) => {
                e.preventDefault();
                location.assign(publicViewHref(true));
              }}
            >
              Use WebGL2 compatibility mode ↗
            </a>
          </div>
          <Popover.Close className="secondary-button panel-close">
            Close settings
          </Popover.Close>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
