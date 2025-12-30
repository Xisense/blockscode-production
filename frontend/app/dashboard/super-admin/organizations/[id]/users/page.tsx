"use client";
import React from 'react';
import AdminUsersView from '@/app/components/Features/Admin/AdminUsersView';

export default function SuperAdminOrganizationUsersPage({ params }: { params: { id: string } }) {
    return <AdminUsersView basePath={`/dashboard/super-admin/organizations/${params.id}`} />;
}
