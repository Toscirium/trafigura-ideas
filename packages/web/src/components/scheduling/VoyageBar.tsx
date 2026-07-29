import { useRef, useState } from 'react';
import clsx from 'clsx';
import type { Voyage } from 'shared';
import { dateToX, msToPx, snapPxToMs } from '../../domain/scheduling.js';
import { useSchedulingStore } from '../../store/useSchedulingStore.js';

const BAR_HEIGHT = 26;
const MIN_DURATION_MS = 0.25 * 24 * 60 * 60 * 1000;

const DESK_ACCENT: Record<string, string> = {
  crude: 'bg-desk-crude',
  'fuel-oil': 'bg-desk-fuel-oil',
  metals: 'bg-desk-metals',
  lng: 'bg-desk-lng',
};

interface DragPreview {
  mode: 'move' | 'resize-load' | 'resize-discharge';
  deltaMs: number;
}

export function VoyageBar({ voyage, onSelect }: { voyage: Voyage; onSelect: (id: string) => void }) {
  const rescheduleVoyage = useSchedulingStore((s) => s.rescheduleVoyage);
  const [preview, setPreview] = useState<DragPreview | null>(null);

  const dragRef = useRef<{ pointerId: number; startClientX: number; mode: DragPreview['mode']; deltaMs: number } | null>(
    null,
  );

  const loadStartMs = Date.parse(voyage.plannedLoadStart);
  const loadEndMs = Date.parse(voyage.plannedLoadEnd);
  const dischargeStartMs = Date.parse(voyage.plannedDischargeStart);
  const dischargeEndMs = Date.parse(voyage.plannedDischargeEnd);

  const moveDelta = preview?.mode === 'move' ? preview.deltaMs : 0;
  const loadResizeDelta = preview?.mode === 'resize-load' ? preview.deltaMs : 0;
  const dischargeResizeDelta = preview?.mode === 'resize-discharge' ? preview.deltaMs : 0;

  const previewLoadStartMs = loadStartMs + moveDelta;
  const previewLoadEndMs = Math.max(loadEndMs + moveDelta + loadResizeDelta, previewLoadStartMs + MIN_DURATION_MS);
  const previewDischargeStartMs = dischargeStartMs + moveDelta + loadResizeDelta;
  const previewDischargeEndMs = Math.max(
    dischargeEndMs + moveDelta + loadResizeDelta + dischargeResizeDelta,
    previewDischargeStartMs + MIN_DURATION_MS,
  );

  const loadX = dateToX(voyage.plannedLoadStart) + msToPx(moveDelta);
  const loadWidth = msToPx(previewLoadEndMs - previewLoadStartMs);
  const dischargeX = dateToX(voyage.plannedDischargeStart) + msToPx(moveDelta + loadResizeDelta);
  const dischargeWidth = msToPx(previewDischargeEndMs - previewDischargeStartMs);

  const laycanX = dateToX(voyage.laycanStart);
  const laycanWidth = msToPx(Date.parse(voyage.laycanEnd) - Date.parse(voyage.laycanStart));

  const accent = DESK_ACCENT[voyage.deskId] ?? 'bg-desk-crude';

  function beginDrag(e: React.PointerEvent, mode: DragPreview['mode']) {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { pointerId: e.pointerId, startClientX: e.clientX, mode, deltaMs: 0 };
    setPreview({ mode, deltaMs: 0 });
  }

  function onPointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const deltaPx = e.clientX - drag.startClientX;
    const deltaMs = snapPxToMs(deltaPx);
    drag.deltaMs = deltaMs;
    setPreview({ mode: drag.mode, deltaMs });
  }

  function onPointerUp(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragRef.current = null;
    setPreview(null);

    // Read the delta off the ref (updated synchronously in onPointerMove), not the
    // `preview` state — a pointerup that lands before React flushes the last
    // pointermove's state update would otherwise see a stale (often zero) value.
    const deltaMs = drag.deltaMs;

    if (deltaMs === 0) {
      if (drag.mode === 'move') onSelect(voyage.id);
      return;
    }

    if (drag.mode === 'move') {
      rescheduleVoyage(voyage.id, { plannedLoadStart: new Date(loadStartMs + deltaMs).toISOString() });
    } else if (drag.mode === 'resize-load') {
      const newEnd = Math.max(loadEndMs + deltaMs, loadStartMs + MIN_DURATION_MS);
      rescheduleVoyage(voyage.id, { plannedLoadEnd: new Date(newEnd).toISOString() });
    } else {
      const newEnd = Math.max(dischargeEndMs + deltaMs, dischargeStartMs + MIN_DURATION_MS);
      rescheduleVoyage(voyage.id, { plannedDischargeEnd: new Date(newEnd).toISOString() });
    }
  }

  return (
    <div
      className="absolute top-1/2 -translate-y-1/2"
      style={{ left: 0, height: BAR_HEIGHT }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* Laycan window: contractual window the load call is meant to fall inside. */}
      <div
        className={clsx(
          'absolute top-1/2 -translate-y-1/2 rounded border border-dashed',
          voyage.laycanBreach ? 'border-status-loss/60' : 'border-line-baseline',
        )}
        style={{ left: laycanX, width: Math.max(laycanWidth, 2), height: BAR_HEIGHT + 10 }}
        aria-hidden
      />

      {/* Steaming leg connector. */}
      <div
        className="absolute top-1/2 h-px -translate-y-1/2 border-t border-dashed border-line-baseline"
        style={{ left: loadX + loadWidth, width: Math.max(dischargeX - (loadX + loadWidth), 0) }}
        aria-hidden
      />

      {/* Load call. */}
      <div
        role="button"
        tabIndex={0}
        onPointerDown={(e) => beginDrag(e, 'move')}
        className={clsx(
          'absolute top-1/2 flex -translate-y-1/2 cursor-grab items-center overflow-hidden rounded px-1.5 text-[10px] font-medium text-white shadow-sm active:cursor-grabbing',
          accent,
          voyage.laycanBreach && 'ring-2 ring-status-loss',
        )}
        style={{ left: loadX, width: Math.max(loadWidth, 6), height: BAR_HEIGHT }}
        title={`Load — ${voyage.status}`}
      >
        <span className="truncate">Load</span>
        <div
          onPointerDown={(e) => beginDrag(e, 'resize-load')}
          className="absolute right-0 top-0 h-full w-2 cursor-ew-resize bg-black/20 hover:bg-black/30"
        />
      </div>

      {/* Discharge call. */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(voyage.id)}
        className={clsx(
          'absolute top-1/2 flex -translate-y-1/2 cursor-pointer items-center overflow-hidden rounded px-1.5 text-[10px] font-medium text-white shadow-sm',
          accent,
          'opacity-70',
        )}
        style={{ left: dischargeX, width: Math.max(dischargeWidth, 6), height: BAR_HEIGHT }}
        title={`Discharge — ${voyage.status}`}
      >
        <span className="truncate">Disch</span>
        <div
          onPointerDown={(e) => beginDrag(e, 'resize-discharge')}
          className="absolute right-0 top-0 h-full w-2 cursor-ew-resize bg-black/20 hover:bg-black/30"
        />
      </div>

      {(voyage.demurrageUsd > 0 || voyage.laycanBreach) && (
        <div
          className="absolute -top-2 flex items-center gap-1 whitespace-nowrap text-[10px] font-medium text-status-loss"
          style={{ left: loadX }}
        >
          {voyage.laycanBreach ? '⚠ laycan breach' : '⚠ demurrage'}
        </div>
      )}
    </div>
  );
}
