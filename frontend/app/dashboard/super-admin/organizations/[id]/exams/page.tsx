 "use client";
import React from 'react';
import AdminExamsView from '@/app/components/Features/Admin/AdminExamsView';

export default function SuperAdminOrganizationExams({ params }: { params: { id: string } }) {
    return (
        <AdminExamsView basePath={`/dashboard/super-admin/organizations/${params.id}`} />
    );
}
