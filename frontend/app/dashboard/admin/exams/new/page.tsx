"use client";
import React from 'react';
import ExamEditor from '@/app/components/Features/Exams/ExamEditor';

export default function CreateExamPage() {
    return <ExamEditor userRole="admin" basePath="/dashboard/admin" />;
}
