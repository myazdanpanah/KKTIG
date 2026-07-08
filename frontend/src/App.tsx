import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import LoginPage from './pages/LoginPage'
import LauncherPage from './pages/LauncherPage'
import DashboardListPage from './pages/DashboardListPage'
import DashboardBuilderPage from './pages/DashboardBuilderPage'
import DataUploadPage from './pages/DataUploadPage'
import AdminSettingsPage from './pages/AdminSettingsPage'
import DashboardAssignPage from './pages/DashboardAssignPage'
import OrganizationPage from './pages/OrganizationPage'
import OrgChartPage from './pages/OrgChartPage'
import DatabaseManagerPage from './pages/DatabaseManagerPage'
import TableEditorPage from './pages/TableEditorPage'
import SchemaEditorPage from './pages/SchemaEditorPage'
import SqlEditorPage from './pages/SqlEditorPage'
import FileImportPage from './pages/FileImportPage'
import ExternalDbPage from './pages/ExternalDbPage'
import SheetsSyncPage from './pages/SheetsSyncPage'
import SettingsPage from './pages/SettingsPage'
import { FinanceShell, FinanceDashboard, PayersPage, InvoicesPage, PaymentsPage, DebtsCreditsPage, ApprovalsPage, ItemTypesPage, FinanceSettingsPage, TemplateEditorPage, ReportDesignerPage, FileTemplatesPage, GeneratedFilesPage, CompanySettingsPage } from './pages/finance'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<PrivateRoute><LauncherPage /></PrivateRoute>} />
      {/* Nexivo module */}
      <Route path="/dashboards" element={<PrivateRoute><DashboardListPage /></PrivateRoute>} />
      <Route path="/dashboards/:id" element={<PrivateRoute><DashboardBuilderPage /></PrivateRoute>} />
      <Route path="/data/upload" element={<PrivateRoute><DataUploadPage /></PrivateRoute>} />
      <Route path="/admin/users" element={<PrivateRoute><AdminSettingsPage /></PrivateRoute>} />
      <Route path="/admin/assignments" element={<PrivateRoute><DashboardAssignPage /></PrivateRoute>} />
      <Route path="/admin/org" element={<PrivateRoute><OrganizationPage /></PrivateRoute>} />
      <Route path="/org-chart" element={<PrivateRoute><OrgChartPage /></PrivateRoute>} />
      <Route path="/db-manager" element={<PrivateRoute><DatabaseManagerPage /></PrivateRoute>} />
      <Route path="/db-manager/table/:source/:table" element={<PrivateRoute><TableEditorPage /></PrivateRoute>} />
      <Route path="/db-manager/table/:source/:table/schema" element={<PrivateRoute><SchemaEditorPage /></PrivateRoute>} />
      <Route path="/db-manager/table/:source/:table/import" element={<PrivateRoute><FileImportPage /></PrivateRoute>} />
      <Route path="/db-manager/sql" element={<PrivateRoute><SqlEditorPage /></PrivateRoute>} />
      <Route path="/db-manager/syncs" element={<PrivateRoute><SheetsSyncPage /></PrivateRoute>} />
      <Route path="/db-manager/connections" element={<PrivateRoute><ExternalDbPage /></PrivateRoute>} />
      {/* Finance module */}
      <Route path="/finance" element={<PrivateRoute><FinanceShell /></PrivateRoute>}>
        <Route index element={<FinanceDashboard />} />
        <Route path="payers" element={<PayersPage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="debts" element={<DebtsCreditsPage />} />
        <Route path="approvals" element={<ApprovalsPage />} />
        <Route path="item-types" element={<ItemTypesPage />} />
        <Route path="templates" element={<TemplateEditorPage />} />
        <Route path="report-designer" element={<ReportDesignerPage />} />
        <Route path="file-templates" element={<FileTemplatesPage />} />
        <Route path="generated-files" element={<GeneratedFilesPage />} />
        <Route path="settings" element={<FinanceSettingsPage />} />
        <Route path="company" element={<CompanySettingsPage />} />
      </Route>
      <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
