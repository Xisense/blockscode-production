import React from "react";
import CourseEditor from "@/app/components/Features/Courses/CourseEditor";

export default function CreateCoursePage() {
    return (
        <div className="teacher-theme">
            <CourseEditor userRole="teacher" />
        </div>
    );
}
