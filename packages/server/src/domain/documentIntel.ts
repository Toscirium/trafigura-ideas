import { COMMODITIES, ISSUING_BANKS, PORTS, SANCTIONS_WATCHLIST, VESSELS } from 'shared';
import { counterpartyStore } from '../state/counterpartyStore.js';
import type {
  BillOfLadingFields,
  CharterPartyFields,
  Commodity,
  Counterparty,
  DocumentExtracted,
  DocumentType,
  DocumentValidationIssue,
  KycDossierFields,
  LetterOfCreditFields,
  Port,
  Trade,
  Vessel,
  Voyage,
} from 'shared';

export const TRADING_ENTITY_NAME = 'Vantage Trading SA';

const RISK_BY_TIER: Record<Counterparty['tier'], 'low' | 'medium' | 'high'> = { A: 'low', B: 'medium', C: 'high' };

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function portName(portId: string, ports: readonly Port[]): string {
  return ports.find((p) => p.id === portId)?.name ?? portId;
}

function commodityName(commodityId: string, commodities: readonly Commodity[] = COMMODITIES): string {
  return commodities.find((c) => c.id === commodityId)?.name ?? commodityId;
}

function counterpartyName(counterpartyId: string): string {
  return counterpartyStore.list().find((c) => c.id === counterpartyId)?.name ?? counterpartyId;
}

function daysFromNow(days: number, fromMs = Date.now()): string {
  return new Date(fromMs + days * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * The "ground truth" of a document: the values that actually appear in its rendered
 * text. These deliberately diverge from the ETRM system of record on some fraction of
 * documents (a genuine cargo-quantity shortfall, a stale freight rate, etc.) — that's
 * the real-world discrepancy a middle-office analyst is meant to catch. What used to
 * happen next (comparing this object back to the ETRM to produce "issues") has moved
 * to the validate* functions below, which run on whatever the LLM actually extracted
 * from the rendered text — not on this object directly — so an extraction mistake and
 * a genuine business discrepancy both surface the same way, the way they would in reality.
 */
export interface GroundTruthResult {
  extracted: DocumentExtracted;
  rawText: string;
  counterpartyId: string | null;
  voyageId: string | null;
}

export function buildBillOfLading(voyage: Voyage, vessel: Vessel | undefined): GroundTruthResult {
  const commodity = COMMODITIES.find((c) => c.id === voyage.commodityId);
  const scenario = Math.random();

  let cargoQuantity = voyage.cargoVolume;
  if (scenario < 0.18) {
    const pct = 0.02 + Math.random() * 0.08;
    cargoQuantity = Math.round(voyage.cargoVolume * (1 - pct));
  }

  let consignee = counterpartyName(voyage.counterpartyId);
  if (scenario >= 0.18 && scenario < 0.26) {
    consignee = pick(counterpartyStore.list().filter((c) => c.id !== voyage.counterpartyId)).name;
  }

  const fields: BillOfLadingFields = {
    vesselName: vessel?.name ?? voyage.vesselId,
    shipper: TRADING_ENTITY_NAME,
    consignee,
    cargoDescription: commodity?.name ?? voyage.commodityId,
    cargoQuantity,
    cargoUnit: voyage.cargoUnit,
    portOfLoading: portName(voyage.loadPortId, PORTS),
    portOfDischarge: portName(voyage.dischargePortId, PORTS),
    dateOfIssue: voyage.plannedLoadStart,
  };

  const rawText = [
    `BILL OF LADING`,
    `Vessel: ${fields.vesselName}`,
    `Shipper: ${fields.shipper}`,
    `Consignee: ${fields.consignee}`,
    `Cargo: ${fields.cargoQuantity.toLocaleString()} ${fields.cargoUnit} of ${fields.cargoDescription}`,
    `Port of Loading: ${fields.portOfLoading}`,
    `Port of Discharge: ${fields.portOfDischarge}`,
    `Date of Issue: ${fields.dateOfIssue.slice(0, 10)}`,
  ].join('\n');

  return { extracted: { docType: 'bill-of-lading', fields }, rawText, counterpartyId: voyage.counterpartyId, voyageId: voyage.id };
}

/** Compares an LLM-extracted B/L against the voyage it was generated from. */
export function validateBillOfLading(fields: BillOfLadingFields, voyage: Voyage): DocumentValidationIssue[] {
  const issues: DocumentValidationIssue[] = [];

  const qtyDiffPct = Math.abs(fields.cargoQuantity - voyage.cargoVolume) / voyage.cargoVolume;
  if (qtyDiffPct > 0.01) {
    issues.push({
      field: 'cargoQuantity',
      message: `B/L quantity (${fields.cargoQuantity.toLocaleString()} ${voyage.cargoUnit}) differs from chartered cargo (${voyage.cargoVolume.toLocaleString()} ${voyage.cargoUnit})`,
      severity: qtyDiffPct > 0.05 ? 'critical' : 'warning',
    });
  }
  const expectedConsignee = counterpartyName(voyage.counterpartyId);
  if (fields.consignee !== expectedConsignee) {
    issues.push({
      field: 'consignee',
      message: `Consignee "${fields.consignee}" does not match the voyage counterparty "${expectedConsignee}"`,
      severity: 'critical',
    });
  }

  return issues;
}

export function buildLetterOfCredit(counterparty: Counterparty, trade: Trade | undefined): GroundTruthResult {
  const commodity = trade ? COMMODITIES.find((c) => c.id === trade.commodityId) : pick(COMMODITIES);
  const tradeValue = trade ? trade.volume * trade.price : 500_000 + Math.random() * 4_500_000;
  const scenario = Math.random();

  let amountUsd = Math.round(tradeValue * (1.0 + Math.random() * 0.03));
  if (scenario < 0.15) {
    amountUsd = Math.round(tradeValue * (0.85 + Math.random() * 0.1));
  }

  const shipmentOffsetDays = -5 + Math.random() * 20;
  let expiryOffsetDays = shipmentOffsetDays + 14 + Math.random() * 14;
  if (scenario >= 0.15 && scenario < 0.24) {
    expiryOffsetDays = shipmentOffsetDays - (2 + Math.random() * 5);
  }

  const fields: LetterOfCreditFields = {
    lcNumber: `LC${Math.floor(100000 + Math.random() * 899999)}`,
    issuingBank: pick(ISSUING_BANKS),
    applicant: counterparty.name,
    beneficiary: TRADING_ENTITY_NAME,
    amountUsd,
    expiryDate: daysFromNow(expiryOffsetDays),
    latestShipmentDate: daysFromNow(shipmentOffsetDays),
    commodityDescription: commodity?.name ?? 'Commodity cargo',
  };

  const rawText = [
    `IRREVOCABLE DOCUMENTARY CREDIT`,
    `LC Number: ${fields.lcNumber}`,
    `Issuing Bank: ${fields.issuingBank}`,
    `Applicant: ${fields.applicant}`,
    `Beneficiary: ${fields.beneficiary}`,
    `Amount: USD ${fields.amountUsd.toLocaleString()}`,
    `Commodity: ${fields.commodityDescription}`,
    `Latest Shipment Date: ${fields.latestShipmentDate.slice(0, 10)}`,
    `Expiry Date: ${fields.expiryDate.slice(0, 10)}`,
  ].join('\n');

  return { extracted: { docType: 'letter-of-credit', fields }, rawText, counterpartyId: counterparty.id, voyageId: null };
}

/** Compares an LLM-extracted LC against the trade it was generated from (if any) and internal date logic. */
export function validateLetterOfCredit(fields: LetterOfCreditFields, trade: Trade | undefined): DocumentValidationIssue[] {
  const issues: DocumentValidationIssue[] = [];

  if (trade) {
    const tradeValue = trade.volume * trade.price;
    if (Math.abs(fields.amountUsd - tradeValue) / tradeValue > 0.02) {
      issues.push({
        field: 'amountUsd',
        message: `LC amount ($${fields.amountUsd.toLocaleString()}) does not cover the underlying trade value ($${Math.round(tradeValue).toLocaleString()})`,
        severity: fields.amountUsd < tradeValue ? 'critical' : 'warning',
      });
    }
  }
  if (Date.parse(fields.expiryDate) < Date.parse(fields.latestShipmentDate)) {
    issues.push({
      field: 'expiryDate',
      message: 'LC expiry date falls before the latest shipment date — shipment would not be presentable in time',
      severity: 'critical',
    });
  }
  if (Date.parse(fields.latestShipmentDate) < Date.now()) {
    issues.push({ field: 'latestShipmentDate', message: 'Latest shipment date has already passed', severity: 'warning' });
  }

  return issues;
}

export function buildCharterParty(voyage: Voyage, vessel: Vessel | undefined): GroundTruthResult {
  const scenario = Math.random();

  let freightRateUsd = voyage.freightRateUsd;
  if (scenario < 0.16) {
    const pct = 0.03 + Math.random() * 0.12;
    freightRateUsd = Math.round(voyage.freightRateUsd * (1 - pct));
  }

  const fields: CharterPartyFields = {
    vesselName: vessel?.name ?? voyage.vesselId,
    charterer: TRADING_ENTITY_NAME,
    owner: vessel?.ownership === 'owned' ? TRADING_ENTITY_NAME : 'Third-party owner',
    laycanStart: voyage.laycanStart,
    laycanEnd: voyage.laycanEnd,
    freightRateUsd,
    demurrageRateUsdPerDay: voyage.demurrageRateUsdPerDay,
    loadPort: portName(voyage.loadPortId, PORTS),
    dischargePort: portName(voyage.dischargePortId, PORTS),
  };

  const rawText = [
    `CHARTER PARTY (voyage)`,
    `Vessel: ${fields.vesselName}`,
    `Charterer: ${fields.charterer}`,
    `Owner: ${fields.owner}`,
    `Laycan: ${fields.laycanStart.slice(0, 10)} - ${fields.laycanEnd.slice(0, 10)}`,
    `Freight: USD ${fields.freightRateUsd.toLocaleString()} lumpsum`,
    `Demurrage: USD ${fields.demurrageRateUsdPerDay.toLocaleString()}/day`,
    `Load Port: ${fields.loadPort}`,
    `Discharge Port: ${fields.dischargePort}`,
  ].join('\n');

  return { extracted: { docType: 'charter-party', fields }, rawText, counterpartyId: voyage.counterpartyId, voyageId: voyage.id };
}

/** Compares an LLM-extracted charter party against the voyage it was generated from. */
export function validateCharterParty(fields: CharterPartyFields, voyage: Voyage): DocumentValidationIssue[] {
  const issues: DocumentValidationIssue[] = [];

  const freightDiffPct = Math.abs(fields.freightRateUsd - voyage.freightRateUsd) / Math.max(voyage.freightRateUsd, 1);
  if (freightDiffPct > 0.01) {
    issues.push({
      field: 'freightRateUsd',
      message: `Charter party freight ($${fields.freightRateUsd.toLocaleString()}) does not match the fixed rate on the voyage ($${voyage.freightRateUsd.toLocaleString()})`,
      severity: freightDiffPct > 0.08 ? 'critical' : 'warning',
    });
  }

  return issues;
}

export function buildKycDossier(counterparty: Counterparty): GroundTruthResult {
  const scenario = Math.random();
  const hitEntry = scenario < 0.14 ? pick(SANCTIONS_WATCHLIST) : null;

  const fields: KycDossierFields = {
    counterpartyName: counterparty.name,
    jurisdiction: counterparty.region,
    beneficialOwner: hitEntry?.name ?? pick(['J. Alderton', 'M. Kowalski', 'S. Okonjo', 'L. Mercer', 'R. Iyer']),
    sanctionsListsChecked: ['OFAC-SDN', 'EU-Consolidated', 'UN-Consolidated', 'PEP'],
    riskRating: RISK_BY_TIER[counterparty.tier],
  };

  const rawText = [
    `KYC DOSSIER`,
    `Counterparty: ${fields.counterpartyName}`,
    `Jurisdiction: ${fields.jurisdiction}`,
    `Beneficial owner: ${fields.beneficialOwner}`,
    `Lists checked: ${fields.sanctionsListsChecked.join(', ')}`,
    `Risk rating: ${fields.riskRating.toUpperCase()}`,
  ].join('\n');

  return { extracted: { docType: 'kyc-dossier', fields }, rawText, counterpartyId: counterparty.id, voyageId: null };
}

/** Fuzzy-checks an LLM-extracted KYC dossier's beneficial owner against the sanctions watchlist. */
export function validateKycDossier(fields: KycDossierFields): DocumentValidationIssue[] {
  const issues: DocumentValidationIssue[] = [];
  const hit = SANCTIONS_WATCHLIST.find((w) => w.name.toLowerCase() === fields.beneficialOwner.toLowerCase());
  if (hit) {
    issues.push({
      field: 'beneficialOwner',
      message: `Beneficial owner "${fields.beneficialOwner}" fuzzy-matches "${hit.name}" on the ${hit.list} list`,
      severity: 'critical',
    });
  }
  return issues;
}

export function pickDocumentType(): DocumentType {
  const r = Math.random();
  if (r < 0.35) return 'bill-of-lading';
  if (r < 0.6) return 'letter-of-credit';
  if (r < 0.82) return 'charter-party';
  return 'kyc-dossier';
}

export function randomVessel(): Vessel {
  return pick(VESSELS);
}
