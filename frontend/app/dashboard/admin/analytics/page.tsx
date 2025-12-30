"use client";
import React, { useEffect, useState } from "react";
import Navbar from "@/app/components/Navbar";
import { AdminService } from "@/services/api/AdminService";
import { TrendingUp, Users, BookOpen, Activity } from "lucide-react";
import Loading from "@/app/loading";

export default function AdminAnalyticsPage() {
    const [analytics, setAnalytics] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const data = await AdminService.getAnalytics();
                setAnalytics(data);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        }
        load();
    }, []);

    if (loading) return <Loading />;

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
            <Navbar basePath="/dashboard/admin" userRole="admin" />
            <main className="max-w-[1440px] mx-auto px-6 lg:px-12 py-10 animate-fade-in">
                <div className="mb-12">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Analytics & Trends</h1>
                    <p className="text-slate-400 font-bold text-sm mt-1">Deep dive into organization performance.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white rounded-[40px] border border-slate-100 p-8 shadow-sm">
                        <h3 className="text-lg font-black text-slate-800 tracking-tight mb-8">Weekly Activity</h3>
                        <div className="h-64 flex items-end justify-between gap-2 px-2">
                            {analytics?.activity?.map((h: number, i: number) => (
                                <div key={i} className="flex-1 bg-[var(--brand)] rounded-t-xl relative group" style={{ height: `${h}%` }}>
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                        {h}%
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between mt-4 px-2">
                            {analytics?.labels?.map((d: string) => (
                                <span key={d} className="text-[10px] font-black text-slate-300 uppercase">{d}</span>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-6">
                            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <Users size={28} />
                            </div>
                            <div>
                                <h3 className="text-3xl font-black text-slate-800">{analytics?.registrations}</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">New Registrations This Week</p>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-6">
                            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                <Activity size={28} />
                            </div>
                            <div>
                                <h3 className="text-3xl font-black text-slate-800">{analytics?.examAttempts}</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Exam Attempts This Week</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
