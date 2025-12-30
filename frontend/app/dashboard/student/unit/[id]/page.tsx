"use client";
import React, { useState, useEffect } from 'react';
import Navbar from '@/app/components/Navbar';
import Loading from '@/app/loading';
import UnitRenderer, { UnitQuestion } from '@/app/components/UnitRenderer';
import UnitNavHeader from '@/app/components/UnitNavHeader';
import UnitSidebar from '@/app/components/UnitSidebar';
import { CourseService } from '@/services/api/CourseService';
import { StudentService } from '@/services/api/StudentService';
import { useRouter } from 'next/navigation';

export default function StudentUnitPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
    const params = React.use(paramsPromise);
    const id = params.id;
    const [currentQuestion, setCurrentQuestion] = useState<UnitQuestion | null>(null);
    const [loading, setLoading] = useState(true);
    const [showSidebar, setShowSidebar] = useState(false);
    const [activeTab, setActiveTab] = useState<"question" | "attempts">("question");
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [selectedAttemptId, setSelectedAttemptId] = useState<string | undefined>();
    const [attempts, setAttempts] = useState<any[]>([]);
    const [isExecuting, setIsExecuting] = useState(false);

    const [courseModules, setCourseModules] = useState<any[] | null>(null);
    const [courseTests, setCourseTests] = useState<any[] | null>(null);

    useEffect(() => {
        async function loadUnit() {
            try {
                setLoading(true);
                const [unitData, bookmarks, attemptsData] = await Promise.all([
                    CourseService.getUnit(id),
                    StudentService.getBookmarks(),
                    StudentService.getUnitSubmissions(id)
                ]);
                setCurrentQuestion(unitData as UnitQuestion);
                setIsBookmarked(bookmarks.some((b: any) => b.unitId === id));
                setAttempts(attemptsData);

                // Fetch parent Course modules for section navigation if available
                const courseSlug = (unitData as any)?.module?.course?.slug;
                if (courseSlug) {
                    try {
                        const courseData = await CourseService.getCourse(courseSlug);
                        setCourseModules(courseData.modules || null);
                        setCourseTests(courseData.tests || null);
                    } catch (e) {
                        // silent fail - optional
                        console.warn('Failed to fetch parent course for module navigation', e);
                        setCourseModules(null);
                        setCourseTests(null);
                    }
                } else {
                    setCourseModules(null);
                    setCourseTests(null);
                }

            } catch (error) {
                console.error('Failed to load unit:', error);
            } finally {
                setLoading(false);
            }
        }
        loadUnit();
    }, [id]);

    const handleToggleBookmark = async () => {
        if (!currentQuestion) return;
        try {
            if (isBookmarked) {
                await StudentService.removeBookmark(id);
                setIsBookmarked(false);
            } else {
                await StudentService.addBookmark(id);
                setIsBookmarked(true);
            }
        } catch (error) {
            console.error('Failed to toggle bookmark:', error);
        }
    };

    const handleRun = async (data: any) => {
        // In a real app, this would call Judge0 or similar
        console.log('Running code:', data);
        setIsExecuting(true);
        setTimeout(() => setIsExecuting(false), 2000);
    };

    const handleSubmit = async (data: any) => {
        if (!currentQuestion) return;
        try {
            await StudentService.submitUnit(id, {
                status: 'COMPLETED',
                content: data,
                score: 100 // Mock score for now
            });
            // Refresh attempts
            const newAttempts = await StudentService.getUnitSubmissions(id);
            setAttempts(newAttempts);
            alert('Submission successful!');
        } catch (error) {
            console.error('Failed to submit:', error);
            alert('Submission failed!');
        }
    };

    const viewingAttempt = currentQuestion ? attempts.find(a => a.id === selectedAttemptId) : undefined;

    const handleAttemptSelect = (attempt: any) => {
        setSelectedAttemptId(attempt.id);
        setActiveTab('question');
    };

    const router = useRouter();

    const normalizeId = (x: any) => String(x || '').replace(/^q-/i, '');

    // Derive module units based on available data:
    // - If unit provides moduleUnits (tests), use those
    // - Else if unit belongs to a CourseTest, pick the section that contains this question (or all questions flattened)
    // - Else fallback to module.units from courseModules
    const moduleUnitsList = (() => {
        const cq = currentQuestion as any;
        if (!cq) return [];

        let source = 'none';
        let units: any[] = [];

        // 1) Prefer explicit moduleUnits returned by API (test or module)
        if (Array.isArray(cq.moduleUnits) && cq.moduleUnits.length > 0) {
            source = 'moduleUnits';
            units = cq.moduleUnits.map((u: any) => ({ id: String(u.id), type: u.type, title: u.title }));
        }

        const modId = cq.module?.id;

        // 2) If this unit is inside a CourseTest (module.id refers to test id), try to resolve from courseTests
        if (units.length === 0 && courseTests && Array.isArray(courseTests)) {
            const test = courseTests.find((t: any) => t.id === modId || t.slug === modId || String(t.id) === String(modId));
            if (test) {
                let questionsData: any = test.questions;
                if (typeof questionsData === 'string') {
                    try { questionsData = JSON.parse(questionsData); } catch (e) { /* ignore */ }
                }

                // If questionsData is a flat array of question objects (no sections), return them directly
                if (Array.isArray(questionsData) && questionsData.length > 0 && !questionsData[0].questions) {
                    source = 'test-flat';
                    units = questionsData.map((qq: any) => ({ id: String(qq.id), type: qq.type || qq.questionType || 'Test', title: qq.title || 'Question' }));
                } else {
                    const sections = Array.isArray(questionsData) ? questionsData : (questionsData?.sections || []);

                    // Build a list of sections with questions arrays
                    const sectionList = sections.map((s: any) => ({
                        id: s.id || s.title || 'section',
                        questions: Array.isArray(s.questions) ? s.questions : (s.id ? [s] : [])
                    }));

                    // find the section that contains this question
                    const qNorm = String(cq.id || '').replace(/^q-/i, '');
                    for (const sec of sectionList) {
                        const found = sec.questions.find((qq: any) => String(qq.id || '').replace(/^q-/i, '') === qNorm);
                        if (found) {
                            source = 'test-section';
                            units = sec.questions.map((qq: any) => ({ id: String(qq.id), type: qq.type || qq.questionType || 'Test', title: qq.title || 'Question' }));
                            break;
                        }
                    }

                    // fallback to flattened all questions
                    if (units.length === 0) {
                        const flat = sectionList.flatMap((s: any) => s.questions || []);
                        if (flat.length > 0) {
                            source = 'test-flat-fallback';
                            units = flat.map((qq: any) => ({ id: String(qq.id), type: qq.type || qq.questionType || 'Test', title: qq.title || 'Question' }));
                        }
                    }
                }
            }
        }

        // 3) fallback to module units from courseModules (normal course modules)
        if (units.length === 0 && courseModules) {
            // try direct id match first
            let module = courseModules.find((m: any) => m.id === modId || String(m.id) === String(modId));
            if (!module) {
                // try to match by title as a fallback (some test modules use test.title)
                const modTitle = (cq.module && (cq.module.title || cq.module.name)) || undefined;
                if (modTitle) module = courseModules.find((m: any) => String(m.title || m.name || '').toLowerCase() === String(modTitle).toLowerCase());
            }
            if (module && Array.isArray(module.units) && module.units.length > 0) {
                source = 'course-module';
                units = module.units.map((u: any) => ({ id: String(u.id), type: u.type, title: u.title }));
            }
        }

        // 4) Last resort: if we have courseTests but earlier section logic didn't match, flatten all tests and try to find other questions from the same test
        if (units.length === 0 && courseTests && Array.isArray(courseTests) && modId) {
            const test = courseTests.find((t: any) => t.id === modId || t.slug === modId || String(t.id) === String(modId));
            if (test) {
                let questionsData: any = test.questions;
                if (typeof questionsData === 'string') {
                    try { questionsData = JSON.parse(questionsData); } catch (e) { /* ignore */ }
                }
                // produce a flat list of question objects
                const sections = Array.isArray(questionsData) ? questionsData : (questionsData?.sections || []);
                const flat = sections.flatMap((s: any) => Array.isArray(s.questions) ? s.questions : (s.id ? [s] : []));
                if (flat.length > 0) {
                    source = 'test-flat-2';
                    units = flat.map((qq: any) => ({ id: String(qq.id), type: qq.type || qq.questionType || 'Test', title: qq.title || 'Question' }));
                }
            }
        }

        if (units.length === 0) {
            units = [{ id: String(cq.id), type: cq.type, title: cq.title }];
            source = 'current-only';
        }

        console.log('[StudentUnitPage] moduleUnitsList source=', source, 'count=', units.length, 'modId=', modId);
        return units;
    })();

    const sidebarUnits = currentQuestion ? (
        moduleUnitsList.length > 0 ?
        moduleUnitsList.map((u: any) => ({ id: String(u.id), type: u.type, title: u.title, done: false, active: normalizeId(u.id) === normalizeId(id) })) :
        [{ id: String(currentQuestion.id), type: currentQuestion.type, title: currentQuestion.title, done: false, active: true }]
    ) : [];

    const navigateToUnit = (targetId: string) => {
        if (!targetId) return;
        router.push(`/dashboard/student/unit/${targetId}`);
    };

    const handleNextUnit = () => {
        if (!moduleUnitsList || moduleUnitsList.length === 0) return;
        const idx = moduleUnitsList.findIndex((u: any) => normalizeId(u.id) === normalizeId(id));
        const next = moduleUnitsList[(idx + 1) % moduleUnitsList.length];
        if (next) navigateToUnit(String(next.id));
    };

    const handlePreviousUnit = () => {
        if (!moduleUnitsList || moduleUnitsList.length === 0) return;
        const idx = moduleUnitsList.findIndex((u: any) => normalizeId(u.id) === normalizeId(id));
        const prev = moduleUnitsList[(idx - 1 + moduleUnitsList.length) % moduleUnitsList.length];
        if (prev) navigateToUnit(String(prev.id));
    };

    // SECTION NAVIGATION (previous/next section) - used by UnitSidebar top arrows
    const handleNextSection = () => {
        if (!currentQuestion) return;
        const currentModuleId = (currentQuestion as any)?.module?.id;

        // If the unit belongs to a CourseTest, navigate between its sections
        if (courseTests && Array.isArray(courseTests)) {
            const test = courseTests.find((t: any) => t.id === currentModuleId || t.slug === currentModuleId || String(t.id) === String(currentModuleId));
            if (test) {
                let questionsData: any = test.questions;
                if (typeof questionsData === 'string') {
                    try { questionsData = JSON.parse(questionsData); } catch (e) { /* ignore */ }
                }

                let sections: any[] = [];
                if (Array.isArray(questionsData)) {
                    // Detect flat questions array (no sections)
                    if (questionsData.length > 0 && !questionsData[0].questions) {
                        sections = [{ id: 'section', questions: questionsData }];
                    } else {
                        sections = questionsData;
                    }
                } else {
                    sections = questionsData?.sections || [];
                }

                const qNorm = normalizeId(currentQuestion.id);
                const sectionIdx = sections.findIndex((s: any) => {
                    const qs = Array.isArray(s.questions) ? s.questions : (s.id ? [s] : []);
                    return qs.some((qq: any) => normalizeId(qq.id) === qNorm);
                });
                if (sectionIdx === -1) return;
                const nextSection = sections[(sectionIdx + 1) % sections.length];
                const firstQuestion = Array.isArray(nextSection.questions) ? nextSection.questions[0] : nextSection;
                if (firstQuestion) navigateToUnit(String(firstQuestion.id));
                return;
            }
        }

        // Fallback: use courseModules (module-level navigation)
        if (!courseModules) return;
        const idx = courseModules.findIndex((m: any) => m.id === currentModuleId);
        if (idx === -1) return;
        const nextModule = courseModules[(idx + 1) % courseModules.length];
        if (nextModule && Array.isArray(nextModule.units) && nextModule.units.length > 0) {
            navigateToUnit(nextModule.units[0].id);
        }
    };

    const handlePreviousSection = () => {
        if (!currentQuestion) return;
        const currentModuleId = (currentQuestion as any)?.module?.id;

        // If the unit belongs to a CourseTest, navigate between its sections
        if (courseTests && Array.isArray(courseTests)) {
            const test = courseTests.find((t: any) => t.id === currentModuleId || t.slug === currentModuleId || String(t.id) === String(currentModuleId));
            if (test) {
                let questionsData: any = test.questions;
                if (typeof questionsData === 'string') {
                    try { questionsData = JSON.parse(questionsData); } catch (e) { /* ignore */ }
                }

                let sections: any[] = [];
                if (Array.isArray(questionsData)) {
                    // Detect flat questions array (no sections)
                    if (questionsData.length > 0 && !questionsData[0].questions) {
                        sections = [{ id: 'section', questions: questionsData }];
                    } else {
                        sections = questionsData;
                    }
                } else {
                    sections = questionsData?.sections || [];
                }

                const qNorm = normalizeId(currentQuestion.id);
                const sectionIdx = sections.findIndex((s: any) => {
                    const qs = Array.isArray(s.questions) ? s.questions : (s.id ? [s] : []);
                    return qs.some((qq: any) => normalizeId(qq.id) === qNorm);
                });
                if (sectionIdx === -1) return;
                const prevSection = sections[(sectionIdx - 1 + sections.length) % sections.length];
                const firstQuestion = Array.isArray(prevSection.questions) ? prevSection.questions[0] : prevSection;
                if (firstQuestion) navigateToUnit(String(firstQuestion.id));
                return;
            }
        }

        // Fallback: use courseModules (module-level navigation)
        if (!courseModules) return;
        const idx = courseModules.findIndex((m: any) => m.id === currentModuleId);
        if (idx === -1) return;
        const prevModule = courseModules[(idx - 1 + courseModules.length) % courseModules.length];
        if (prevModule && Array.isArray(prevModule.units) && prevModule.units.length > 0) {
            navigateToUnit(prevModule.units[0].id);
        }
    };
    if (loading) return <Loading />;

    if (!currentQuestion) {
        return (
            <div className="h-screen flex flex-col bg-white overflow-hidden">
                <Navbar />
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-lg font-bold text-red-400">Unit not found</div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-white overflow-hidden">
            <Navbar />

            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 flex flex-col overflow-hidden relative">
                    <div className="flex-1 overflow-hidden relative">
                        <UnitRenderer
                            key={`${currentQuestion.id}-${selectedAttemptId || 'current'}`}
                            question={currentQuestion}
                            activeTab={activeTab}
                            onTabChange={setActiveTab}
                            onToggleBookmark={handleToggleBookmark}
                            isBookmarked={isBookmarked}
                            showSidebar={showSidebar}
                            onToggleSidebar={() => setShowSidebar(!showSidebar)}
                            attempts={attempts}
                            selectedAttemptId={selectedAttemptId}
                            onAttemptSelect={handleAttemptSelect}
                            viewingAttemptAnswer={viewingAttempt?.content}
                            onClearAttemptSelection={() => setSelectedAttemptId(undefined)}
                            onRun={handleRun}
                            onSubmit={handleSubmit}
                            isExecuting={isExecuting}
                            onNext={handleNextUnit}
                            onPrevious={handlePreviousUnit}
                            sidebar={
                                <UnitSidebar
                                    units={sidebarUnits}
                                    moduleTitle={(currentQuestion as any)?.moduleTitle || 'Course Content'}
                                    sectionTitle="Current Unit"
                                    onToggle={() => setShowSidebar(false)}
                                    onUnitClick={(unitId: string) => navigateToUnit(unitId)}
                                    onPrevSection={handlePreviousSection}
                                    onNextSection={handleNextSection}
                                />
                            }
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
