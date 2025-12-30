import React from "react";
import CourseEditor from "@/app/components/Features/Courses/CourseEditor";

export default function CreateCoursePage() {
    return (
        <div>
            <CourseEditor userRole="admin" />
        </div>
    );
}
