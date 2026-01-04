"use client";
import React, { useState } from 'react';
import { X, Users, BookOpen, Clock, BarChart3, Search, UserMinus, UserPlus, Mail, Shield, MoreVertical } from 'lucide-react';
import EnrollmentModal from '@/app/components/Common/EnrollmentModal';

interface Student {
    id: string;
    name: string;
    email: string;
    enrolledAt: string;
    lastActive: string;
}

interface CourseDetailsViewProps {
    isOpen: boolean;
    onClose: () => void;
    course: {
        title: string;
        slug: string;
        studentsCount: number;
        status: string;
        lastUpdated: string;
        // Optional extended props
        teacher?: string;
        modules?: number;
    } | null;
    userRole?: 'admin' | 'teacher';
}

export default function CourseDetailsView({ isOpen, onClose, course, userRole = 'teacher' }: CourseDetailsViewProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'students'>('overview');
    const [searchQuery, setSearchQuery] = useState('');
    const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);

    // Mock students data
    const [students] = useState<Student[]>([
        { id: '1', name: 'Amit Sharma', email: 'amit.sharma@example.com', enrolledAt: 'Dec 12, 2025', lastActive: '2h ago' },
        { id: '2', name: 'Neha Gupta', email: 'neha.gupta@example.com', enrolledAt: 'Dec 15, 2025', lastActive: '1d ago' },
        { id: '3', name: 'Rahul Verma', email: 'rahul.verma@example.com', enrolledAt: 'Nov 20, 2025', lastActive: '5m ago' },
        { id: '4', name: 'Priya Singh', email: 'priya.s@example.com', enrolledAt: 'Jan 05, 2026', lastActive: '3h ago' },
    ]);

    if (!isOpen || !course) return null;

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />

            {/* Modal Content */}
            <div className="relative w-full max-w-4xl bg-white rounded-[40px] shadow-2xl overflow-hidden animate-zoom-in h-[85vh] flex flex-col">

                {/* Header Section */}
                <div className="px-10 pt-10 pb-6 bg-white border-b border-slate-50 shrink-0">
                    <div className="flex items-start justify-between mb-8">
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 rounded-[24px] bg-[var(--brand)] flex items-center justify-center text-white shadow-xl shadow-[var(--brand)]/20">
                                <BookOpen size={32} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-1">{course.title}</h2>
                                <div className="flex items-center gap-3">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${course.status === 'Published' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                        {course.status}
                                    </span>
                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                        Last Updated {course.lastUpdated}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-3 hover:bg-slate-50 rounded-2xl text-slate-400 transition-all hover:rotate-90">
                            <X size={24} />
                        </button>
                    </div>

                    {/* Stats/Quick Actions */}
                    <div className="flex items-center gap-12 mb-8">
                        <StatItem icon={<Users size={18} />} label="Enrolled" value={course.studentsCount.toString()} color="brand" />
                        <StatItem icon={<BarChart3 size={18} />} label="Completion" value="78%" color="emerald" />
                        <StatItem icon={<Clock size={18} />} label="Avg. Time" value="12h 45m" color="amber" />
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-8 border-b border-slate-100">
                        <TabItem active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} label="Overview" />
                        <TabItem active={activeTab === 'students'} onClick={() => setActiveTab('students')} label="Enrolled Students" />
                    </div>
                </div>

                {/* Body Section */}
                <div className="flex-1 overflow-y-auto p-10 bg-slate-50/30">
                    {activeTab === 'overview' ? (
                        <div className="space-y-8 animate-fade-in">
                            <div className="grid grid-cols-2 gap-6">
                                <InfoCard title="Module Description" content="This comprehensive module covers the full spectrum of full-stack development, from modern frontend frameworks like React to robust backend architectures with Node.js and SQL." />
                                <InfoCard title="Technical Stack" content="React, Node.js, Express, MySQL, TailwindCSS, TypeScript" />
                            </div>

                            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                                <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6">Recent Activity</h4>
                                <div className="space-y-4">
                                    <ActivityLog user="Amit Sharma" action="completed Section 1" time="2 hours ago" />
                                    <ActivityLog user="Neha Gupta" action="submitted Unit 3 Assignment" time="5 hours ago" />
                                    <ActivityLog user="System" action="auto-published new quiz" time="1 day ago" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-fade-in">
                            <div className="flex items-center justify-between gap-4">
                                <div className="relative flex-1 max-w-md">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Search by name or email..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-[var(--brand)] transition-all shadow-sm"
                                    />
                                </div>
                                <button
                                    onClick={() => setIsEnrollModalOpen(true)}
                                    className="px-6 py-3 bg-[var(--brand)] text-white font-black text-xs rounded-2xl shadow-lg shadow-[var(--brand)]/20 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
                                >
                                    <UserPlus size={16} />
                                    Enroll New
                                </button>
                            </div>

                            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50/50 border-b border-slate-100">
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Student</th>
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Enrolled On</th>
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Activity</th>
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {filteredStudents.map(student => (
                                            <tr key={student.id} className="group hover:bg-slate-50/30 transition-colors">
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-full bg-[var(--brand-light)] flex items-center justify-center text-[var(--brand)] font-black text-sm">
                                                            {student.name[0]}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-slate-800">{student.name}</p>
                                                            <p className="text-xs font-bold text-slate-400">{student.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-xs font-black text-slate-600">{student.enrolledAt}</td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                                        <span className="text-xs font-black text-slate-600">{student.lastActive}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <button className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                                                        <UserMinus size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {filteredStudents.length === 0 && (
                                    <div className="py-20 text-center">
                                        <p className="text-sm font-black text-slate-300 uppercase tracking-widest italic">No students found</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <EnrollmentModal
                isOpen={isEnrollModalOpen}
                onClose={() => setIsEnrollModalOpen(false)}
                courseTitle={course.title}
                courseId={course.slug} // Assuming slug is used as ID or we need to pass ID. If ID is missing in props, we might need to add it.
                onEnroll={(newStudents) => {
                    console.log('Enrolled:', newStudents);
                    // Add logic to refresh or update list
                    setIsEnrollModalOpen(false);
                }}
            />

            <style jsx>{`
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                @keyframes zoom-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                .animate-fade-in { animation: fade-in 0.3s ease-out; }
                .animate-zoom-in { animation: zoom-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
            `}</style>
        </div>
    );
}

function StatItem({ icon, label, value, color }: { icon: any, label: string, value: string, color: 'brand' | 'emerald' | 'amber' }) {
    const colors = {
        brand: 'text-[var(--brand)] bg-[var(--brand-light)]',
        emerald: 'text-emerald-600 bg-emerald-50',
        amber: 'text-amber-600 bg-amber-50',
    };
    return (
        <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
                {icon}
            </div>
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
                <p className="text-lg font-black text-slate-800 leading-none">{value}</p>
            </div>
        </div>
    );
}

function TabItem({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
    return (
        <button
            onClick={onClick}
            className={`pb-4 px-2 text-xs font-black uppercase tracking-widest transition-all relative ${active ? 'text-[var(--brand)]' : 'text-slate-400 hover:text-slate-600'}`}
        >
            {label}
            {active && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--brand)] rounded-full shadow-sm animate-fade-in" />}
        </button>
    );
}

function InfoCard({ title, content }: { title: string, content: string }) {
    return (
        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{title}</h4>
            <p className="text-sm font-bold text-slate-600 leading-relaxed">{content}</p>
        </div>
    );
}

function ActivityLog({ user, action, time }: { user: string, action: string, time: string }) {
    return (
        <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-400">
                    {user[0]}
                </div>
                <p className="text-xs font-bold text-slate-600">
                    <span className="font-black text-slate-800">{user}</span> {action}
                </p>
            </div>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{time}</span>
        </div>
    );
}
