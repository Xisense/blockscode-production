"use client";
import React, { useState } from "react";
import Navbar from "@/app/components/Navbar";
import { Search, Globe, Shield, Filter, Mail, Ban, CheckCircle2, MoreVertical, Building2, Users, UserCog } from "lucide-react";

export default function SuperAdminUsersPage() {
    const [searchQuery, setSearchQuery] = useState("");

    const users = [
        { id: "SYS-001", name: "Pawan Bista", role: "Super Admin", email: "pawan@codequotient.com", org: "Global", status: "Active" },
        { id: "USR-A1", name: "Amit Sharma", role: "Organization Admin", email: "amit@bcu.edu", org: "BlocksCode Univ.", status: "Active" },
        { id: "USR-T1", name: "Dr. Neha Gupta", role: "Instructor", email: "neha@ti.in", org: "Tech Institute", status: "Active" },
        { id: "USR-S1", name: "Rahul Verma", role: "Student", email: "rahul@dps.edu", org: "DPS School", status: "Suspended" },
    ];

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
            <Navbar />

            <main className="max-w-[1440px] mx-auto px-6 lg:px-12 py-10 animate-fade-in">
                <div className="flex items-center justify-between mb-12">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Global User Index</h1>
                        <p className="text-slate-400 font-bold text-sm mt-1">Universal user control across all platform tenants.</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row items-center gap-4 mb-8">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                        <input
                            type="text"
                            placeholder="Universal search by name, email, org or role..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-[var(--brand)] shadow-sm transition-all"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden min-h-[600px]">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">User Identity</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Auth Role</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Organization Tenant</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {users.map((u) => (
                                    <tr key={u.id} className="hover:bg-slate-50/30 transition-all group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-400 text-sm">
                                                    {u.name[0]}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-800">{u.name}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">{u.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${u.role === 'Super Admin' ? 'bg-[var(--brand)] text-white border-[var(--brand)]' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2 text-slate-600">
                                                <Building2 size={14} className="text-slate-300" />
                                                <span className="text-xs font-black uppercase tracking-wider">{u.org}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-1.5 h-1.5 rounded-full ${u.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${u.status === 'Active' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {u.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button className="p-2 text-slate-300 hover:text-[var(--brand)] hover:bg-slate-50 rounded-xl transition-all" title="Manage Permissions">
                                                    <UserCog size={18} />
                                                </button>
                                                <button className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" title="Force Suspension">
                                                    <Ban size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}
