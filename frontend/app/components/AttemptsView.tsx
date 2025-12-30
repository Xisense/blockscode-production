"use client";
import React, { useState } from 'react';

export interface Attempt {
    id: string;
    timestamp: string;
    testCases: string;
    status: 'success' | 'failed' | 'error';
    answer?: any; // The answer submitted in this attempt
}

const defaultAttempts: Attempt[] = [
    { id: '1', timestamp: '2/1/2023 | 11:01 AM', testCases: '1 / 1', status: 'success', answer: 'console.log("Success");' },
    { id: '2', timestamp: '2/1/2023 | 11:01 AM', testCases: '0 / 1', status: 'failed', answer: 'console.log("Fail");' },
    // ... other defaults updated if needed, but these are just mocks
];

interface AttemptsViewProps {
    attempts?: Attempt[];
    hideFilter?: boolean;
    onSelect?: (attempt: Attempt) => void;
    selectedAttemptId?: string;
}

export default function AttemptsView({
    attempts = defaultAttempts,
    hideFilter = false,
    onSelect,
    selectedAttemptId
}: AttemptsViewProps) {
    const [filter, setFilter] = useState<'all' | 'failed' | 'success' | 'error'>('all');

    const counts = {
        all: attempts.length,
        failed: attempts.filter(a => a.status === 'failed').length,
        success: attempts.filter(a => a.status === 'success').length,
        error: attempts.filter(a => a.status === 'error').length,
    };

    const filteredAttempts = attempts.filter(a => filter === 'all' || a.status === filter);

    return (
        <div className="flex flex-col h-full bg-white overflow-hidden">
            {/* Dropdown Filter Header */}
            {!hideFilter && (
                <div className="px-8 py-5 border-b border-slate-50 bg-slate-50/20 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Filter Attempts</span>
                    <div className="relative inline-block w-56 group">
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value as any)}
                            className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-[12px] font-bold text-slate-700 cursor-pointer outline-none hover:border-[var(--brand)] hover:shadow-sm transition-all focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-lighter)]"
                        >
                            <option value="all">ALL ({counts.all})</option>
                            <option value="failed">Failed ({counts.failed})</option>
                            <option value="success">Successful ({counts.success})</option>
                            <option value="error">Compile error ({counts.error})</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 transition-transform group-hover:text-[var(--brand)]">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                        </div>
                    </div>
                </div>
            )}

            {/* Table Header */}
            <div className="flex px-8 py-4 border-b border-slate-100 text-[11px] font-black uppercase tracking-widest text-slate-400">
                <div className="flex-[2]">Attempts</div>
                <div className="flex-1 text-center">Test cases</div>
                <div className="flex-1 text-right">Status</div>
            </div>

            {/* Attempts List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {filteredAttempts.map((attempt) => (
                    <div
                        key={attempt.id}
                        onClick={() => onSelect?.(attempt)}
                        className={`
                            flex px-8 py-4 border-b border-slate-50 transition-all group cursor-pointer
                            ${selectedAttemptId === attempt.id ? 'bg-indigo-50/50 border-indigo-100' : 'hover:bg-slate-50'}
                        `}
                    >
                        <div className="flex-[2] flex flex-col gap-1">
                            <span className="text-[13px] font-medium text-slate-600">
                                {attempt.timestamp}
                            </span>
                            {selectedAttemptId === attempt.id && (
                                <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 w-fit px-1.5 py-0.5 rounded-md border border-indigo-100">
                                    Viewing Now
                                </span>
                            )}
                        </div>
                        <div className={`flex-1 text-center text-[13px] font-bold ${attempt.status === 'success' ? 'text-emerald-500' : 'text-rose-400'}`}>
                            {attempt.testCases}
                        </div>
                        <div className={`flex-1 text-right text-[13px] font-bold capitalize ${attempt.status === 'success' ? 'text-emerald-500' :
                            attempt.status === 'failed' ? 'text-rose-500' : 'text-orange-500'
                            }`}>
                            {attempt.status}
                        </div>
                    </div>
                ))}
            </div>

        </div>
    );
}
