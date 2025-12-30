"use client";
import React from "react";
import CourseEditor from "@/app/components/Features/Courses/CourseEditor";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AlertModal from "@/app/components/Common/AlertModal";

export default function EditCoursePage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean, title: string, message: string, type?: 'danger' | 'warning' | 'info' }>({ isOpen: false, title: '', message: '' });

    // Mock data based on ID - in a real app, this would be a fetch call
    const mockCourse = {
        title: "Full Stack Mastery",
        shortDescription: "Learn from frontend to backend in this comprehensive course.",
        longDescription: "<h1>Introduction</h1><p>Welcome to the masterclass.</p>",
        difficulty: "Advanced",
        tags: ["React", "Node.js", "MySQL"],
        isVisible: true,
        sections: [
            {
                id: "sec-1",
                title: "Frontend Foundations",
                questions: [
                    {
                        id: "q-1",
                        type: "Reading",
                        title: "Introduction to HTML5",
                        problemStatement: "Learn the basics of HTML5.",
                        marks: 0,
                        difficulty: "Beginner",
                        tags: ["HTML"],
                        readingConfig: {
                            contentBlocks: [
                                { id: '1', type: 'text', content: '<p>HTML is the standard markup language...</p>' }
                            ]
                        }
                    }
                ]
            }
        ]
    };

    const handleDelete = () => {
        // Mock delete logic
        setAlertConfig({
            isOpen: true,
            title: "Deleted",
            message: "Course deleted successfully!",
            type: "info"
        });
        setTimeout(() => router.push("/dashboard/admin/exams"), 1000);
    };

    return (
        <div>
            <CourseEditor initialData={mockCourse as any} onDelete={handleDelete} userRole="admin" />
            <AlertModal
                isOpen={alertConfig.isOpen}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type || "info"}
                confirmLabel="Close"
                onConfirm={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
                onCancel={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );
}
