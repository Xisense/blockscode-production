"use client";
import React from "react";
import Navbar from "@/app/components/Navbar";
import ExamResultsView from "@/app/components/Features/Exams/ExamResultsView";

export default function ExamResultsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = React.use(params);

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            <Navbar userRole="teacher" />
            <ExamResultsView examId={id} userRole="teacher" />
        </div>
    );
}
