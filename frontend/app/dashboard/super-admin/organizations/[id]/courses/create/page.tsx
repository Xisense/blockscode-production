"use client";
import React from 'react';
import CourseEditor from '@/app/components/Features/Courses/CourseEditor';

export default function SuperAdminOrganizationCourseNew({ params }: { params: Promise<{ id: string }> }) {
    const { id } = React.use(params);
    return <CourseEditor userRole="admin" basePath={`/dashboard/super-admin/organizations/${id}`} organizationId={id} />;
}
