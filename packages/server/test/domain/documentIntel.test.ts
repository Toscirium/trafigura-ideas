import { describe, expect, it } from 'vitest';
import { validateBillOfLading, validateCharterParty, validateLetterOfCredit } from '../../src/domain/documentIntel.js';
import { makeVoyage } from '../fixtures.js';
import type { BillOfLadingFields, CharterPartyFields, LetterOfCreditFields, Trade } from 'shared';

function makeBolFields(overrides: Partial<BillOfLadingFields> = {}): BillOfLadingFields {
  return {
    vesselName: 'Horizon Star',
    shipper: 'Meridian Trading SA',
    consignee: 'Sinopec',
    cargoDescription: 'WTI Crude',
    cargoQuantity: 2_000_000,
    cargoUnit: 'bbl',
    portOfLoading: 'Ras Tanura',
    portOfDischarge: 'Ningbo',
    dateOfIssue: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('validateBillOfLading', () => {
  it('raises no issues when quantity and consignee match the voyage', () => {
    const voyage = makeVoyage();
    const issues = validateBillOfLading(makeBolFields(), voyage);
    expect(issues).toHaveLength(0);
  });

  it('flags a critical quantity discrepancy over 5%', () => {
    const voyage = makeVoyage({ cargoVolume: 2_000_000 });
    const issues = validateBillOfLading(makeBolFields({ cargoQuantity: 1_800_000 }), voyage);
    expect(issues).toContainEqual(expect.objectContaining({ field: 'cargoQuantity', severity: 'critical' }));
  });

  it('flags only a warning for a smaller (1-5%) quantity discrepancy', () => {
    const voyage = makeVoyage({ cargoVolume: 2_000_000 });
    const issues = validateBillOfLading(makeBolFields({ cargoQuantity: 1_960_000 }), voyage);
    expect(issues).toContainEqual(expect.objectContaining({ field: 'cargoQuantity', severity: 'warning' }));
  });

  it('flags a consignee mismatch against the voyage counterparty', () => {
    const voyage = makeVoyage({ counterpartyId: 'cp-sinopec' });
    const issues = validateBillOfLading(makeBolFields({ consignee: 'Some Other Company' }), voyage);
    expect(issues).toContainEqual(expect.objectContaining({ field: 'consignee' }));
  });
});

describe('validateLetterOfCredit', () => {
  const trade: Trade = { id: 't1', timestamp: '2026-08-01T00:00:00.000Z', deskId: 'crude', commodityId: 'WTI', counterpartyId: 'cp-sinopec', side: 'BUY', volume: 1000, price: 80 };

  function makeLcFields(overrides: Partial<LetterOfCreditFields> = {}): LetterOfCreditFields {
    return {
      lcNumber: 'LC123',
      issuingBank: 'ICBC',
      applicant: 'Sinopec',
      beneficiary: 'Meridian Trading SA',
      amountUsd: trade.volume * trade.price,
      expiryDate: '2026-09-01T00:00:00.000Z',
      latestShipmentDate: '2026-08-15T00:00:00.000Z',
      commodityDescription: 'WTI Crude',
      ...overrides,
    };
  }

  it('raises no issues when the LC covers the trade value and dates are sane', () => {
    expect(validateLetterOfCredit(makeLcFields(), trade)).toHaveLength(0);
  });

  it('flags a critical shortfall when the LC amount is below the trade value', () => {
    const issues = validateLetterOfCredit(makeLcFields({ amountUsd: trade.volume * trade.price * 0.5 }), trade);
    expect(issues).toContainEqual(expect.objectContaining({ field: 'amountUsd', severity: 'critical' }));
  });

  it('flags an expiry date before the latest shipment date', () => {
    const issues = validateLetterOfCredit(
      makeLcFields({ expiryDate: '2026-08-01T00:00:00.000Z', latestShipmentDate: '2026-08-15T00:00:00.000Z' }),
      trade,
    );
    expect(issues).toContainEqual(expect.objectContaining({ field: 'expiryDate' }));
  });

  it('skips the amount check entirely when there is no related trade', () => {
    const issues = validateLetterOfCredit(makeLcFields({ amountUsd: 1 }), undefined);
    expect(issues.find((i) => i.field === 'amountUsd')).toBeUndefined();
  });
});

describe('validateCharterParty', () => {
  function makeCpFields(overrides: Partial<CharterPartyFields> = {}): CharterPartyFields {
    return {
      vesselName: 'Horizon Star',
      charterer: 'Meridian Trading SA',
      owner: 'Owner Co',
      laycanStart: '2026-08-01T00:00:00.000Z',
      laycanEnd: '2026-08-05T00:00:00.000Z',
      freightRateUsd: 4_200_000,
      demurrageRateUsdPerDay: 65_000,
      loadPort: 'Ras Tanura',
      dischargePort: 'Ningbo',
      ...overrides,
    };
  }

  it('raises no issues when the freight rate matches the fixed voyage rate', () => {
    const voyage = makeVoyage({ freightRateUsd: 4_200_000 });
    expect(validateCharterParty(makeCpFields({ freightRateUsd: 4_200_000 }), voyage)).toHaveLength(0);
  });

  it('flags a critical freight mismatch over 8%', () => {
    const voyage = makeVoyage({ freightRateUsd: 4_200_000 });
    const issues = validateCharterParty(makeCpFields({ freightRateUsd: 3_500_000 }), voyage);
    expect(issues).toContainEqual(expect.objectContaining({ field: 'freightRateUsd', severity: 'critical' }));
  });
});
