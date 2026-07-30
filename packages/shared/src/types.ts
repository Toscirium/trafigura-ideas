export type DeskId = 'crude' | 'fuel-oil' | 'metals' | 'lng';

export interface Desk {
  id: DeskId;
  name: string;
}

export interface Commodity {
  id: string;
  name: string;
  deskId: DeskId;
  unit: 'bbl' | 'mt' | 'MMBtu';
  basePrice: number;
  volatility: number;
  currency: 'USD';
}

export interface Counterparty {
  id: string;
  name: string;
  tier: 'A' | 'B' | 'C';
  region: string;
}

export type TradeSide = 'BUY' | 'SELL';

export interface Trade {
  id: string;
  timestamp: string;
  deskId: DeskId;
  commodityId: string;
  counterpartyId: string;
  side: TradeSide;
  volume: number;
  price: number;
}

export interface Position {
  key: string;
  deskId: DeskId;
  commodityId: string;
  counterpartyId: string;
  netVolume: number;
  grossVolume: number;
  avgPrice: number;
  lastMarketPrice: number;
  mtmPnl: number;
  tradeCount: number;
  updatedAt: string;
}

export interface MarketPriceTick {
  commodityId: string;
  price: number;
  change: number;
  changePct: number;
  timestamp: string;
}

export interface SnapshotPayload {
  desks: Desk[];
  commodities: Commodity[];
  counterparties: Counterparty[];
  positions: Position[];
  prices: MarketPriceTick[];
}

export type ServerEvent =
  | { type: 'snapshot'; payload: SnapshotPayload }
  | { type: 'trade'; payload: Trade }
  | { type: 'priceTick'; payload: MarketPriceTick }
  | { type: 'positionUpdate'; payload: Position }
  | { type: 'schedulingSnapshot'; payload: SchedulingSnapshotPayload }
  | { type: 'voyageUpdate'; payload: Voyage }
  | { type: 'portCongestionUpdate'; payload: PortCongestion }
  | { type: 'reconciliationSnapshot'; payload: ReconciliationSnapshotPayload }
  | { type: 'confirmationUpdate'; payload: TradeConfirmation }
  | { type: 'crmSnapshot'; payload: CrmSnapshotPayload }
  | { type: 'profileUpdate'; payload: CounterpartyProfile }
  | { type: 'noteAdded'; payload: RelationshipNote }
  | { type: 'contactsUpdate'; payload: { counterpartyId: string; contacts: Contact[] } }
  | { type: 'documentSnapshot'; payload: DocumentIntelSnapshotPayload }
  | { type: 'documentUpdate'; payload: TradeDocument }
  | { type: 'settlementSnapshot'; payload: SettlementSnapshotPayload }
  | { type: 'invoiceUpdate'; payload: Invoice }
  | { type: 'complianceSnapshot'; payload: ComplianceSnapshotPayload }
  | { type: 'caseUpdate'; payload: ComplianceCase }
  | { type: 'caseActivityAdded'; payload: CaseActivityEntry }
  | { type: 'auditSnapshot'; payload: AuditSnapshotPayload }
  | { type: 'auditAdded'; payload: AuditLogEntry }
  | { type: 'alertSnapshot'; payload: AlertSnapshotPayload }
  | { type: 'alertCreated'; payload: AlertItem }
  | { type: 'counterpartiesUpdate'; payload: Counterparty[] };

export function positionKey(deskId: DeskId, commodityId: string, counterpartyId: string): string {
  return `${deskId}|${commodityId}|${counterpartyId}`;
}

// --- Vessel / cargo scheduling & freight optimization -----------------

export type VesselType = 'VLCC' | 'Suezmax' | 'Aframax' | 'Panamax' | 'MR' | 'LNGC';

export interface Vessel {
  id: string;
  name: string;
  imo: string;
  type: VesselType;
  capacity: number;
  capacityUnit: 'bbl' | 'mt' | 'cbm';
  speedKnots: number;
  ownership: 'owned' | 'chartered-in';
}

export interface Port {
  id: string;
  name: string;
  unlocode: string;
  country: string;
  region: string;
}

export type VoyageStatus = 'scheduled' | 'loading' | 'laden' | 'discharging' | 'completed';

export type FreightRateBasis = 'per-unit' | 'lumpsum';

/**
 * A voyage's timing is modeled as two port calls (load, discharge) connected by a
 * fixed steaming leg. Dragging the load call shifts the whole voyage; resizing a
 * call's duration changes laytime used at that port, which cascades into
 * demurrage/dispatch and the discharge call's start (via transitDays).
 */
export interface Voyage {
  id: string;
  vesselId: string;
  deskId: DeskId;
  commodityId: string;
  counterpartyId: string;
  loadPortId: string;
  dischargePortId: string;
  transitDays: number;

  laycanStart: string;
  laycanEnd: string;

  plannedLoadStart: string;
  plannedLoadEnd: string;
  plannedDischargeStart: string;
  plannedDischargeEnd: string;

  cargoVolume: number;
  cargoUnit: 'bbl' | 'mt' | 'cbm';

  freightRateBasis: FreightRateBasis;
  freightRateUsd: number;
  demurrageRateUsdPerDay: number;
  dispatchRateUsdPerDay: number;
  laytimeAllowedHours: number;

  bunkerCostUsd: number;
  portCostsUsd: number;
  otherCostsUsd: number;

  status: VoyageStatus;

  // Server-computed (derived from the fields above; clients should treat as read-only).
  laytimeUsedHours: number;
  demurrageUsd: number;
  dispatchUsd: number;
  freightRevenueUsd: number;
  voyagePnlUsd: number;
  laycanBreach: boolean;

  updatedAt: string;
}

export interface PortCongestion {
  portId: string;
  vesselsWaiting: number;
  avgWaitHours: number;
  updatedAt: string;
}

export interface SchedulingSnapshotPayload {
  vessels: Vessel[];
  ports: Port[];
  voyages: Voyage[];
  portCongestion: PortCongestion[];
}

/** Fields a client may propose changing when dragging/resizing a voyage bar. */
export type VoyageReschedulePatch = Partial<
  Pick<Voyage, 'plannedLoadStart' | 'plannedLoadEnd' | 'plannedDischargeEnd' | 'status'>
>;

/** Fields required to charter a new voyage. */
export type NewVoyageInput = Pick<
  Voyage,
  | 'vesselId'
  | 'deskId'
  | 'commodityId'
  | 'counterpartyId'
  | 'loadPortId'
  | 'dischargePortId'
  | 'transitDays'
  | 'laycanStart'
  | 'laycanEnd'
  | 'plannedLoadStart'
  | 'plannedLoadEnd'
  | 'cargoVolume'
  | 'cargoUnit'
  | 'freightRateBasis'
  | 'freightRateUsd'
  | 'demurrageRateUsdPerDay'
  | 'dispatchRateUsdPerDay'
  | 'laytimeAllowedHours'
  | 'bunkerCostUsd'
  | 'portCostsUsd'
  | 'otherCostsUsd'
>;

// --- Trade capture & deal reconciliation -------------------------------

export type ConfirmationChannel = 'email' | 'edi' | 'swift';
export type ConfirmationStatus = 'matched' | 'break' | 'unmatched';
export type BreakField = 'price' | 'volume' | 'counterparty' | 'tradeDate';
export type BreakSeverity = 'warning' | 'critical';

export interface BreakDetail {
  field: BreakField;
  etrmValue: string;
  confirmedValue: string;
  severity: BreakSeverity;
}

/** Fields as parsed out of an incoming confirmation message (the counterparty's version of the trade). */
export interface ConfirmationExtracted {
  deskId: DeskId;
  commodityId: string;
  counterpartyId: string;
  side: TradeSide;
  volume: number;
  price: number;
  tradeDate: string;
}

export interface TradeConfirmation {
  id: string;
  channel: ConfirmationChannel;
  receivedAt: string;
  rawText: string;
  extracted: ConfirmationExtracted;
  /** The ETRM trade the matching engine picked as the best candidate, if any. */
  matchedTradeId: string | null;
  status: ConfirmationStatus;
  breaks: BreakDetail[];
  resolved: boolean;
  resolutionNote: string | null;
  resolvedAt: string | null;
}

export interface ReconciliationSnapshotPayload {
  confirmations: TradeConfirmation[];
}

export type NewTradeInput = Pick<Trade, 'deskId' | 'commodityId' | 'counterpartyId' | 'side' | 'volume' | 'price'>;

export interface CaptureTradeRequest extends NewTradeInput {
  /** Set to bypass a credit-limit block once the trader has acknowledged it. */
  force?: boolean;
}

export interface ResolveBreakInput {
  note?: string;
}

export interface CreditCheckResult {
  ok: boolean;
  limitUsd: number;
  currentExposureUsd: number;
  projectedExposureUsd: number;
  utilizationPct: number;
}

// --- Counterparty / credit risk & CRM hybrid ---------------------------

export type KycStatus = 'verified' | 'pending' | 'expired';

export interface CounterpartyProfile {
  counterpartyId: string;
  creditLimitUsd: number;
  kycStatus: KycStatus;
  kycRenewalDate: string;
  relationshipOwner: string;
  onboardedAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  counterpartyId: string;
  name: string;
  role: string;
  email: string;
  phone: string;
}

export interface RelationshipNote {
  id: string;
  counterpartyId: string;
  author: string;
  body: string;
  createdAt: string;
}

export interface CrmSnapshotPayload {
  profiles: CounterpartyProfile[];
  contacts: Contact[];
  notes: RelationshipNote[];
}

export type UpdateProfileInput = Partial<
  Pick<CounterpartyProfile, 'creditLimitUsd' | 'kycStatus' | 'kycRenewalDate' | 'relationshipOwner'>
>;

export type NewContactInput = Pick<Contact, 'name' | 'role' | 'email' | 'phone'>;

export interface NewNoteInput {
  author: string;
  body: string;
}

// --- Document intelligence for trade finance & logistics ---------------

export type DocumentType = 'bill-of-lading' | 'letter-of-credit' | 'charter-party' | 'kyc-dossier';
export type DocumentStatus = 'processing' | 'needs-review' | 'validated' | 'rejected';
export type DocumentIssueSeverity = 'info' | 'warning' | 'critical';

export interface DocumentValidationIssue {
  field: string;
  message: string;
  severity: DocumentIssueSeverity;
}

export interface BillOfLadingFields {
  vesselName: string;
  shipper: string;
  consignee: string;
  cargoDescription: string;
  cargoQuantity: number;
  cargoUnit: string;
  portOfLoading: string;
  portOfDischarge: string;
  dateOfIssue: string;
}

export interface LetterOfCreditFields {
  lcNumber: string;
  issuingBank: string;
  applicant: string;
  beneficiary: string;
  amountUsd: number;
  expiryDate: string;
  latestShipmentDate: string;
  commodityDescription: string;
}

export interface CharterPartyFields {
  vesselName: string;
  charterer: string;
  owner: string;
  laycanStart: string;
  laycanEnd: string;
  freightRateUsd: number;
  demurrageRateUsdPerDay: number;
  loadPort: string;
  dischargePort: string;
}

export interface KycDossierFields {
  counterpartyName: string;
  jurisdiction: string;
  beneficialOwner: string;
  sanctionsListsChecked: string[];
  riskRating: 'low' | 'medium' | 'high';
}

export type DocumentExtracted =
  | { docType: 'bill-of-lading'; fields: BillOfLadingFields }
  | { docType: 'letter-of-credit'; fields: LetterOfCreditFields }
  | { docType: 'charter-party'; fields: CharterPartyFields }
  | { docType: 'kyc-dossier'; fields: KycDossierFields };

export interface TradeDocument {
  id: string;
  receivedAt: string;
  fileName: string;
  docType: DocumentType;
  counterpartyId: string | null;
  voyageId: string | null;
  rawText: string;
  /** Null while status is 'processing' — the LLM extraction call is still in flight. */
  extracted: DocumentExtracted | null;
  confidence: number | null;
  status: DocumentStatus;
  issues: DocumentValidationIssue[];
  reviewedBy: string | null;
  reviewedAt: string | null;
}

export interface DocumentIntelSnapshotPayload {
  documents: TradeDocument[];
}

export interface ReviewDocumentInput {
  decision: 'approve' | 'reject';
  note?: string;
}

// --- Settlement, invoicing & reconciliation -----------------------------

export type InvoiceType = 'commodity' | 'freight' | 'demurrage';
export type InvoiceMatchStatus = 'matched' | 'issues';
export type PaymentMethod = 'wire' | 'letter-of-credit' | 'open-account';
export type InvoiceIssueField = 'amount' | 'quantity' | 'unitPrice' | 'dueDate' | 'counterparty';

export interface InvoiceLineIssue {
  field: InvoiceIssueField;
  expected: string;
  invoiced: string;
  severity: BreakSeverity;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  type: InvoiceType;
  issuedAt: string;
  dueDate: string;
  deskId: DeskId;
  counterpartyId: string;
  sourceTradeId: string | null;
  sourceVoyageId: string | null;
  currency: 'USD';
  expectedAmountUsd: number;
  invoicedAmountUsd: number;
  paymentMethod: PaymentMethod;
  matchStatus: InvoiceMatchStatus;
  issues: InvoiceLineIssue[];
  acknowledged: boolean;
  acknowledgedNote: string | null;
  paid: boolean;
  paidAt: string | null;
}

export interface SettlementSnapshotPayload {
  invoices: Invoice[];
}

export interface AcknowledgeInvoiceInput {
  note?: string;
}

// --- Compliance / sanctions screening workflow tooling -------------------

export type ScreeningEntityType = 'counterparty' | 'vessel';
export type SanctionsListType = 'OFAC-SDN' | 'EU-Consolidated' | 'UN-Consolidated' | 'PEP' | 'Adverse-Media';
export type CaseStatus = 'open' | 'under-review' | 'escalated' | 'cleared' | 'blocked';
export type CasePriority = 'low' | 'medium' | 'high';

export interface ComplianceCase {
  id: string;
  createdAt: string;
  updatedAt: string;
  entityType: ScreeningEntityType;
  entityId: string;
  entityName: string;
  listType: SanctionsListType;
  matchedName: string;
  matchScore: number;
  status: CaseStatus;
  priority: CasePriority;
  assignedTo: string | null;
  relatedTradeId: string | null;
  relatedVoyageId: string | null;
}

export type CaseActivityAction = 'comment' | 'status-change' | 'assignment';

export interface CaseActivityEntry {
  id: string;
  caseId: string;
  author: string;
  action: CaseActivityAction;
  body: string;
  createdAt: string;
}

export interface ComplianceSnapshotPayload {
  cases: ComplianceCase[];
  activity: CaseActivityEntry[];
}

export interface UpdateCaseInput {
  status: CaseStatus;
  note?: string;
}

export interface AssignCaseInput {
  assignedTo: string;
}

export interface NewCaseCommentInput {
  body: string;
}

// --- Auth ----------------------------------------------------------------

export type UserRole = 'admin' | 'trader' | 'compliance' | 'settlements' | 'credit_risk';

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
}

export interface LoginInput {
  username: string;
  password: string;
}

export interface LoginResult {
  token: string;
  refreshToken: string;
  user: AuthUser;
}

export interface RefreshInput {
  refreshToken: string;
}

export interface RefreshResult {
  token: string;
  refreshToken: string;
  user: AuthUser;
}

// --- Audit trail -----------------------------------------------------------

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  role: UserRole;
  action: string;
  entityType: string;
  entityId: string;
  details: string | null;
}

export interface AuditSnapshotPayload {
  entries: AuditLogEntry[];
}

// --- Alerts ------------------------------------------------------------

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertCategory = 'credit' | 'compliance' | 'settlement' | 'reconciliation';

export interface AlertItem {
  id: string;
  createdAt: string;
  category: AlertCategory;
  severity: AlertSeverity;
  message: string;
  entityType: string;
  entityId: string;
}

export interface AlertSnapshotPayload {
  alerts: AlertItem[];
}

// --- Bring-your-own data (counterparty import) ----------------------------

export interface NewCounterpartyInput {
  name: string;
  tier: Counterparty['tier'];
  region: string;
}

export interface ImportCounterpartiesInput {
  counterparties: NewCounterpartyInput[];
}

// --- PnL history (persisted, survives server restart) ----------------------

export interface PnlSnapshotPoint {
  takenAt: string;
  deskId: DeskId;
  pnlUsd: number;
  netVolume: number;
}

export interface PnlHistoryPayload {
  points: PnlSnapshotPoint[];
}
