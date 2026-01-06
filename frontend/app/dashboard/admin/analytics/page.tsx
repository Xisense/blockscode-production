import React from "react";
import Navbar from "@/app/components/Navbar";
import { TrendingUp, Users, BookOpen, Activity } from "lucide-react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Server Component Data Fetching
async function getAnalyticsData() {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) return null;

    const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
    try {
        const res = await fetch(`${BASE_URL}/admin/stats`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            cache: 'no-store' // Ensure fresh data on every request
        });
        
        if (!res.ok) return null;
        return res.json();
    } catch (e) {
        console.error("Failed to fetch analytics", e);
        return null;
    }
}

export default async function AdminAnalyticsPage() {
    const analytics = await getAnalyticsData();

    if (!analytics) {
        // Fallback or redirect if session invalid
        // redirect('/login'); // Optional: Uncomment to enforce auth
    }

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
                            {!analytics?.activity && <div className="w-full text-center text-slate-400 text-sm mt-20">No activity data available</div>}
                        </div>
                        <div className="flex justify-between mt-4 px-2">
                            {analytics?.labels?.map((d: string) => (
                                <span key={d} className="text-[10px] font-black text-slate-300 uppercase">{d}</span>
                            )) || <span className="text-xs text-slate-300">Mon - Sun</span>}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-6">
                            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <Users size={28} />
                            </div>
                            <div>
                                <h3 className="text-3xl font-black text-slate-800">{analytics?.registrations || 0}</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">New Registrations This Week</p>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-6">
                            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                <Activity size={28} />
                            </div>
                            <div>
                                <h3 className="text-3xl font-black text-slate-800">{analytics?.examAttempts || 0}</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Exam Attempts This Week</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
