import { AuthService } from "./AuthService";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const getHeaders = (hasBody = true) => {
    const token = AuthService.getToken();
    const headers: any = {
        'Authorization': `Bearer ${token}`
    };
    if (hasBody) {
        headers['Content-Type'] = 'application/json';
    }
    return headers;
};

export interface Student {
    id: string;
    name: string;
    email?: string;
    rollNumber?: string;
    ip?: string;
    status: string;
    lastActivity: string;
    tabOuts: number;
    tabIns: number;
    vmDetected: boolean;
    vmType?: string;
    isHighRisk: boolean;
    appVersion?: string;
    monitors?: number;
    loginCount?: number;
    sleepDuration?: string;
    startTime?: string;
    endTime?: string;
    logs: any[];
}

export const TeacherService = {
    async getStats() {
        try {
            const res = await fetch(`${BASE_URL}/teacher/stats`, {
                headers: getHeaders(false)
            });
            if (!res.ok) throw new Error('Failed to fetch stats');
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async getModules() {
        try {
            const res = await fetch(`${BASE_URL}/teacher/modules`, {
                headers: getHeaders(false)
            });
            if (!res.ok) throw new Error('Failed to fetch modules');
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async getRecentSubmissions() {
        try {
            const res = await fetch(`${BASE_URL}/teacher/submissions/recent`, {
                headers: getHeaders(false)
            });
            if (!res.ok) throw new Error('Failed to fetch submissions');
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async getSubmission(examId: string, userId: string) {
        try {
            const res = await fetch(`${BASE_URL}/teacher/exams/${examId}/submissions/${userId}`, {
                headers: getHeaders(false)
            });
            if (!res.ok) throw new Error('Failed to fetch submission');
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async getStudents() {
        try {
            const res = await fetch(`${BASE_URL}/teacher/students`, {
                headers: getHeaders(false)
            });
            if (!res.ok) throw new Error('Failed to fetch students');
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async getStudentAnalytics(studentId: string) {
        try {
            const res = await fetch(`${BASE_URL}/teacher/students/${studentId}/analytics`, { headers: getHeaders(false) });
            if (!res.ok) throw new Error('Failed to fetch student analytics');
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async getStudentAttempts(studentId: string) {
        try {
            const res = await fetch(`${BASE_URL}/teacher/students/${studentId}/attempts`, { headers: getHeaders(false) });
            if (!res.ok) throw new Error('Failed to fetch student attempts');
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async getStudentUnitSubmissions(studentId: string) {
        try {
            const res = await fetch(`${BASE_URL}/teacher/students/${studentId}/unit-submissions`, { headers: getHeaders(false) });
            if (!res.ok) throw new Error('Failed to fetch student unit submissions');
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async enrollStudent(courseId: string, studentId: string) {
        try {
            const res = await fetch(`${BASE_URL}/teacher/courses/${courseId}/enroll/${studentId}`, {
                method: 'POST',
                headers: getHeaders(false)
            });
            if (!res.ok) throw new Error('Failed to enroll student');
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async enrollByEmails(courseId: string, emails: string[]) {
        try {
            const res = await fetch(`${BASE_URL}/teacher/courses/${courseId}/enroll`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ emails })
            });
            if (!res.ok) throw new Error('Failed to enroll students');
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async getCourses() {
        try {
            const res = await fetch(`${BASE_URL}/teacher/courses`, {
                headers: getHeaders(false)
            });
            if (!res.ok) throw new Error('Failed to fetch courses');
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async getCourse(id: string) {
        try {
            const res = await fetch(`${BASE_URL}/teacher/courses/${id}`, {
                headers: getHeaders(false)
            });
            if (!res.ok) throw new Error('Failed to fetch course');
            const data = await res.json();

            // Transform for Builder
            return {
                ...data,
                sections: (data.modules || []).map((m: any) => ({
                    id: m.id,
                    title: m.title,
                    questions: (m.units || []).map((u: any) => ({
                        id: u.id,
                        title: u.title,
                        type: u.type,
                        ...(u.content as object)
                    }))
                })),
                tests: (data.tests || []).map((t: any) => ({
                    ...t,
                    questions: t.questions || []
                }))
            };
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async createCourse(data: any) {
        try {
            // Transform for Backend
            const payload = {
                ...data,
                modules: (data.sections || []).map((s: any, idx: number) => ({
                    title: s.title,
                    order: idx,
                    units: (s.questions || []).map((q: any, qIdx: number) => {
                        const { id, title, type, ...content } = q;
                        return { title, type, order: qIdx, content };
                    })
                }))
            };

            const res = await fetch(`${BASE_URL}/teacher/courses`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('Failed to create course');
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async updateCourse(id: string, data: any) {
        try {
            // Transform for Backend
            const payload = {
                ...data,
                modules: (data.sections || []).map((s: any, idx: number) => ({
                    id: String(s.id).startsWith('sec-') ? undefined : s.id,
                    title: s.title,
                    order: idx,
                    units: (s.questions || []).map((q: any, qIdx: number) => {
                        const { id: qId, title, type, ...content } = q;
                        return {
                            id: String(qId).startsWith('q-') ? undefined : qId,
                            title,
                            type,
                            order: qIdx,
                            content
                        };
                    })
                })),
                tests: (data.tests || []).map((t: any) => ({
                    ...t,
                    id: String(t.id).startsWith('test-') ? undefined : t.id,
                    questions: t.questions || []
                }))
            };

            const res = await fetch(`${BASE_URL}/teacher/courses/${id}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('Failed to update course');
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async deleteCourse(id: string) {
        try {
            const res = await fetch(`${BASE_URL}/teacher/courses/${id}`, {
                method: 'DELETE',
                headers: getHeaders(false)
            });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to delete course');
            }
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async getExams() {
        try {
            const res = await fetch(`${BASE_URL}/teacher/exams`, {
                headers: getHeaders(false)
            });
            if (!res.ok) throw new Error('Failed to fetch exams');
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async getExam(id: string) {
        try {
            const res = await fetch(`${BASE_URL}/teacher/exams/${id}`, {
                headers: getHeaders(false)
            });
            if (!res.ok) throw new Error('Failed to fetch exam');
            const data = await res.json();

            // Transform JSON questions to sections for builder
            return {
                ...data,
                isVisible: data.isActive,
                sections: Array.isArray(data.questions) ? data.questions : (data.questions?.sections || [])
            };
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async createExam(data: any) {
        try {
            const payload = {
                ...data,
                isActive: data.isVisible ?? true
            };

            const res = await fetch(`${BASE_URL}/teacher/exams`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to create exam');
            }
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async updateExam(id: string, data: any) {
        try {
            const res = await fetch(`${BASE_URL}/teacher/exams/${id}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Failed to update exam');
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async deleteExam(id: string) {
        try {
            const res = await fetch(`${BASE_URL}/teacher/exams/${id}`, {
                method: 'DELETE',
                headers: getHeaders(false)
            });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to delete exam');
            }
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async getMonitoredStudents(examId: string) {
        try {
            const res = await fetch(`${BASE_URL}/teacher/exams/${examId}/monitor`, {
                headers: getHeaders(false)
            });
            if (!res.ok) throw new Error('Failed to fetch active students');
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async getFeedbacks(examId: string) {
        try {
            const res = await fetch(`${BASE_URL}/teacher/exams/${examId}/feedbacks`, {
                headers: getHeaders(false)
            });
            if (!res.ok) throw new Error('Failed to fetch feedbacks');
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async terminateSession(examId: string, studentId: string) {
        try {
            const res = await fetch(`${BASE_URL}/teacher/exams/${examId}/terminate/${studentId}`, {
                method: 'POST',
                headers: getHeaders(false)
            });
            if (!res.ok) throw new Error('Failed to terminate session');
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async unterminateSession(examId: string, studentId: string) {
        try {
            const res = await fetch(`${BASE_URL}/teacher/exams/${examId}/unterminate/${studentId}`, {
                method: 'POST',
                headers: getHeaders(false)
            });
            if (!res.ok) throw new Error('Failed to unterminate session');
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async getExamResults(examId: string) {
        try {
            const res = await fetch(`${BASE_URL}/teacher/exams/${examId}/results`, {
                headers: getHeaders(false)
            });
            if (!res.ok) throw new Error('Failed to fetch exam results');
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async updateSubmissionScore(examId: string, sessionId: string, score: number) {
        try {
            const res = await fetch(`${BASE_URL}/teacher/exams/${examId}/submissions/${sessionId}/score`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify({ score })
            });
            if (!res.ok) throw new Error('Failed to update score');
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    },

    async publishResults(examId: string) {
        try {
            const res = await fetch(`${BASE_URL}/teacher/exams/${examId}/publish`, {
                method: 'POST',
                headers: getHeaders(false)
            });
            if (!res.ok) throw new Error('Failed to publish results');
            return await res.json();
        } catch (error) {
            console.error('[TeacherService] Error', error);
            throw error;
        }
    }
};
