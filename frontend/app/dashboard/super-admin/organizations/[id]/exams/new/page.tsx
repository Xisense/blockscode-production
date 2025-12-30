"use client";
import React from 'react';
import ExamEditor from '@/app/components/Features/Exams/ExamEditor';

export default function SuperAdminOrganizationExamNew({ params }: { params: { id: string } }) {
    return <ExamEditor userRole="admin" basePath={`/dashboard/super-admin/organizations/${params.id}`} />;
}
