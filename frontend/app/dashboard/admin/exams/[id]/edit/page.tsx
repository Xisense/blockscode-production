"use client";
import React from 'react';
import ExamEditor from '@/app/components/Features/Exams/ExamEditor';

export default function EditExamPage({ params }: { params: { id: string } }) {
    // Mock data for the exam (in real app, fetch using params.id)
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
                        title: "What is typeof []?",
                        problemStatement: "Identify the type of an array.",
                        marks: 5,
                        difficulty: "Medium",
                        tags: ["Basics"],
                        options: [
                            { id: "opt-1", text: "object", isCorrect: true },
                            { id: "opt-2", text: "array", isCorrect: false }
                        ]
                    }
                ]
            }
        ]
    };

    return <ExamEditor initialData={mockExam} userRole="admin" basePath="/dashboard/admin" />;
}
