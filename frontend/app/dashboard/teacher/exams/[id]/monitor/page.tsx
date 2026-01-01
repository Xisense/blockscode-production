"use client";
import React from "react";
import Navbar from "@/app/components/Navbar";
import ExamMonitorView from "@/app/components/Features/Exams/ExamMonitorView";

export default function ExamMonitorPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = React.use(params);

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            <Navbar />
            <ExamMonitorView examId={id} userRole="teacher" />
        </div>
    );
}
