import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface ExecutionResult {
    stdout: string;
    stderr: string;
    output: string;
    code: number;
    signal: string;
}

export interface SubmissionResult {
    status: string; // "Accepted", "Wrong Answer"
    passedTests: number;
    totalTests: number;
    results: {
        input: string;
        expectedOutput: string;
        actualOutput: string;
        passed: boolean;
        status: string;
        error: string | null;
    }[];
}

export const CodeExecutionService = {
    run: async (language: string, code: string, input?: string): Promise<ExecutionResult> => {
        try {
            const token = localStorage.getItem('auth_token');
            const response = await axios.post(`${API_URL}/code/run`, {
                language,
                code,
                input,
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            console.error('Run code error', error);
            throw error;
        }
    },

    submit: async (unitId: string, language: string, code: string, examId?: string): Promise<SubmissionResult> => {
        try {
            const token = localStorage.getItem('auth_token');
            const response = await axios.post(`${API_URL}/code/submit`, {
                unitId,
                language,
                code,
                examId,
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error) {
            console.error('Submit code error', error);
            throw error;
        }
    },
};
