import type { CasePriority, CaseStatus, ComplianceCase } from 'shared';

export const CASE_STATUS_LABEL: Record<CaseStatus, string> = {
  open: 'Open',
  'under-review': 'Under review',
  escalated: 'Escalated',
  cleared: 'Cleared',
  blocked: 'Blocked',
};

export const CASE_PRIORITY_LABEL: Record<CasePriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export const OPEN_CASE_STATUSES: CaseStatus[] = ['open', 'under-review', 'escalated'];

export const ALL_CASE_STATUSES: CaseStatus[] = ['open', 'under-review', 'escalated', 'cleared', 'blocked'];

export const COMPLIANCE_OFFICERS = ['Priya Nair', 'Daniel Osei', 'Helena Kruger', 'Ben Whitmore'];

export function isOpenCase(status: CaseStatus): boolean {
  return OPEN_CASE_STATUSES.includes(status);
}

export function sortByCreatedDesc(cases: ComplianceCase[]): ComplianceCase[] {
  return [...cases].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}
