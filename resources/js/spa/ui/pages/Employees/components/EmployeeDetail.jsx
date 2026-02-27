import React from 'react';
import { Icon } from '../../../shared/Icon.jsx';

function StatusBadge({ status }) {
    const configs = {
        active: { text: 'text-green-700', bg: 'bg-green-50', dot: 'bg-green-500' },
        on_leave: { text: 'text-amber-700', bg: 'bg-amber-50', dot: 'bg-amber-500' },
        suspended: { text: 'text-red-700', bg: 'bg-red-50', dot: 'bg-red-500' },
    };
    const config = configs[status] || configs.active;
    const label = status === 'active' ? 'Active' : status === 'on_leave' ? 'On Leave' : 'Suspended';
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text} border border-slate-200`}>
            <span className={`w-1.5 h-1.5 rounded-full ${config.dot} mr-1.5`} />
            {label}
        </span>
    );
}

function DeviceStatus({ bound }) {
    return bound ? (
        <div className="flex items-center gap-1 text-green-600">
            <Icon name="checkCircle" className="h-4 w-4" />
            <span className="text-xs">Bound</span>
        </div>
    ) : (
        <div className="flex items-center gap-1 text-amber-600">
            <Icon name="alertCircle" className="h-4 w-4" />
            <span className="text-xs">Pending</span>
        </div>
    );
}

function normalizeDate(value) {
    const s = String(value ?? '').trim();
    if (s === '') return '';
    return s.length >= 10 ? s.slice(0, 10) : s;
}

export function EmployeeDetail({ employee, onClose, onEdit }) {
    return (
        <div
            className="fixed inset-0 z-50 bg-black/40 p-4"
            onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="ml-auto h-full w-full max-w-md rounded-lg bg-white shadow-xl flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Icon name="user" className="h-5 w-5 text-[#0a1f43]" /> Employee Profile
                    </h3>
                    <div className="flex items-center gap-3">
                        <button className="text-xs text-[#0a1f43] font-medium hover:underline" onClick={onEdit}>Edit Profile</button>
                        <button type="button" className="text-slate-500 hover:text-slate-700" onClick={onClose} aria-label="Close">✕</button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto">
                    {/* Profile Header */}
                    <div className="p-6 border-b border-slate-200">
                        <div className="flex items-center gap-4">
                            {employee.photo_path
                                ? <img src={employee.photo_path} alt="" className="w-10 h-10 rounded-full object-cover" />
                                : <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-sm font-medium text-slate-700">{employee.initials || '—'}</div>
                            }
                            <div>
                                <h4 className="font-bold text-slate-800">{employee.full_name || employee.name}</h4>
                                <p className="text-sm text-slate-500">{employee.job_title || '—'}</p>
                                <StatusBadge status={employee.status || 'active'} />
                            </div>
                        </div>
                    </div>

                    {/* Contact Info */}
                    <div className="p-4 border-b border-slate-200 space-y-3">
                        {[
                            { icon: 'mail', value: employee.email },
                            { icon: 'phone', value: employee.phone },
                            { icon: 'mapPin', value: employee.branch_name || employee.branch?.name },
                            { icon: 'calendar', label: 'Hired', value: normalizeDate(employee.hire_date) },
                        ].map(({ icon, label, value }) => (
                            <div key={icon} className="flex items-center gap-3 text-sm">
                                <Icon name={icon} className="h-4 w-4 text-slate-400" />
                                <span className="text-slate-600">{label ? `${label}: ${value || '—'}` : (value || '—')}</span>
                            </div>
                        ))}
                    </div>

                    {/* Attendance Stats */}
                    <div className="p-4 border-b border-slate-200">
                        <h5 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                            <Icon name="activity" className="h-4 w-4 text-[#0a1f43]" /> This Month Attendance
                        </h5>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { label: 'Present', value: employee.present_days || 0, color: 'green' },
                                { label: 'Late', value: employee.late_days || 0, color: 'amber' },
                                { label: 'Absent', value: employee.absent_days || 0, color: 'red' },
                            ].map(({ label, value, color }) => (
                                <div key={label} className={`text-center p-2 bg-${color}-50 rounded`}>
                                    <p className={`text-lg font-bold text-${color}-600`}>{value}</p>
                                    <p className={`text-xs text-${color}-700`}>{label}</p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-3 text-xs text-slate-500">
                            Compliance Score: <span className="font-semibold text-[#0a1f43]">{employee.compliance_score || '98'}%</span>
                        </div>
                    </div>

                    {/* Device Info */}
                    <div className="p-4 border-b border-slate-200">
                        <h5 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                            <Icon name="smartphone" className="h-4 w-4 text-[#0a1f43]" /> Registered Device
                        </h5>
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#0a1f43]/10 flex items-center justify-center">
                                    <Icon name="smartphone" className="h-4 w-4 text-[#0a1f43]" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-700">{employee.device_name || '—'}</p>
                                    <p className="text-xs text-slate-500">ID: {employee.device_id || '—'}</p>
                                </div>
                            </div>
                            <DeviceStatus bound={Boolean(employee.device_bound)} />
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="p-4">
                        <h5 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                            <Icon name="clock" className="h-4 w-4 text-[#0a1f43]" /> Recent Activity
                        </h5>
                        <div className="space-y-3">
                            {Array.isArray(employee.recent_activity) && employee.recent_activity.length > 0 ? (
                                employee.recent_activity.map((activity, idx) => (
                                    <div key={idx} className="flex items-start gap-3">
                                        <div className={`w-2 h-2 rounded-full mt-1.5 ${String(activity.action || '').includes('Late') ? 'bg-amber-500' : String(activity.action || '').includes('Out') ? 'bg-slate-400' : 'bg-green-500'}`} />
                                        <div className="flex-1">
                                            <p className="text-sm text-slate-700">{activity.action || '—'}</p>
                                            <p className="text-xs text-slate-500">{activity.time || '—'} • {activity.location || '—'}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-sm text-slate-500">No activity yet.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
