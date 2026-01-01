"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Navbar, { ExamConfig } from "../../components/Navbar";
import ExamSidebar from "../../components/ExamSidebar";
import UnitRenderer, { UnitQuestion } from "../../components/UnitRenderer";
import { useToast } from "../../components/Common/Toast";
import ExamSubmitView from "../../components/ExamSubmitView";
import ExamFeedbackView from "../../components/ExamFeedbackView";
import ExamSuccessView from "../../components/ExamSuccessView";
import { ExamService } from "@/services/api/ExamService";
import { useElectronMonitoring } from "@/hooks/useElectronMonitoring";
import { useExamSocket } from "@/hooks/useExamSocket";
import Loading from "@/app/loading";
import { useNetworkMonitor } from "@/hooks/useNetworkMonitor";
// Actually, to avoid dependnecy issues, I'll write a simple debounce ref logic.

export default function PublicExamPage() {
    const params = useParams();
    const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;

    const [sections, setSections] = useState<any[]>([]);
    const [questionsMap, setQuestionsMap] = useState<Record<string, UnitQuestion>>({});
    const [currentSectionId, setCurrentSectionId] = useState("s1");
    const [currentQuestionId, setCurrentQuestionId] = useState<string | number>("q1-1");
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [sidebarHidden, setSidebarHidden] = useState(false);
    const [navbarVisible, setNavbarVisible] = useState(true);
    const [fontSize, setFontSize] = useState(15);
    const [windowFocus, setWindowFocus] = useState({ in: 0, out: 0 });
    const { isOnline, downlink } = useNetworkMonitor();
    const [showOfflineAlert, setShowOfflineAlert] = useState(false);
    const [isSidebarHovered, setIsSidebarHovered] = useState(false);
    const [shouldCollapseAfterHover, setShouldCollapseAfterHover] = useState(false);
    const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
    const [isFeedbackMode, setIsFeedbackMode] = useState(false);
    const [isSuccessMode, setIsSuccessMode] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    const [user, setUser] = useState<any>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [examTitle, setExamTitle] = useState("Examination");
    const [finalSubmitTime, setFinalSubmitTime] = useState<string | null>(null);

    const { warning, info, error: toastError } = useToast();
    const debouncedSaveRef = useRef<any>(null);

    // Exam ID for socket and monitoring
    const examId = slug as string;

    // Socket Integration
    const { saveAnswer, logViolation: socketLogViolation, saveReviewStatus, disconnect } = useExamSocket(
        examId,
        user?.id || user?.rollNumber || '',
        sessionId || ''
    );

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const storedUser = localStorage.getItem('user');
            if (storedUser) setUser(JSON.parse(storedUser));
        }
    }, []);

    // Effect for Offline Alert (Trigger after 5s)
    useEffect(() => {
        if (isOnline) {
            setShowOfflineAlert(false);
        } else {
            const timer = setTimeout(() => {
                setShowOfflineAlert(true);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [isOnline]);

    // Initialize Monitoring Hook
    const { logEvent } = useElectronMonitoring(slug || '', user?.rollNumber || "2211981482");

    useEffect(() => {
        if (!slug) return;

        // Load Exam Data on Mount
        async function loadExamData() {
            try {
                // 0. MANDATORY LOGIN CHECK for specific slug
                if (typeof window !== 'undefined') {
                    const isAuthorized = localStorage.getItem(`exam_${slug}_auth`);
                    if (!isAuthorized) {
                        console.log(`[ExamPage] Not authorized for slug: ${slug}, redirecting to login...`);
                        window.location.href = `/exam/login?slug=${slug}`;
                        return;
                    }
                }

                // 0.1 Check Auth First (Global)
                const storedUserRaw = localStorage.getItem('user');
                if (!storedUserRaw) {
                    console.log('No user found, redirecting to login');
                    window.location.href = `/exam/login?slug=${slug}`;
                    return;
                }
                const currentUserMeta = JSON.parse(storedUserRaw);

                // 0.2 Get Metadata (Roll No, Name, Section)
                const studentMetadataRaw = localStorage.getItem(`exam_${slug}_metadata`);
                const studentMetadata = studentMetadataRaw ? JSON.parse(studentMetadataRaw) : null;

                // 0.1 Check Public Status First
                const publicStatus = await ExamService.getExamPublicStatus(slug as string);
                const startTime = new Date(publicStatus.startTime).getTime();
                if (Date.now() < startTime) {
                    window.location.href = `/exam/waiting?slug=${slug}`;
                    return; // Prevent setIsLoading(false)
                }

                // 0.2 Standardize Identity (DeviceId & TabId)
                let deviceId = localStorage.getItem('deviceId');
                if (!deviceId) {
                    deviceId = 'dev_' + Math.random().toString(36).substring(2, 12);
                    localStorage.setItem('deviceId', deviceId);
                }

                let tabId = sessionStorage.getItem('exam_tab_id');
                if (!tabId) {
                    tabId = 'tab_' + Math.random().toString(36).substring(2, 12);
                    sessionStorage.setItem('exam_tab_id', tabId);
                }

                // 1. Get Exam Content (Metadata only first)
                const data = await ExamService.getExamBySlug(slug as string);
                setExamTitle(data.title || "Examination");

                // 2. Start/Resume Session (Gatekeeper)
                const session = await ExamService.startExam(
                    slug as string,
                    deviceId,
                    currentUserMeta.id || currentUserMeta.rollNumber,
                    tabId,
                    studentMetadata
                );

                if (session && session.id) {
                    setSessionId(session.id);
                    localStorage.setItem('currentExamSessionId', session.id);

                    // 2.1 Handle COMPLETED session (Resume success/feedback view)
                    if (session.status === 'COMPLETED') {
                        setIsLoading(false);
                        const isFeedbackDoneLocal = localStorage.getItem(`exam_${slug}_feedback_done`) === 'true';
                        const isFeedbackDone = isFeedbackDoneLocal || session.feedbackDone === true;

                        // Sync back to local storage if server knows it's done but local doesn't
                        if (session.feedbackDone && !isFeedbackDoneLocal) {
                            localStorage.setItem(`exam_${slug}_feedback_done`, 'true');
                        }

                        // Restore submission time if available
                        const savedTime = localStorage.getItem(`exam_${slug}_submit_time`);
                        if (savedTime) setFinalSubmitTime(savedTime);

                        if (isFeedbackDone) {
                            setIsSuccessMode(true);
                        } else {
                            setIsFeedbackMode(true);
                        }
                        return; // Early return, don't load sections/questions
                    }

                    // POPULATE DATA ONLY AFTER SUCCESSFUL SESSION START
                    if (data.sections) setSections(data.sections);
                    if (data.questions) setQuestionsMap(data.questions);

                    // Adjust timer based on ACTUAL session start time
                    if (data.duration) {
                        const sessStart = new Date(session.startTime || Date.now()).getTime();
                        const now = Date.now();
                        const elapsedSeconds = Math.floor((now - sessStart) / 1000);
                        const remaining = (data.duration * 60) - Math.max(0, elapsedSeconds);
                        setTimeLeft(remaining);
                    }

                    // Restore persistent tab switch counts
                    if (typeof session.tabSwitchOutCount === 'number') {
                        setWindowFocus(prev => ({ ...prev, out: session.tabSwitchOutCount }));
                    }
                    if (typeof session.tabSwitchInCount === 'number') {
                        setWindowFocus(prev => ({ ...prev, in: session.tabSwitchInCount }));
                    }
                }

                // Initialize user answers and sections if session has them
                let restoredAllAnswers: Record<string, any> = {};

                if (session.answers) {
                    try {
                        if (typeof session.answers === 'string') {
                            restoredAllAnswers = JSON.parse(session.answers);
                        } else if (typeof session.answers === 'object') {
                            restoredAllAnswers = session.answers as Record<string, any>;
                        }
                    } catch (e) {
                        console.error("Failed to parse session answers", e);
                    }

                    // Hybrid Persistence: Merge with local session storage as fallback
                    const localMarkersRaw = sessionStorage.getItem(`exam_${slug}_review_markers`);
                    if (localMarkersRaw) {
                        try {
                            const localMarkers = JSON.parse(localMarkersRaw);
                            restoredAllAnswers = { ...restoredAllAnswers, ...localMarkers };
                        } catch (e) { }
                    }

                    // Standardize internal markers (flatten if they came from _internal_position)
                    if (restoredAllAnswers['_internal_position']) {
                        restoredAllAnswers = { ...restoredAllAnswers, ...restoredAllAnswers['_internal_position'] };
                    }

                    setUserAnswers(restoredAllAnswers);
                }

                // Helper to determine status for a question (UNIFIED)
                const getQuestionStatus = (q: any, allAnswers: Record<string, any>) => {
                    const qId = String(q.id);
                    // Marker check (allow boolean, string 'true', or number 1)
                    const revValue = allAnswers[`_rev_${qId}`];
                    if (revValue === true || revValue === 'true' || revValue === 1 || revValue === '1') {
                        return 'review';
                    }

                    // Check if explicitly marked as answered (submitted)
                    const isExplicitlyAnswered = allAnswers[`_submitted_${qId}`] === true;
                    if (isExplicitlyAnswered) return 'answered';

                    // Otherwise, it's unanswered (even if it has data entered)
                    return 'unanswered';
                };

                // Update sections with persistent status
                if (data.sections && data.sections.length > 0) {
                    let firstIncompleteSectionId: string | null = null;
                    let firstIncompleteQuestionId: string | null = null;

                    const updatedSections = data.sections.map((s: any, idx: number) => {
                        const isSubmitted = restoredAllAnswers[`_section_${s.id}_submitted`] === true;

                        // Determine status: submitted, active, or locked
                        let status = s.status || 'locked';
                        if (isSubmitted) {
                            status = 'submitted';
                        } else if (!firstIncompleteSectionId) {
                            // First one that isn't submitted becomes active
                            firstIncompleteSectionId = s.id;
                            status = 'active';
                        } else {
                            status = 'locked';
                        }

                        const sectionQuestions = s.questions.map((q: any) => ({
                            ...q,
                            status: getQuestionStatus(q, restoredAllAnswers)
                        }));

                        if (s.id === firstIncompleteSectionId && sectionQuestions.length > 0) {
                            firstIncompleteQuestionId = sectionQuestions[0].id;
                        }

                        return {
                            ...s,
                            status: status,
                            questions: sectionQuestions
                        };
                    });

                    setSections(updatedSections);

                    const allSubmitted = updatedSections.every((s: any) => s.status === 'submitted');
                    if (allSubmitted) {
                        setIsSubmitModalOpen(true);
                    }

                    // Resume from last position if saved and section is active/accessible
                    // We check both root and the _internal_position object for robustness
                    const internalPos = restoredAllAnswers['_internal_position'] || {};
                    const savedSectionId = internalPos._last_section_id || restoredAllAnswers['_last_section_id'];
                    const savedQuestionId = internalPos._last_question_id || restoredAllAnswers['_last_question_id'];

                    const savedSection = updatedSections.find((s: any) => s.id === savedSectionId);

                    if (savedSection && (savedSection.status === 'active' || savedSection.status === 'unlocked')) {
                        setCurrentSectionId(savedSectionId);
                        setCurrentQuestionId(savedQuestionId || savedSection.questions[0].id);
                    } else if (firstIncompleteSectionId) {
                        setCurrentSectionId(firstIncompleteSectionId);
                        if (firstIncompleteQuestionId) {
                            setCurrentQuestionId(firstIncompleteQuestionId);
                        }
                    } else {
                        // All sections submitted? Go to last section but modal will cover it
                        const lastSection = updatedSections[updatedSections.length - 1];
                        if (lastSection) {
                            setCurrentSectionId(lastSection.id);
                            if (lastSection.questions.length > 0) {
                                setCurrentQuestionId(lastSection.questions[0].id);
                            }
                        }
                    }
                }
            } catch (error: any) {
                console.error("Failed to load exam data", error);
                if (error.message?.includes('EXAM_ALREADY_ACTIVE')) {
                    window.location.href = `/exam/login?slug=${slug}&error=active_session`;
                    return; // Keep loading visible
                }
                if (error.message?.includes('ACCOUNT_SUSPENDED')) {
                    window.location.href = `/exam/login?slug=${slug}&error=suspended`;
                    return; // Keep loading visible
                }
                if (error.message?.includes('401') || error.message?.includes('Unauthorized') || error.message?.includes('Failed to start exam')) {
                    window.location.href = `/exam/login?slug=${slug}`;
                    return; // Keep loading visible
                } else {
                    toastError("Failed to load exam content. Please refresh or check login.");
                    setIsLoading(false); // Only stop loading if we stay on page
                }
            }
        }
        loadExamData();
    }, [slug]);

    const submitFullExam = useCallback(async () => {
        logEvent('exam_submission', 'User exam submitted (Manual or Auto)');
        try {
            const activeSessionId = (sessionId || localStorage.getItem('currentExamSessionId') || 'demo-session') as string;

            // Final Sync using ref to get latest answers without closure stale issues
            saveAnswer('_final_sync', userAnswersRef.current);

            await ExamService.submitExam(activeSessionId);

            // Capture static submission time
            const submitTime = new Date().toLocaleTimeString() + ", " + new Date().toLocaleDateString();
            setFinalSubmitTime(submitTime);
            localStorage.setItem(`exam_${slug}_submit_time`, submitTime);

            // Disconnect socket immediately
            disconnect();

            setIsFeedbackMode(true);
        } catch (e) {
            console.error("Full submission failed", e);
            warning("Network error. Finalizing session locally...");
            const submitTime = new Date().toLocaleTimeString() + ", " + new Date().toLocaleDateString();
            setFinalSubmitTime(submitTime);
            localStorage.setItem(`exam_${slug}_submit_time`, submitTime);
            disconnect();
            setIsFeedbackMode(true);
        }
    }, [sessionId, logEvent, saveAnswer, warning, disconnect]);

    const handleFeedbackSubmit = useCallback(async (rating: number, comment: string) => {
        try {
            const userId = user?.id || user?.rollNumber || 'anonymous';
            await ExamService.saveFeedback(slug as string, userId, rating, comment);
            logEvent('feedback_submitted', 'User submitted feedback', { rating });
            info("Thank you for your feedback!");
            if (typeof window !== 'undefined') {
                localStorage.setItem(`exam_${slug}_feedback_done`, 'true');
            }
            setIsSuccessMode(true);
        } catch (e) {
            console.error("Feedback submission failed", e);
            // Even if feedback fails, we show success page so they can finish
            if (typeof window !== 'undefined') {
                localStorage.setItem(`exam_${slug}_feedback_done`, 'true');
            }
            setIsSuccessMode(true);
        }
    }, [user, slug, logEvent, info]);

    // Timer Logic
    useEffect(() => {
        if (timeLeft === null || isFeedbackMode || isSuccessMode) return;

        // AUTO-SUBMIT when time is up
        if (timeLeft <= 0) {
            console.log("Time is up! Auto-submitting...");
            submitFullExam();
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev === null || prev <= 0) return 0;
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, submitFullExam]);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // Answer State
    const [userAnswers, setUserAnswers] = useState<Record<string, any>>({});

    const handleNext = () => {
        const currentSection = sections.find(s => s.id === currentSectionId);
        if (!currentSection) return;

        const qIdx = currentSection.questions.findIndex((q: any) => q.id === currentQuestionId);
        if (qIdx < currentSection.questions.length - 1) {
            handleQuestionSelect(currentSectionId, currentSection.questions[qIdx + 1].id);
        } else {
            const sIdx = sections.findIndex(s => s.id === currentSectionId);
            if (sIdx < sections.length - 1) {
                const nextSection = sections[sIdx + 1];
                // Only go if active, unlocked
                if (nextSection.status === 'active' || nextSection.status === 'unlocked') {
                    handleQuestionSelect(nextSection.id, nextSection.questions[0].id);
                }
            }
        }
    };

    const handlePrevious = () => {
        const currentSection = sections.find(s => s.id === currentSectionId);
        if (!currentSection) return;

        const qIdx = currentSection.questions.findIndex((q: any) => q.id === currentQuestionId);
        if (qIdx > 0) {
            handleQuestionSelect(currentSectionId, currentSection.questions[qIdx - 1].id);
        } else {
            const sIdx = sections.findIndex(s => s.id === currentSectionId);
            if (sIdx > 0) {
                const prevSection = sections[sIdx - 1];
                // ONLY allow going back if NOT submitted and NOT locked
                if (prevSection.status === 'active' || prevSection.status === 'unlocked') {
                    handleQuestionSelect(prevSection.id, prevSection.questions[prevSection.questions.length - 1].id);
                }
            }
        }
    };

    const handleSubmitNext = (answer: any) => {
        // 1. Save Answer
        setUserAnswers(prev => ({
            ...prev,
            [currentQuestionId]: answer,
            [`_submitted_${currentQuestionId}`]: true // Mark as explicitly submitted
        }));
        saveAnswer(currentQuestionId as string, answer);
        // Also save the submitted flag
        saveAnswer(`_submitted_${currentQuestionId}`, true);

        // 2. Mark as answered in local state
        setSections(prev => prev.map(s => ({
            ...s,
            questions: s.questions.map((q: any) =>
                q.id === currentQuestionId ? { ...q, status: 'answered' } : q
            )
        })));

        // 3. Check if last question of the section
        const currentSection = sections.find(s => s.id === currentSectionId);
        if (currentSection) {
            const qIdx = currentSection.questions.findIndex((q: any) => q.id === currentQuestionId);
            if (qIdx === currentSection.questions.length - 1) {
                // Redirect to section submit summary if it's the last question
                setIsSubmitModalOpen(true);
                return;
            }
        }

        // 4. Otherwise go to next question
        handleNext();
    };

    const userAnswersRef = useRef(userAnswers);
    useEffect(() => {
        userAnswersRef.current = userAnswers;
    }, [userAnswers]);

    const handleAnswerChange = useCallback((answer: any) => {
        const currentAnswer = userAnswersRef.current[currentQuestionId];
        if (JSON.stringify(currentAnswer) === JSON.stringify(answer)) {
            return;
        }

        setUserAnswers(prev => ({ ...prev, [currentQuestionId]: answer }));

        // Debounce Save (1s)
        if (debouncedSaveRef.current) clearTimeout(debouncedSaveRef.current);
        debouncedSaveRef.current = setTimeout(() => {
            saveAnswer(currentQuestionId as string, answer);
        }, 1000);
    }, [currentQuestionId, saveAnswer]);

    // ... (useEffect hooks for focus monitoring could remain here or be moved to useElectronMonitoring if refactored further)
    // For now, keeping existing local focus logic but we could enhance it to call logEvent
    useEffect(() => {
        if (isFeedbackMode || isSuccessMode) return;

        const onFocus = () => {
            setWindowFocus(prev => ({ ...prev, in: prev.in + 1 }));
            socketLogViolation('TAB_SWITCH_IN', 'Student switched back to exam tab');
        };
        const onBlur = () => {
            setWindowFocus(prev => ({ ...prev, out: prev.out + 1 }));
            socketLogViolation('TAB_SWITCH_OUT', 'Student switched away from exam tab');
        };

        window.addEventListener("focus", onFocus);
        window.addEventListener("blur", onBlur);
        return () => {
            window.removeEventListener("focus", onFocus);
            window.removeEventListener("blur", onBlur);
        };
    }, [logEvent, socketLogViolation, isFeedbackMode, isSuccessMode]);

    const handleQuestionSelect = (sectionId: string, questionId: string | number, force = false) => {
        // Prevent selecting questions from locked or submitted sections (unless forced)
        if (!force) {
            const targetSection = sections.find(s => s.id === sectionId);
            if (targetSection?.status === 'locked' || targetSection?.status === 'submitted') return;
        }

        setCurrentSectionId(sectionId);
        setCurrentQuestionId(questionId);

        // PERSISTENCE: Save last viewed position
        const positionMarkers = {
            '_last_section_id': sectionId,
            '_last_question_id': questionId
        };

        // Use the same logic as handleAnswerChange to sync state & persist
        setUserAnswers(prev => ({ ...prev, ...positionMarkers }));

        if (debouncedSaveRef.current) clearTimeout(debouncedSaveRef.current);
        debouncedSaveRef.current = setTimeout(() => {
            saveAnswer('_internal_position', positionMarkers);
        }, 2000); // slightly longer debounce for navigation
    };

    // Automatically update question statuses in the sidebar when answers change
    useEffect(() => {
        if (sections.length === 0) return;

        const getDynamicStatus = (q: any, currentAnswers: Record<string, any>) => {
            const qId = String(q.id);
            const revValue = currentAnswers[`_rev_${qId}`];
            if (revValue === true || revValue === 'true' || revValue === 1 || revValue === '1') {
                return 'review';
            }
            // Only mark as answered if explicitly submitted
            const isExplicitlyAnswered = currentAnswers[`_submitted_${qId}`] === true;
            if (isExplicitlyAnswered) return 'answered';

            // Otherwise it's unanswered (even if data is entered)
            return 'unanswered';
        };

        setSections(prev => prev.map(s => ({
            ...s,
            questions: s.questions.map((q: any) => ({
                ...q,
                status: getDynamicStatus(q, userAnswers)
            }))
        })));
    }, [userAnswers]); // We only care about userAnswers changes for status updates

    const submitSection = async (sectionId: string) => {
        // Logic to submit the current section and unlock the next one
        const sectionIndex = sections.findIndex(s => s.id === sectionId);
        if (sectionIndex === -1) return;

        // REAL API CALL
        try {
            const activeSessionId = (sessionId || localStorage.getItem('currentExamSessionId') || 'demo-session') as string;

            // Gather answers for this section
            const sectionQuestions = sections.find(s => s.id === sectionId)?.questions.map((q: any) => q.id) || [];
            const sectionAnswers = Object.keys(userAnswers)
                .filter(key => sectionQuestions.includes(key))
                .reduce((obj, key) => {
                    obj[key] = userAnswers[key];
                    return obj;
                }, {} as any);

            await ExamService.submitSection(activeSessionId, sectionId, sectionAnswers);

            info("Section submitted successfully");
        } catch (e) {
            console.error("Submission failed", e);
            warning("Failed to save section. Proceeding locally.");
        }

        const nextSection = sections[sectionIndex + 1];

        setSections(prev => prev.map((s, idx) => {
            if (s.id === sectionId) return { ...s, status: 'submitted' };
            if (nextSection && s.id === nextSection.id) return { ...s, status: 'active' };
            return s;
        }));

        // Move to next section automatically if available
        if (nextSection) {
            handleQuestionSelect(nextSection.id, nextSection.questions[0].id, true);
            setIsSubmitModalOpen(false);
        } else {
            // All sections completed, stay in modal to show final submission option
            info("All sections completed. You can now submit your final exam.");
        }
    };

    const toggleReview = () => {
        let isNowReviewed = false;
        setSections(prev => prev.map(s => ({
            ...s,
            questions: s.questions.map((q: any) => {
                if (q.id === currentQuestionId) {
                    isNowReviewed = q.status !== 'review';
                    return { ...q, status: isNowReviewed ? 'review' : 'current' };
                }
                return q;
            })
        })));

        // Persist change
        setUserAnswers(prev => {
            const next = { ...prev, [`_rev_${currentQuestionId}`]: isNowReviewed };

            // Local SessionStorage Backup (fast recovery on refresh)
            const markers = Object.keys(next)
                .filter(k => k.startsWith('_rev_'))
                .reduce((obj, k) => { obj[k] = next[k]; return obj; }, {} as any);
            sessionStorage.setItem(`exam_${slug}_review_markers`, JSON.stringify(markers));

            return next;
        });
        saveReviewStatus(currentQuestionId as string, isNowReviewed);
    };

    const isMarkedForReview = sections.find(s => s.id === currentSectionId)
        ?.questions.find((q: any) => q.id === currentQuestionId)?.status === 'review';

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    const examConfig: ExamConfig = {
        rollNumber: user?.rollNumber || "2211981482",
        userName: user?.name || "Student",
        hideBrandSuffix: true,
        hideBrandName: true,
        onRefresh: () => window.location.reload(),
        leftContent: (
            <div className="flex items-center gap-4 ml-4">
                <div className={`
                    bg-white border border-slate-100 rounded-xl px-3 py-1.5 flex items-center gap-3 transition-shadow duration-300
                    ${(windowFocus.in === 0 && windowFocus.out === 0) ? 'shadow-none' : 'shadow-md shadow-slate-200/50'}
                `}>
                    <div className="flex items-center gap-1.5" title="Switched In (Focused)">
                        <div className="w-5 h-5 rounded-md bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></svg>
                        </div>
                        <span className="text-xs font-black text-emerald-700">{windowFocus.in}</span>
                    </div>
                    <div className="w-[1px] h-3 bg-slate-100" />
                    <div className="flex items-center gap-1.5" title="Switched Out (Blurred)">
                        <div className="w-5 h-5 rounded-md bg-rose-50 flex items-center justify-center text-rose-600">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                        </div>
                        <span className="text-xs font-black text-rose-700">{windowFocus.out}</span>
                    </div>
                </div>
            </div>
        ),
        centerContent: (
            (isSubmitModalOpen || sections.find(s => s.id === currentSectionId)?.status === 'submitted') ? (
                // Only show back button if current section is NOT submitted AND not all are submitted
                (!sections.every(s => s.status === 'submitted') && sections.find(s => s.id === currentSectionId)?.status !== 'submitted') ? (
                    <button
                        onClick={() => setIsSubmitModalOpen(false)}
                        className="flex items-center gap-2 px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-bold rounded-xl transition-all"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                        Back to Questions
                    </button>
                ) : null
            ) : (
                <button
                    onClick={() => setIsSubmitModalOpen(true)}
                    className="px-8 py-2 bg-[var(--brand)] text-white text-sm font-black rounded-xl hover:scale-105 active:scale-95 transition-all"
                >
                    Submit Section
                </button>
            )
        ),
        rightContent: (
            <div className="flex items-center gap-4">
                <div className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-xl border font-black text-xs transition-all duration-500
                    ${timeLeft !== null && timeLeft <= 300
                        ? 'bg-rose-50 text-rose-600 border-rose-100 animate-pulse'
                        : 'bg-sky-50 text-sky-700 border-sky-100'}
                `}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                    {timeLeft !== null ? formatTime(timeLeft) : 'Loading...'}
                </div>

                <div className="flex items-center gap-1 bg-white border border-slate-100 rounded-xl p-1">
                    <button onClick={() => setFontSize(prev => Math.max(12, prev - 1))} className="w-7 h-7 flex items-center justify-center hover:bg-slate-50 rounded-lg text-slate-500 hover:text-[var(--brand)] transition-colors">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    </button>
                    <button onClick={() => setFontSize(prev => Math.min(30, prev + 1))} className="w-7 h-7 flex items-center justify-center hover:bg-slate-50 rounded-lg text-slate-500 hover:text-[var(--brand)] transition-colors">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    </button>
                </div>

                {/* WiFi Signal Icon with Tooltip */}
                <div className="relative group flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-help border border-slate-100">
                    <div className="flex items-end gap-0.5 h-3.5 mb-0.5">
                        {[1, 2, 3, 4].map((bar) => {
                            const barThresholds = [0, 2, 5, 10];
                            const isActive = isOnline && downlink >= barThresholds[bar - 1];
                            return (
                                <div
                                    key={bar}
                                    className={`w-1 rounded-sm transition-all duration-300 ${isActive ? 'bg-emerald-500' : 'bg-slate-200'} ${!isOnline ? 'bg-rose-400' : ''}`}
                                    style={{ height: `${25 * bar}%` }}
                                />
                            );
                        })}
                    </div>
                    {!isOnline && (
                        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full animate-pulse" />
                    )}

                    {/* Tooltip */}
                    <div className="absolute invisible group-hover:visible top-full left-1/2 -translate-x-1/2 mt-3 p-3 bg-white text-slate-900 text-[10px] font-bold rounded-xl whitespace-nowrap shadow-2xl z-50 border border-slate-100 ring-4 ring-slate-900/5 transition-all">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-8">
                                <span className="text-slate-400 uppercase tracking-tighter">Net Status</span>
                                <span className={isOnline ? 'text-emerald-500 font-black' : 'text-rose-500 font-black'}>
                                    {isOnline ? 'ONLINE' : 'OFFLINE'}
                                </span>
                            </div>
                            {isOnline && (
                                <div className="flex items-center justify-between gap-8 border-t border-slate-50 pt-2">
                                    <span className="text-slate-400 uppercase tracking-tighter">Sync Speed</span>
                                    <span className="text-indigo-600 font-black">{downlink} MB/s</span>
                                </div>
                            )}
                        </div>
                        {/* Tooltip Arrow (Top) */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-8 border-transparent border-b-white" />
                    </div>
                </div>

                <button onClick={toggleFullscreen} className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl border border-slate-100 transition-all">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 3h6v6" /><path d="M9 21H3v-6" /><path d="M21 3l-7 7" /><path d="M3 21l7-7" /></svg>
                </button>
            </div>
        )
    };

    const currentQuestion = questionsMap[currentQuestionId as string] || {
        id: currentQuestionId as string,
        type: 'Reading',
        title: isLoading ? 'Loading...' : `Question ${currentQuestionId}`,
        description: `<div class="flex items-center justify-center h-full text-slate-300 font-black text-2xl uppercase tracking-widest">${isLoading ? 'Loading Content...' : 'Content Not Available'}</div>`
    } as UnitQuestion;


    const handleDoneSuccess = () => {
        window.location.href = "/dashboard/student";
    };

    if (isLoading && sections.length === 0) {
        return <Loading />;
    }

    return (
        <div className="h-screen bg-white flex flex-col overflow-hidden">
            {navbarVisible && !isFeedbackMode && !isSuccessMode && <Navbar examConfig={examConfig} />}

            <div className="flex-1 flex overflow-hidden relative">
                {isSuccessMode ? (
                    <ExamSuccessView
                        userDetails={{
                            name: (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem(`exam_${slug}_metadata`) || '{}').name : '') || user?.name || "Student",
                            rollId: (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem(`exam_${slug}_metadata`) || '{}').rollNumber : '') || user?.rollNumber || "N/A",
                            examName: examTitle,
                            submittedAt: finalSubmitTime || new Date().toLocaleTimeString()
                        }}
                        onDone={handleDoneSuccess}
                    />
                ) : isFeedbackMode ? (
                    <ExamFeedbackView onSubmitFeedback={handleFeedbackSubmit} />
                ) : (isSubmitModalOpen || sections.find(s => s.id === (currentSectionId as any))?.status === 'submitted') ? (
                    <ExamSubmitView
                        sections={sections}
                        currentSectionId={currentSectionId}
                        onClose={() => setIsSubmitModalOpen(false)}
                        onSubmitSection={submitSection}
                        onSubmitExam={submitFullExam}
                        onQuestionClick={(sid, qid) => {
                            handleQuestionSelect(sid, qid);
                            setIsSubmitModalOpen(false);
                        }}
                    />
                ) : (
                    <>
                        <div
                            onMouseEnter={() => setIsSidebarHovered(true)}
                            onMouseLeave={() => setIsSidebarHovered(false)}
                            className="h-full flex"
                        >
                            <ExamSidebar
                                sections={sections as any}
                                currentSectionId={currentSectionId}
                                currentQuestionId={currentQuestionId}
                                onQuestionSelect={handleQuestionSelect}
                                collapsed={sidebarCollapsed}
                                hidden={sidebarHidden}
                                onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                                onToggleHidden={() => setSidebarHidden(!sidebarHidden)}
                                onToggleNavbar={() => setNavbarVisible(!navbarVisible)}
                                navbarVisible={navbarVisible}
                            />
                        </div>

                        <main className="flex-1 overflow-hidden bg-white relative flex flex-col">
                            <div className="flex-1 overflow-hidden h-full w-full">
                                <div className="h-full w-full">
                                    <UnitRenderer
                                        question={currentQuestion}
                                        activeTab="question"
                                        hideNav={true}
                                        onToggleReview={toggleReview}
                                        isMarkedForReview={isMarkedForReview}
                                        showSidebarToggle={false}
                                        hideTabs={true}
                                        contentFontSize={fontSize}
                                        isExamMode={true}
                                        onAnswerChange={handleAnswerChange}
                                        onPrevious={handlePrevious}
                                        onNext={handleNext}
                                        onSubmit={handleSubmitNext}
                                        currentAnswer={userAnswers[currentQuestionId as string]}
                                    />
                                </div>
                            </div>
                        </main>
                    </>
                )}
            </div>

            {/* Connection Alert Overlay */}
            {showOfflineAlert && (
                <div className="fixed bottom-10 right-10 z-[100] animate-in slide-in-from-bottom-5 duration-300">
                    <div className="bg-rose-600/95 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border-4 border-rose-500/50 backdrop-blur-md">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center animate-pulse shrink-0">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0 1 19 12.55" /><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" /><path d="M10.71 5.05A16 16 0 0 1 22.58 9" /><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" /></svg>
                        </div>
                        <div>
                            <h4 className="font-black text-sm uppercase tracking-wider">No Connection</h4>
                            <p className="text-rose-100 text-xs font-bold opacity-90">Please check your internet source.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
