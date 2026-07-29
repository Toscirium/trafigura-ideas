import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell.js';
import { ExposureView } from './components/exposure/ExposureView.js';
import { PnlView } from './components/pnl/PnlView.js';
import { SchedulingView } from './components/scheduling/SchedulingView.js';
import { ReconciliationView } from './components/reconciliation/ReconciliationView.js';
import { CrmView } from './components/crm/CrmView.js';
import { DocumentsView } from './components/documents/DocumentsView.js';
import { SettlementView } from './components/settlement/SettlementView.js';
import { ComplianceView } from './components/compliance/ComplianceView.js';
import { AuditView } from './components/audit/AuditView.js';
import { LoginView } from './components/auth/LoginView.js';
import { RoleGuard } from './components/auth/RoleGuard.js';
import { useAuthStore } from './store/useAuthStore.js';
import { useSocket } from './ws/useSocket.js';
import { defaultRouteForRole } from './domain/access.js';

export function App() {
  const user = useAuthStore((s) => s.user);
  useSocket();

  if (!user) return <LoginView />;

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to={defaultRouteForRole(user.role)} replace />} />
        <Route
          path="/exposure"
          element={
            <RoleGuard path="/exposure">
              <ExposureView />
            </RoleGuard>
          }
        />
        <Route
          path="/pnl"
          element={
            <RoleGuard path="/pnl">
              <PnlView />
            </RoleGuard>
          }
        />
        <Route
          path="/scheduling"
          element={
            <RoleGuard path="/scheduling">
              <SchedulingView />
            </RoleGuard>
          }
        />
        <Route
          path="/reconciliation"
          element={
            <RoleGuard path="/reconciliation">
              <ReconciliationView />
            </RoleGuard>
          }
        />
        <Route
          path="/counterparties"
          element={
            <RoleGuard path="/counterparties">
              <CrmView />
            </RoleGuard>
          }
        />
        <Route
          path="/documents"
          element={
            <RoleGuard path="/documents">
              <DocumentsView />
            </RoleGuard>
          }
        />
        <Route
          path="/settlement"
          element={
            <RoleGuard path="/settlement">
              <SettlementView />
            </RoleGuard>
          }
        />
        <Route
          path="/compliance"
          element={
            <RoleGuard path="/compliance">
              <ComplianceView />
            </RoleGuard>
          }
        />
        <Route
          path="/audit"
          element={
            <RoleGuard path="/audit">
              <AuditView />
            </RoleGuard>
          }
        />
      </Routes>
    </AppShell>
  );
}
