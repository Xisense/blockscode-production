"use client";
import React from 'react';
import ExamEditor from '@/app/components/Features/Exams/ExamEditor';

export default function SuperAdminOrganizationExamNew({ params }: { params: Promise<{ id: string }> }) {
    const { id } = React.use(params);
    return <ExamEditor userRole="admin" basePath={`/dashboard/super-admin/organizations/${id}`} organizationId={id} />;
}
