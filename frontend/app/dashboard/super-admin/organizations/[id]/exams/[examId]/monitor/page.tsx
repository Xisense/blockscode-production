"use client";
import React from 'react';
import ExamMonitorView from '@/app/components/Features/Exams/ExamMonitorView';
import Navbar from '@/app/components/Navbar';

export default function SuperAdminOrganizationExamMonitor({ params }: { params: { id: string, examId: string } }) {
    const basePath = `/dashboard/super-admin/organizations/${params.id}`;
    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            <Navbar basePath={basePath} userRole="admin" />
            <ExamMonitorView
                examId={params.examId}
                userRole="admin"
            />
        </div>
    );
}
