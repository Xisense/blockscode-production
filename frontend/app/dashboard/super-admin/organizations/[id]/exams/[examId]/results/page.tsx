"use client";
import React from 'react';
import ExamResultsView from '@/app/components/Features/Exams/ExamResultsView';
import Navbar from '@/app/components/Navbar';

export default function SuperAdminOrganizationExamResults({ params }: { params: { id: string, examId: string } }) {
    const basePath = `/dashboard/super-admin/organizations/${params.id}`;
    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            <Navbar basePath={basePath} userRole="admin" />
            <ExamResultsView
                examId={params.examId}
                userRole="admin"
                basePath={basePath}
            />
        </div>
    );
}
