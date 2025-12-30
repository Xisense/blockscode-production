"use client";
import React, { useState, useMemo, useEffect } from 'react';
import Navbar from '@/app/components/Navbar';
import Loading from '@/app/loading';
import UnitRenderer, { UnitQuestion } from '@/app/components/UnitRenderer';
import UnitNavHeader from '@/app/components/UnitNavHeader';
import ExamSidebar from '@/app/components/ExamSidebar';

// submission details and questions are now fetched from API

import { TeacherService } from '@/services/api/TeacherService';

export default function SubmissionPreviewPage({ params }: { params: { id: string, rollNo: string } }) {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [activeTab, setActiveTab] = useState<"question" | "attempts">("question");
    const [selectedAttemptId, setSelectedAttemptId] = useState<string | undefined>(undefined);
    const [loading, setLoading] = useState(true);
    const [submissionData, setSubmissionData] = useState<any>(null);

    // Sidebar State - Start Collapsed
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
    const [isSidebarHidden, setIsSidebarHidden] = useState(false);

    // Grading State
    const [marks, setMarks] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        async function loadSubmission() {
            try {
                const data = await TeacherService.getSubmission(params.id, params.rollNo);
                setSubmissionData(data);

                // Initialize marks if any exist in the data
                // For now we keep it empty or mock
            } catch (error) {
                console.error("Failed to load submission", error);
            } finally {
                setLoading(false);
            }
        }
        loadSubmission();
    }, [params.id, params.rollNo]);

    const currentQuestion = submissionData?.questions?.[currentQuestionIndex];

    // Find viewing answer
    const viewingAttempt = useMemo(() => {
        if (!selectedAttemptId || !currentQuestion || !submissionData) return null;
        return (submissionData.attempts?.[currentQuestion.id] || []).find((a: any) => a.id === selectedAttemptId);
    }, [selectedAttemptId, currentQuestion, submissionData]);

    // Construct sections for ExamSidebar
    const examSections = useMemo(() => {
        if (!submissionData) return [];
        return [
            {
                id: 'section-1',
                title: 'Submission Review',
                questions: (submissionData.questions || []).map((q: any, idx: number) => ({
                    id: q.id,
                    status: 'answered' as const,
                    number: idx + 1
                }))
            }
        ];
    }, [submissionData]);

    // Handlers
    const handleQuestionSelect = (sectionId: string, questionId: string | number) => {
        const index = submissionData.questions.findIndex((q: any) => q.id === questionId);
        if (index !== -1) {
            setCurrentQuestionIndex(index);
            setSelectedAttemptId(undefined);
            setActiveTab('question');
        }
    };

    const handleAttemptSelect = (attempt: any) => {
        setSelectedAttemptId(attempt.id);
        setActiveTab('question');
    };

    const handleNext = () => {
        if (!submissionData) return;
        setCurrentQuestionIndex(prev => (prev + 1) % submissionData.questions.length);
        setSelectedAttemptId(undefined);
    };

    const handlePrevious = () => {
        if (!submissionData) return;
        setCurrentQuestionIndex(prev => (prev - 1 + submissionData.questions.length) % submissionData.questions.length);
        setSelectedAttemptId(undefined);
    };

    const handleMarkChange = (val: string) => {
        if (!currentQuestion) return;
        setMarks(prev => ({ ...prev, [currentQuestion.id]: val }));
    };

    if (loading) return <Loading />;

    if (!submissionData) {
        return (
            <div className="h-screen flex flex-col bg-white overflow-hidden">
                <Navbar />
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-[11px]">Submission not found</p>
                        <button onClick={() => window.history.back()} className="mt-4 px-6 py-2 bg-slate-900 text-white rounded-xl text-xs font-black">Go Back</button>
                    </div>
                </div>
            </div>
        );
    }


    return (
        <div className="h-screen flex flex-col bg-white overflow-hidden">
            <Navbar />

            {/* Main Workspace */}
            <main className="flex-1 flex overflow-hidden">
                {/* Reusable Exam Sidebar */}
                <ExamSidebar
                    sections={examSections}
                    currentSectionId="section-1"
                    currentQuestionId={currentQuestion.id}
                    onQuestionSelect={handleQuestionSelect}
                    collapsed={isSidebarCollapsed}
                    hidden={isSidebarHidden}
                    onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    onToggleHidden={() => setIsSidebarHidden(!isSidebarHidden)}
                    showCollapseToggle={true}
                />

                <section className="flex-1 flex flex-col min-w-0 bg-white relative">
                    <UnitRenderer
                        key={`${currentQuestion.id}-${selectedAttemptId || 'current'}`}
                        question={currentQuestion}
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                        onNext={handleNext}
                        onPrevious={handlePrevious}
                        hideNav={true}
                        attempts={submissionData.attempts[currentQuestion.id] || []}
                        showSidebar={!isSidebarHidden}
                        onToggleSidebar={() => setIsSidebarHidden(!isSidebarHidden)}
                        showSidebarToggle={false} // Removed hamburger icon
                        selectedAttemptId={selectedAttemptId}
                        onAttemptSelect={handleAttemptSelect}
                        viewingAttemptAnswer={viewingAttempt?.answer}
                        onClearAttemptSelection={() => setSelectedAttemptId(undefined)}
                        topHeader={
                            <ConsolidatedHeader
                                studentName={submissionData.details.studentName}
                                rollNo={submissionData.details.rollNo}
                                marks={marks[currentQuestion.id] || ''}
                                onMarkChange={handleMarkChange}
                                onSave={() => { /* API Call */ }}
                                onExit={() => window.history.back()}
                            />
                        }
                    />
                </section>
            </main>
        </div>
    );
}

/** 
 * Consolidated Header - Professional Grading Strip
 */
function ConsolidatedHeader({ studentName, rollNo, marks, onMarkChange, onSave, onExit }: any) {
    return (
        <div className="flex items-center justify-between px-6 h-16 bg-white border-b border-slate-100 shadow-sm relative z-50">
            {/* Left: Student Identity */}
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--brand-light)] flex items-center justify-center font-black text-sm text-[var(--brand)] uppercase border border-[var(--brand-light)] shadow-sm">
                        {studentName[0]}
                    </div>
                    <div>
                        <h4 className="text-sm font-black text-slate-800 leading-tight">
                            {studentName} <span className="text-slate-300 font-bold ml-1">({rollNo})</span>
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="flex h-1.5 w-1.5 rounded-full bg-[var(--brand)] animate-pulse"></span>
                            <p className="text-[10px] font-black text-[var(--brand)] uppercase tracking-widest opacity-80">Review Mode</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right: Grading Actions */}
            <div className="flex items-center gap-8">
                <div className="flex items-center gap-6 pr-8 border-r border-slate-100">
                    <div className="flex flex-col items-end">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 opacity-70">Question Score</span>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={marks}
                                onChange={(e) => onMarkChange(e.target.value)}
                                className="w-14 text-center bg-slate-50 border border-slate-200 rounded-xl py-2 text-base font-black text-slate-800 outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-light)] transition-all shadow-inner"
                                placeholder="0"
                            />
                            <span className="text-sm font-bold text-slate-400">/ 10</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={onExit}
                        className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-black uppercase tracking-widest px-6 py-3 rounded-xl transition-all active:scale-95"
                    >
                        Exit
                    </button>
                    <button
                        onClick={onSave}
                        className="flex items-center gap-2.5 bg-slate-900 hover:bg-black text-white text-[11px] font-black uppercase tracking-widest px-8 py-3 rounded-xl shadow-lg shadow-slate-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all group"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="group-hover:scale-110 transition-transform"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /></svg>
                        Save Grades
                    </button>
                </div>
            </div>
        </div>
    );
}
