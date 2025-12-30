"use client";
import React, { useState } from "react";
import Link from "next/link";
import AlertModal from "@/app/components/Common/AlertModal";
import {
    PieChart, Pie, Cell, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';

interface Result {
    rollNo: string;
    name: string;
    email: string;
    section: string;
    submittedAt: string;
    timeTaken: string;
    attempted: string;
    score: number;
    totalPossible: number;
    status: "Passed" | "Failed";
}

interface ExamResultsViewProps {
    title?: string;
    examId: string;
    userRole?: 'admin' | 'teacher';
    basePath?: string;
}

export default function ExamResultsView({ title = "Exam Analysis", examId, userRole = 'teacher', basePath }: ExamResultsViewProps) {
    const [results, setResults] = useState<Result[]>([
        { rollNo: "2211981482", name: "sneha", email: "sneha@gmail.com", section: "Section F", submittedAt: "Dec 19, 10:01 PM", timeTaken: "2 min", attempted: "15 Q", score: 12, totalPossible: 30, status: "Failed" },
        { rollNo: "2211981485", name: "Amit Sharma", email: "amit@gmail.com", section: "Section A", submittedAt: "Dec 19, 10:15 PM", timeTaken: "45 min", attempted: "20 Q", score: 25, totalPossible: 30, status: "Passed" },
        { rollNo: "2211981490", name: "Rahul Verma", email: "rahul@gmail.com", section: "Section C", submittedAt: "Dec 19, 10:30 PM", timeTaken: "30 min", attempted: "18 Q", score: 22, totalPossible: 30, status: "Passed" },
    ]);

    const [isPublishing, setIsPublishing] = useState(false);
    const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean, title: string, message: string, type?: 'danger' | 'warning' | 'info' }>({ isOpen: false, title: '', message: '' });

    // Dynamic Data for Charts
    const passedCount = results.filter(r => r.status === "Passed").length;
    const failedCount = results.filter(r => r.status === "Failed").length;

    const brandColor = '#fc751b'; // Global Brand Orange
    const brandLightColor = 'var(--brand-light)';

    const pieData = [
        { name: 'Passed', value: passedCount, color: brandColor },
        { name: 'Failed', value: failedCount, color: '#f43f5e' },
    ];

    const distributionData = [
        { score: '0-10', count: 1 },
        { score: '10-20', count: 0 },
        { score: '20-30', count: 2 },
    ];

    const handlePublish = () => {
        setIsPublishing(true);
        setTimeout(() => {
            setIsPublishing(false);
            setAlertConfig({
                isOpen: true,
                title: "Results Published",
                message: "Exam results have been successfully shared with all students.",
                type: "info"
            });
        }, 1500);
    };

    const updateScore = (rollNo: string, newScore: string) => {
        const scoreVal = parseInt(newScore) || 0;
        setResults(prev => prev.map(r => {
            if (r.rollNo === rollNo) {
                const status = (scoreVal / r.totalPossible) >= 0.4 ? "Passed" : "Failed";
                return { ...r, score: scoreVal, status };
            }
            return r;
        }));
    };

    const backLink = basePath ? `${basePath}/exams` : (userRole === 'admin' ? "/dashboard/admin/exams" : "/dashboard/teacher/exams");

    return (
        <div className="min-h-screen bg-[#F8FAFC]">

            <main className="max-w-[1440px] mx-auto px-6 lg:px-12 py-8 animate-fade-in">
                {/* Compact Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h1>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Assessment ID: {examId}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href={backLink}>
                            <button className="p-3 bg-white border border-slate-100 text-slate-400 rounded-xl hover:text-slate-600 transition-all shadow-sm">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                            </button>
                        </Link>
                        <button
                            onClick={handlePublish}
                            className={`text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-all`}
                            style={{ backgroundColor: brandColor, boxShadow: `0 10px 15px -3px ${brandColor}40` }}
                        >
                            {isPublishing ? "Publishing..." : "Publish Results"}
                        </button>
                    </div>
                </div>

                {/* Insight Dashboard - Highly Compact */}
                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-6 mb-10">
                    {/* Score Distribution Pie */}
                    <div className="md:col-span-2 lg:col-span-2 bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pass/Fail Ratio</h3>
                            <span className="text-[10px] font-black px-2 py-1 rounded-lg" style={{ color: brandColor, backgroundColor: brandLightColor }}>Live</span>
                        </div>
                        <div className="h-40 w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={pieData} innerRadius={50} outerRadius={70} paddingAngle={8} dataKey="value">
                                        {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-2xl font-black text-slate-800 leading-none">{results.length}</span>
                                <span className="text-[8px] font-black text-slate-300 uppercase">Total</span>
                            </div>
                        </div>
                        <div className="mt-4 flex justify-center gap-6">
                            <MetricLabel color={brandColor} label="Pass" value={passedCount} />
                            <MetricLabel color="#f43f5e" label="Fail" value={failedCount} />
                        </div>
                    </div>

                    {/* Stats Tiles */}
                    <div className="lg:col-span-1 space-y-4">
                        <CompactStatTile label="Avg Score" value="72%" sub="Industry: 65%" trend="up" />
                        <CompactStatTile label="Time Taken" value="42m" sub="Expected: 35m" trend="down" />
                    </div>

                    {/* Performance Distribution Chart */}
                    <div className="md:col-span-2 lg:col-span-3 bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm flex flex-col">
                        <div className="flex items-center justify-between mb-6 px-2">
                            <div>
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Point Distribution</h3>
                                <p className="text-[8px] font-bold text-slate-300 uppercase">Student frequency per score bracket</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: brandColor }}></div>
                                    <span className="text-[9px] font-black text-slate-400 uppercase">Count</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 w-full min-h-[160px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={distributionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id={`barGradient-${userRole}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={brandColor} stopOpacity={1} />
                                            <stop offset="100%" stopColor={brandColor} stopOpacity={0.8} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="score"
                                        fontSize={10}
                                        fontWeight={700}
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8' }}
                                        dy={10}
                                    />
                                    <YAxis
                                        fontSize={10}
                                        fontWeight={700}
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#cbd5e1' }}
                                        allowDecimals={false}
                                    />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{
                                            borderRadius: '16px',
                                            border: 'none',
                                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                            fontSize: '10px',
                                            fontWeight: 'bold',
                                            textTransform: 'uppercase'
                                        }}
                                    />
                                    <Bar
                                        dataKey="count"
                                        fill={`url(#barGradient-${userRole})`}
                                        radius={[10, 10, 0, 0]}
                                        barSize={48}
                                        animationDuration={1500}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Submissions List */}
                <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                        <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-800">Student Submissions</h2>
                        <div className="flex items-center gap-3">
                            <div className="flex -space-x-2">
                                {results.map(r => (
                                    <div key={r.rollNo} className="w-6 h-6 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[8px] font-black text-slate-400 uppercase">
                                        {r.name[0]}
                                    </div>
                                ))}
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase">Total {results.length}</span>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="px-8 py-4 text-[9px] font-black uppercase tracking-tighter text-slate-400">Roll No & Student</th>
                                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-tighter text-slate-400">Section</th>
                                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-tighter text-slate-400">Submitted At</th>
                                    <th className="px-4 py-4 text-[9px] font-black uppercase tracking-tighter text-slate-400 text-center">Attempted</th>
                                    <th className="px-4 py-4 text-[9px] font-black uppercase tracking-tighter text-slate-400 text-center">Score</th>
                                    <th className="px-4 py-4 text-[9px] font-black uppercase tracking-tighter text-slate-400 text-center">Status</th>
                                    <th className="px-8 py-4 text-[9px] font-black uppercase tracking-tighter text-slate-400 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {results.map((r) => (
                                    <tr key={r.rollNo} className="hover:bg-slate-50/20 transition-colors">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center font-black text-[10px] text-slate-400">
                                                    {r.name[0]}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-slate-800 leading-none mb-1">{r.name}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase">{r.rollNo}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-[10px] font-bold text-slate-500">{r.section}</td>
                                        <td className="px-6 py-5">
                                            <p className="text-[10px] font-black text-slate-700 leading-none mb-1">{r.submittedAt}</p>
                                            <p className="text-[9px] font-bold text-slate-300 uppercase">{r.timeTaken} Taken</p>
                                        </td>
                                        <td className="px-4 py-5 text-center text-xs font-black text-slate-700">{r.attempted}</td>
                                        <td className="px-4 py-5 text-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <input
                                                    type="text"
                                                    className={`w-10 py-1 bg-slate-50 border border-slate-100 rounded text-center text-[11px] font-black outline-none shadow-inner`}
                                                    style={{ color: brandColor, borderColor: '#e2e8f0' }}
                                                    onFocus={(e) => e.target.style.borderColor = brandColor}
                                                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                                                    value={r.score}
                                                    onChange={(e) => updateScore(r.rollNo, e.target.value)}
                                                />
                                                <span className="text-[10px] font-bold text-slate-300">/ {r.totalPossible}</span>
                                            </div>
                                            <p className="text-[8px] font-black text-slate-400 mt-1 uppercase">
                                                {((r.score / r.totalPossible) * 100).toFixed(0)}%
                                            </p>
                                        </td>
                                        <td className="px-4 py-5 text-center">
                                            <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider ${r.status === 'Passed' ? 'bg-[var(--brand-light)] text-[var(--brand)]' : 'bg-rose-50 text-rose-600'}`}>
                                                {r.status}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <Link href={`/dashboard/teacher/exams/${examId}/submission/${r.rollNo}/preview`}>
                                                <button className="text-[9px] font-black uppercase text-slate-400 hover:text-[var(--brand)] transition-colors">
                                                    Preview →
                                                </button>
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <AlertModal
                    isOpen={alertConfig.isOpen}
                    title={alertConfig.title}
                    message={alertConfig.message}
                    type={alertConfig.type || "info"}
                    confirmLabel="Close"
                    onConfirm={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
                    onCancel={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
                />
            </main>
        </div>
    );
}

function MetricLabel({ color, label, value }: any) {
    return (
        <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full`} style={{ backgroundColor: color }}></div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
            <span className="text-xs font-black text-slate-800">{value}</span>
        </div>
    )
}

function CompactStatTile({ label, value, sub, trend }: any) {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm group hover:border-[var(--brand-light)] transition-all">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
            <div className="flex items-end gap-2">
                <p className="text-xl font-black text-slate-800 leading-none">{value}</p>
                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${trend === 'up' ? 'text-emerald-500 bg-emerald-50' : trend === 'down' ? 'text-rose-500 bg-rose-50' : 'text-slate-400 bg-slate-50'}`}>
                    {trend === 'up' ? '▲' : '▼'} 2%
                </span>
            </div>
            <p className="text-[8px] font-bold text-slate-300 uppercase mt-2">{sub}</p>
        </div>
    )
}
