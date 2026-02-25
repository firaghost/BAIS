import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { Shell } from './Shell.jsx';
import { RequireAuth } from './auth/RequireAuth.jsx';
import { LoginPage } from './pages/Login/index.jsx';
import { DashboardPage } from './pages/Dashboard/index.jsx';
import { AttendancePage } from './pages/Attendance/index.jsx';
import { LeavesPage } from './pages/Leaves/index.jsx';
import { PayrollPage } from './pages/Payroll/index.jsx';
import { AuditPage } from './pages/Audit/index.jsx';
import { CorrectionsPage } from './pages/Corrections/index.jsx';
import { ShiftSchedulesPage } from './pages/ShiftSchedules/index.jsx';
import { BranchesPage } from './pages/Branches/index.jsx';
import { EmployeesPage } from './pages/Employees/index.jsx';
import { ReportsPage } from './pages/Reports/index.jsx';
import { SettingsPage } from './pages/Settings/index.jsx';

export function App() {
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<RequireAuth />}>{/* Protected */}
                <Route element={<Shell />}>
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/branches" element={<BranchesPage />} />
                    <Route path="/employees" element={<EmployeesPage />} />
                    <Route path="/attendance" element={<AttendancePage />} />
                    <Route path="/leaves" element={<LeavesPage />} />
                    <Route path="/payroll" element={<PayrollPage />} />
                    <Route path="/audit" element={<AuditPage />} />
                    <Route path="/corrections" element={<CorrectionsPage />} />
                    <Route path="/shift-schedules" element={<ShiftSchedulesPage />} />
                    <Route path="/reports" element={<ReportsPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                </Route>
            </Route>
        </Routes>
    );
}
