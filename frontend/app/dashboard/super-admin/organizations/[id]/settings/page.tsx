"use client";
import React, { useState, useEffect } from 'react';
import AdminSettingsView from '@/app/components/Features/Admin/AdminSettingsView';
import { SuperAdminService } from '@/services/api/SuperAdminService';

export default function SuperAdminOrganizationSettings({ params }: { params: { id: string } }) {
    const [orgData, setOrgData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const data = await SuperAdminService.getOrganization(params.id);
                // Map DB schema to view's expected format if necessary
                setOrgData({
                    ...data,
                    subdomain: data.domain?.split('.')[0] || '',
                    contact: '', // Map real field if exists
                    permissions: {
                        canCreateExams: true,
                        canCreateCourses: true,
                        canManageUsers: true,
                    }
                });
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [params.id]);

    const handleSave = async (updatedData: any) => {
        try {
            await SuperAdminService.updateOrganization(params.id, updatedData);
            alert('Settings saved successfully!');
        } catch (e) {
            console.error(e);
            alert('Failed to save settings');
        }
    };

    if (loading) return <div className="p-10 text-slate-400 font-bold">Loading organization settings...</div>;

    return (
        <AdminSettingsView
            basePath="/dashboard/super-admin"
            userRole="super-admin"
            isSuperAdminView={true}
            initialData={orgData}
            onSave={handleSave}
        />
    );
}
