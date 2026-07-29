import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Database from 'better-sqlite3';

const here = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.SCHEDULING_DB_PATH ?? path.join(here, '..', '..', 'scheduling.sqlite');

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS voyages (
    id TEXT PRIMARY KEY,
    vesselId TEXT NOT NULL,
    deskId TEXT NOT NULL,
    commodityId TEXT NOT NULL,
    counterpartyId TEXT NOT NULL,
    loadPortId TEXT NOT NULL,
    dischargePortId TEXT NOT NULL,
    transitDays REAL NOT NULL,
    laycanStart TEXT NOT NULL,
    laycanEnd TEXT NOT NULL,
    plannedLoadStart TEXT NOT NULL,
    plannedLoadEnd TEXT NOT NULL,
    plannedDischargeStart TEXT NOT NULL,
    plannedDischargeEnd TEXT NOT NULL,
    cargoVolume REAL NOT NULL,
    cargoUnit TEXT NOT NULL,
    freightRateBasis TEXT NOT NULL,
    freightRateUsd REAL NOT NULL,
    demurrageRateUsdPerDay REAL NOT NULL,
    dispatchRateUsdPerDay REAL NOT NULL,
    laytimeAllowedHours REAL NOT NULL,
    bunkerCostUsd REAL NOT NULL,
    portCostsUsd REAL NOT NULL,
    otherCostsUsd REAL NOT NULL,
    status TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS counterparty_profiles (
    counterpartyId TEXT PRIMARY KEY,
    creditLimitUsd REAL NOT NULL,
    kycStatus TEXT NOT NULL,
    kycRenewalDate TEXT NOT NULL,
    relationshipOwner TEXT NOT NULL,
    onboardedAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    counterpartyId TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS relationship_notes (
    id TEXT PRIMARY KEY,
    counterpartyId TEXT NOT NULL,
    author TEXT NOT NULL,
    body TEXT NOT NULL,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    passwordHash TEXT NOT NULL,
    displayName TEXT NOT NULL,
    role TEXT NOT NULL,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS counterparties (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    tier TEXT NOT NULL,
    region TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    receivedAt TEXT NOT NULL,
    fileName TEXT NOT NULL,
    docType TEXT NOT NULL,
    counterpartyId TEXT,
    voyageId TEXT,
    rawText TEXT NOT NULL,
    extractedJson TEXT NOT NULL,
    confidence REAL,
    status TEXT NOT NULL,
    issuesJson TEXT NOT NULL,
    reviewedBy TEXT,
    reviewedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    invoiceNumber TEXT NOT NULL,
    type TEXT NOT NULL,
    issuedAt TEXT NOT NULL,
    dueDate TEXT NOT NULL,
    deskId TEXT NOT NULL,
    counterpartyId TEXT NOT NULL,
    sourceTradeId TEXT,
    sourceVoyageId TEXT,
    currency TEXT NOT NULL,
    expectedAmountUsd REAL NOT NULL,
    invoicedAmountUsd REAL NOT NULL,
    paymentMethod TEXT NOT NULL,
    matchStatus TEXT NOT NULL,
    issuesJson TEXT NOT NULL,
    acknowledged INTEGER NOT NULL,
    acknowledgedNote TEXT,
    paid INTEGER NOT NULL,
    paidAt TEXT
  );

  CREATE TABLE IF NOT EXISTS compliance_cases (
    id TEXT PRIMARY KEY,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    entityType TEXT NOT NULL,
    entityId TEXT NOT NULL,
    entityName TEXT NOT NULL,
    listType TEXT NOT NULL,
    matchedName TEXT NOT NULL,
    matchScore REAL NOT NULL,
    status TEXT NOT NULL,
    priority TEXT NOT NULL,
    assignedTo TEXT,
    relatedTradeId TEXT,
    relatedVoyageId TEXT
  );

  CREATE TABLE IF NOT EXISTS case_activity (
    id TEXT PRIMARY KEY,
    caseId TEXT NOT NULL,
    author TEXT NOT NULL,
    action TEXT NOT NULL,
    body TEXT NOT NULL,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS confirmations (
    id TEXT PRIMARY KEY,
    channel TEXT NOT NULL,
    receivedAt TEXT NOT NULL,
    rawText TEXT NOT NULL,
    extractedJson TEXT NOT NULL,
    matchedTradeId TEXT,
    status TEXT NOT NULL,
    breaksJson TEXT NOT NULL,
    resolved INTEGER NOT NULL,
    resolutionNote TEXT,
    resolvedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS pnl_snapshots (
    id TEXT PRIMARY KEY,
    takenAt TEXT NOT NULL,
    deskId TEXT NOT NULL,
    pnlUsd REAL NOT NULL,
    netVolume REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    userId TEXT NOT NULL,
    username TEXT NOT NULL,
    role TEXT NOT NULL,
    action TEXT NOT NULL,
    entityType TEXT NOT NULL,
    entityId TEXT NOT NULL,
    details TEXT
  );
`);
