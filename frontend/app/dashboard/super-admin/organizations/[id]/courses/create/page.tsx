"use client";
import React from 'react';
import CourseEditor from '@/app/components/Features/Courses/CourseEditor';

export default function SuperAdminOrganizationCourseNew({ params }: { params: { id: string } }) {
    return <CourseEditor userRole="admin" basePath={`/dashboard/super-admin/organizations/${params.id}`} />;
}
