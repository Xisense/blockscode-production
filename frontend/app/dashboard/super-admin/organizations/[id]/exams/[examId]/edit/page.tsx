"use client";
import React from 'react';
import ExamEditor from '@/app/components/Features/Exams/ExamEditor';

export default function SuperAdminOrganizationExamEdit({ params }: { params: { id: string, examId: string } }) {
    // In real app, fetch exam data using params.examId
    const mockExam = {
        title: "JavaScript Fundamentals",
        shortDescription: "Test your core JS knowledge.",
        longDescription: "<p>Assessing variables, functions, and objects.</p>",
        difficulty: "Intermediate",
        tags: ["JavaScript", "Basics"],
        isVisible: true,
        sections: [
            {
                id: "sec-1",
                title: "Core Assessment",
                questions: [
                    {
                        id: "q-1",
                        type: "MCQ",
                        title: "Test Question",
                        problemStatement: "This is a test question for impersonation view.",
                        marks: 5,
                        difficulty: "Medium",
                        tags: ["Basics"],
                        options: [
                            { id: "opt-1", text: "Option A", isCorrect: true },
                            { id: "opt-2", text: "Option B", isCorrect: false }
                        ]
                    }
                ]
            }
        ]
    };

    return <ExamEditor initialData={mockExam} userRole="admin" basePath={`/dashboard/super-admin/organizations/${params.id}`} />;
}
