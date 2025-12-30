"use client";
import React from 'react';
import CourseEditor from '@/app/components/Features/Courses/CourseEditor';

export default function SuperAdminOrganizationCourseEdit({ params }: { params: { id: string, courseId: string } }) {
    // In real app, fetch course data
    const mockCourse = {
        title: "Advanced React Patterns",
        shortDescription: "Master modern React.",
        longDescription: "<p>Deep dive into hooks and patterns.</p>",
        difficulty: "Advanced" as const,
        tags: ["React", "Advanced"],
        isVisible: true,
        sections: []
    };

    return <CourseEditor initialData={mockCourse} userRole="admin" basePath={`/dashboard/super-admin/organizations/${params.id}`} />;
}
