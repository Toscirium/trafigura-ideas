import { useMemo } from 'react';
import type { Vessel, Voyage } from 'shared';
import { formatDayLabel, PX_PER_DAY, TIMELINE_DAYS, TIMELINE_START_MS, TIMELINE_WIDTH_PX } from '../../domain/scheduling.js';
import { VoyageBar } from './VoyageBar.js';

const ROW_HEIGHT = 56;
const NAME_COL_WIDTH = 176;
const DAY_MS = 24 * 60 * 60 * 1000;

export function VoyageGantt({
  vessels,
  voyages,
  onSelectVoyage,
}: {
  vessels: Vessel[];
  voyages: Voyage[];
  onSelectVoyage: (id: string) => void;
}) {
  const voyagesByVessel = useMemo(() => {
    const map = new Map<string, Voyage[]>();
    for (const v of voyages) {
      const arr = map.get(v.vesselId) ?? [];
      arr.push(v);
      map.set(v.vesselId, arr);
    }
    return map;
  }, [voyages]);

  const days = useMemo(() => Array.from({ length: TIMELINE_DAYS }, (_, i) => TIMELINE_START_MS + i * DAY_MS), []);
  const todayX = ((Date.now() - TIMELINE_START_MS) / DAY_MS) * PX_PER_DAY;

  return (
    <div className="overflow-x-auto rounded-lg border border-line-hairline">
      <div className="flex" style={{ minWidth: NAME_COL_WIDTH + TIMELINE_WIDTH_PX }}>
        <div className="sticky left-0 z-10 shrink-0 bg-surface-page" style={{ width: NAME_COL_WIDTH }}>
          <div className="flex h-9 items-center border-b border-r border-line-hairline bg-surface-card px-3 text-xs font-medium uppercase tracking-wide text-ink-muted">
            Vessel
          </div>
          {vessels.map((vessel) => (
            <div
              key={vessel.id}
              className="flex flex-col justify-center border-b border-r border-line-hairline px-3"
              style={{ height: ROW_HEIGHT }}
            >
              <span className="truncate text-sm font-medium text-ink-primary">{vessel.name}</span>
              <span className="text-[11px] text-ink-muted">
                {vessel.type} · {vessel.capacity.toLocaleString()} {vessel.capacityUnit}
              </span>
            </div>
          ))}
        </div>

        <div className="relative shrink-0" style={{ width: TIMELINE_WIDTH_PX }}>
          <div className="sticky top-0 z-10 flex h-9 border-b border-line-hairline bg-surface-card">
            {days.map((ms) => (
              <div
                key={ms}
                className="shrink-0 border-r border-line-hairline px-1.5 py-2 text-[10px] text-ink-muted"
                style={{ width: PX_PER_DAY }}
              >
                {formatDayLabel(ms)}
              </div>
            ))}
          </div>

          <div
            className="pointer-events-none absolute bottom-0 top-9 w-px bg-status-gain/70"
            style={{ left: todayX }}
            aria-hidden
          />

          {vessels.map((vessel) => (
            <div key={vessel.id} className="relative border-b border-line-hairline" style={{ height: ROW_HEIGHT }}>
              {(voyagesByVessel.get(vessel.id) ?? []).map((voyage) => (
                <VoyageBar key={voyage.id} voyage={voyage} onSelect={onSelectVoyage} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
