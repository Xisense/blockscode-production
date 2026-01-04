"use client";
import React from 'react';
import { CheckCircle2, AlertCircle, X, Mail, UserCheck, AlertTriangle } from 'lucide-react';

interface BulkImportReportProps {
    isOpen: boolean;
    onClose: () => void;
    report: {
        summary: {
            totalProcessed: number;
            created: number;
            failed: number;
            emailsSent?: number;
            emailsFailed?: number;
        };
        details: any[];
    } | null;
}

export default function BulkImportReportModal({ isOpen, onClose, report }: BulkImportReportProps) {
    if (!isOpen || !report) return null;

    const { summary, details } = report;
    const hasFailures = summary.failed > 0 || (summary.emailsFailed || 0) > 0;

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />

            <div className="relative bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100 flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="p-8 pb-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-2">Import Report</h2>
                        <p className="text-sm font-medium text-slate-500">
                            Processed {summary.totalProcessed} users from CSV
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-300 hover:text-slate-900 transition-colors rounded-full hover:bg-slate-100">
                        <X size={24} />
                    </button>
                </div>

                {/* Summary Stats */}
                <div className="p-8 pb-4 grid grid-cols-2 gap-4">
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                            <UserCheck size={24} />
                        </div>
                        <div>
                            <div className="text-2xl font-black text-emerald-700">{summary.created}</div>
                            <div className="text-xs font-bold uppercase tracking-wider text-emerald-600/70">Successful</div>
                        </div>
                    </div>
                    
                    {summary.emailsSent !== undefined && (
                        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                <Mail size={24} />
                            </div>
                            <div>
                                <div className="text-2xl font-black text-blue-700">{summary.emailsSent}</div>
                                <div className="text-xs font-bold uppercase tracking-wider text-blue-600/70">Emails Sent</div>
                            </div>
                        </div>
                    )}

                    {(summary.failed > 0 || (summary.emailsFailed || 0) > 0) && (
                        <div className="col-span-2 bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                                <AlertTriangle size={24} />
                            </div>
                            <div className="flex gap-8">
                                {summary.failed > 0 && (
                                    <div>
                                        <div className="text-2xl font-black text-rose-700">{summary.failed}</div>
                                        <div className="text-xs font-bold uppercase tracking-wider text-rose-600/70">Failed</div>
                                    </div>
                                )}
                                {(summary.emailsFailed || 0) > 0 && (
                                    <div>
                                        <div className="text-2xl font-black text-rose-700">{summary.emailsFailed}</div>
                                        <div className="text-xs font-bold uppercase tracking-wider text-rose-600/70">Failed Emails</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Detailed List */}
                <div className="flex-1 overflow-y-auto p-8 pt-0">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 sticky top-0 bg-white py-4 border-b border-slate-100">
                        Detailed Log
                    </h3>
                    <div className="space-y-3">
                        {details.map((item, idx) => (
                            <div key={idx} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 text-sm">
                                {item.success ? (
                                    <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={18} />
                                ) : (
                                    <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={18} />
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-slate-700 truncate">
                                        {item.user?.email || item.email}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">
                                        {item.success ? (
                                            <span className="flex items-center gap-2">
                                                <span>User created.</span>
                                                {item.emailSent ? (
                                                    <span className="text-blue-600 flex items-center gap-1">
                                                        <Mail size={12} /> Email sent
                                                    </span>
                                                ) : (
                                                    <span className="text-rose-500 flex items-center gap-1">
                                                        <AlertCircle size={12} /> Email failed
                                                    </span>
                                                )}
                                            </span>
                                        ) : (
                                            <span className="text-rose-500">{item.error}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                    >
                        Close Report
                    </button>
                </div>
            </div>
        </div>
    );
}
