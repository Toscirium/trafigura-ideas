import { useMemo, useState } from 'react';
import { useMarketStore } from '../../store/useMarketStore.js';
import { useSchedulingStore } from '../../store/useSchedulingStore.js';
import { byId } from '../../domain/selectors.js';
import { VoyageGantt } from './VoyageGantt.js';
import { PortCongestionStrip } from './PortCongestionStrip.js';
import { VoyageDrilldownPanel } from './VoyageDrilldownPanel.js';
import { NewVoyageDialog } from './NewVoyageDialog.js';

export function SchedulingView() {
  const vessels = useSchedulingStore((s) => s.vessels);
  const ports = useSchedulingStore((s) => s.ports);
  const voyages = useSchedulingStore((s) => s.voyages);
  const portCongestion = useSchedulingStore((s) => s.portCongestion);

  const desks = useMarketStore((s) => s.desks);
  const commodities = useMarketStore((s) => s.commodities);
  const counterparties = useMarketStore((s) => s.counterparties);

  const [selectedVoyageId, setSelectedVoyageId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const vesselsById = useMemo(() => byId(vessels), [vessels]);
  const portsById = useMemo(() => byId(ports), [ports]);
  const commoditiesById = useMemo(() => byId(commodities), [commodities]);
  const counterpartiesById = useMemo(() => byId(counterparties), [counterparties]);

  const voyageList = Object.values(voyages);
  const selected = selectedVoyageId ? (voyages[selectedVoyageId] ?? null) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Vessel &amp; Cargo Scheduling</h1>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          disabled={vessels.length === 0}
          className="rounded-md bg-desk-crude px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          + New voyage
        </button>
      </div>

      <PortCongestionStrip ports={ports} portCongestion={portCongestion} />

      {voyageList.length === 0 ? (
        <div className="rounded-lg border border-line-hairline p-8 text-center text-sm text-ink-muted">
          Waiting for scheduling data…
        </div>
      ) : (
        <VoyageGantt vessels={vessels} voyages={voyageList} onSelectVoyage={setSelectedVoyageId} />
      )}

      <VoyageDrilldownPanel
        voyage={selected}
        vessel={selected ? vesselsById[selected.vesselId] : undefined}
        commodity={selected ? commoditiesById[selected.commodityId] : undefined}
        counterparty={selected ? counterpartiesById[selected.counterpartyId] : undefined}
        loadPort={selected ? portsById[selected.loadPortId] : undefined}
        dischargePort={selected ? portsById[selected.dischargePortId] : undefined}
        onClose={() => setSelectedVoyageId(null)}
      />

      <NewVoyageDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        vessels={vessels}
        ports={ports}
        desks={desks}
        commodities={commodities}
        counterparties={counterparties}
      />
    </div>
  );
}
