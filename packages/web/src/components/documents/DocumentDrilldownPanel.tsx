import * as Dialog from '@radix-ui/react-dialog';
import clsx from 'clsx';
import type { DocumentExtracted, DocumentStatus, TradeDocument } from 'shared';
import { useDocumentStore } from '../../store/useDocumentStore.js';
import { DOC_STATUS_LABEL, DOC_TYPE_LABEL } from '../../domain/documents.js';

interface DocumentDrilldownPanelProps {
  document: TradeDocument | null;
  onClose: () => void;
}

export function DocumentDrilldownPanel({ document, onClose }: DocumentDrilldownPanelProps) {
  const reviewDocument = useDocumentStore((s) => s.reviewDocument);

  return (
    <Dialog.Root open={document !== null} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60" />
        <Dialog.Content className="fixed right-0 top-0 flex h-screen w-full max-w-lg flex-col gap-4 overflow-y-auto border-l border-line-hairline bg-surface-card p-6 shadow-xl">
          {document && (
            <>
              <div className="flex items-center justify-between">
                <Dialog.Title className="text-sm font-semibold text-ink-primary">
                  {DOC_TYPE_LABEL[document.docType]} · {document.fileName}
                </Dialog.Title>
                <StatusBadge status={document.status} />
              </div>
              <Dialog.Description className="text-xs text-ink-muted">
                Received {new Date(document.receivedAt).toLocaleString()}
                {document.confidence !== null && ` · ${Math.round(document.confidence * 100)}% extraction confidence`}
              </Dialog.Description>

              <Section title="Raw document (as received)">
                <pre className="whitespace-pre-wrap break-words rounded-md bg-surface-page p-3 font-mono text-[11px] leading-relaxed text-ink-secondary">
                  {document.rawText}
                </pre>
              </Section>

              <Section title="Extracted fields (Claude)">
                {document.extracted ? (
                  <ExtractedFields extracted={document.extracted} />
                ) : (
                  <div className="flex items-center gap-2 text-xs text-ink-muted">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-desk-crude" aria-hidden />
                    Extracting with Claude…
                  </div>
                )}
              </Section>

              {document.issues.length > 0 && (
                <Section title="Validation issues">
                  <div className="flex flex-col gap-2">
                    {document.issues.map((issue, idx) => (
                      <div key={idx} className="flex items-start justify-between gap-2 text-xs">
                        <span className="text-ink-secondary">{issue.message}</span>
                        <span
                          className={clsx(
                            'shrink-0 font-medium',
                            issue.severity === 'critical' && 'text-status-loss',
                            issue.severity === 'warning' && 'text-desk-lng',
                            issue.severity === 'info' && 'text-ink-muted',
                          )}
                        >
                          {issue.severity}
                        </span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {document.status === 'processing' ? (
                <div className="mt-auto rounded-md border border-line-hairline bg-surface-page px-3 py-2 text-xs text-ink-muted">
                  Waiting on Claude to finish extracting this document…
                </div>
              ) : document.status === 'needs-review' ? (
                <div className="mt-auto flex gap-2">
                  <button
                    type="button"
                    onClick={() => reviewDocument(document.id, { decision: 'reject' })}
                    className="flex-1 rounded-md border border-status-loss px-3 py-1.5 text-xs font-medium text-status-loss hover:bg-status-loss/10"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => reviewDocument(document.id, { decision: 'approve' })}
                    className="flex-1 rounded-md bg-desk-crude px-3 py-1.5 text-xs font-medium text-white"
                  >
                    Approve
                  </button>
                </div>
              ) : (
                <div
                  className={clsx(
                    'mt-auto rounded-md border px-3 py-2 text-xs',
                    document.status === 'validated'
                      ? 'border-status-gain/40 bg-status-gain/10 text-status-gain'
                      : 'border-status-loss/40 bg-status-loss/10 text-status-loss',
                  )}
                >
                  {DOC_STATUS_LABEL[document.status]} by {document.reviewedBy}
                  {document.reviewedAt ? ` · ${new Date(document.reviewedAt).toLocaleString()}` : ''}
                </div>
              )}

              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-md border border-line-hairline py-2 text-xs font-medium text-ink-secondary hover:text-ink-primary"
                >
                  Close
                </button>
              </Dialog.Close>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ExtractedFields({ extracted }: { extracted: DocumentExtracted }) {
  const rows = fieldRows(extracted);
  return (
    <div className="flex flex-col gap-1.5">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between gap-2 text-xs">
          <span className="text-ink-secondary">{label}</span>
          <span className="text-right font-mono tabular-nums text-ink-primary">{value}</span>
        </div>
      ))}
    </div>
  );
}

function fieldRows(extracted: DocumentExtracted): [string, string][] {
  switch (extracted.docType) {
    case 'bill-of-lading': {
      const f = extracted.fields;
      return [
        ['Vessel', f.vesselName],
        ['Shipper', f.shipper],
        ['Consignee', f.consignee],
        ['Cargo', f.cargoDescription],
        ['Quantity', `${f.cargoQuantity.toLocaleString()} ${f.cargoUnit}`],
        ['Load port', f.portOfLoading],
        ['Discharge port', f.portOfDischarge],
        ['Date of issue', f.dateOfIssue.slice(0, 10)],
      ];
    }
    case 'letter-of-credit': {
      const f = extracted.fields;
      return [
        ['LC number', f.lcNumber],
        ['Issuing bank', f.issuingBank],
        ['Applicant', f.applicant],
        ['Beneficiary', f.beneficiary],
        ['Amount', `$${f.amountUsd.toLocaleString()}`],
        ['Commodity', f.commodityDescription],
        ['Latest shipment', f.latestShipmentDate.slice(0, 10)],
        ['Expiry', f.expiryDate.slice(0, 10)],
      ];
    }
    case 'charter-party': {
      const f = extracted.fields;
      return [
        ['Vessel', f.vesselName],
        ['Charterer', f.charterer],
        ['Owner', f.owner],
        ['Laycan', `${f.laycanStart.slice(0, 10)} – ${f.laycanEnd.slice(0, 10)}`],
        ['Freight', `$${f.freightRateUsd.toLocaleString()}`],
        ['Demurrage', `$${f.demurrageRateUsdPerDay.toLocaleString()}/day`],
        ['Load port', f.loadPort],
        ['Discharge port', f.dischargePort],
      ];
    }
    case 'kyc-dossier': {
      const f = extracted.fields;
      return [
        ['Counterparty', f.counterpartyName],
        ['Jurisdiction', f.jurisdiction],
        ['Beneficial owner', f.beneficialOwner],
        ['Lists checked', f.sanctionsListsChecked.join(', ')],
        ['Risk rating', f.riskRating.toUpperCase()],
      ];
    }
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-line-hairline p-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">{title}</div>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: DocumentStatus }) {
  return (
    <span
      className={clsx(
        'rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
        status === 'validated' && 'bg-status-gain/15 text-status-gain',
        status === 'needs-review' && 'bg-desk-lng/15 text-desk-lng',
        status === 'rejected' && 'bg-status-loss/15 text-status-loss',
        status === 'processing' && 'animate-pulse bg-ink-muted/15 text-ink-secondary',
      )}
    >
      {DOC_STATUS_LABEL[status]}
    </span>
  );
}
