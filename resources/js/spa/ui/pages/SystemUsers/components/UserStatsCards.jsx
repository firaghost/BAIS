import React from 'react';
import { NavLink } from 'react-router-dom';
import { Icon } from '../../../shared/Icon.jsx';

export function UserStatsCards() {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-soft border border-slate-200 group hover:border-[#0a1f43] transition-colors">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-colors">
                        <Icon name="shield" className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold text-slate-800">Role Templates</h3>
                </div>
                <p className="text-sm text-slate-500 mb-4 leading-relaxed">Review or edit standard permission sets for common administrative roles.</p>
                <NavLink className="text-sm font-bold text-[#0a1f43] hover:underline inline-flex items-center gap-1" to="/settings">
                    Manage Role Permissions
                    <Icon name="arrowRight" className="h-4 w-4" />
                </NavLink>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-soft border border-slate-200 group hover:border-[#0a1f43] transition-colors">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 group-hover:bg-amber-100 transition-colors">
                        <Icon name="history" className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold text-slate-800">Audit Access</h3>
                </div>
                <p className="text-sm text-slate-500 mb-4 leading-relaxed">View a detailed log of all changes made to system users and their assigned roles.</p>
                <NavLink className="text-sm font-bold text-[#0a1f43] hover:underline inline-flex items-center gap-1" to="/audit">
                    View Access Logs
                    <Icon name="arrowRight" className="h-4 w-4" />
                </NavLink>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-soft border border-slate-200 group hover:border-[#0a1f43] transition-colors">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-green-600 group-hover:bg-green-100 transition-colors">
                        <Icon name="key" className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold text-slate-800">Security Controls</h3>
                </div>
                <p className="text-sm text-slate-500 mb-4 leading-relaxed">Manage MFA requirements and session policies specifically for system admins.</p>
                <NavLink className="text-sm font-bold text-[#0a1f43] hover:underline inline-flex items-center gap-1" to="/settings">
                    Security Dashboard
                    <Icon name="arrowRight" className="h-4 w-4" />
                </NavLink>
            </div>
        </div>
    );
}
