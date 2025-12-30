"use client";
import React from 'react';
import AdminDashboardView from '@/app/components/Features/Admin/AdminDashboardView';

export default function SuperAdminOrganizationDashboard({ params }: { params: { id: string } }) {
    // In a real app, you might fetch organization details based on params.id
    // to potentially theme or customize the dashboard view further.
    return (
        <AdminDashboardView basePath={`/dashboard/super-admin/organizations/${params.id}`} />
    );
}
