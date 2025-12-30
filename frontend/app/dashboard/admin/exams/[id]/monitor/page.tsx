"use client";
import React from "react";
import Navbar from "@/app/components/Navbar";
import ExamMonitorView from "@/app/components/Features/Exams/ExamMonitorView";

export default function AdminExamMonitorPage({ params }: { params: { id: string } }) {
    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            <Navbar />
            <ExamMonitorView examId={params.id} userRole="admin" />
        </div>
    );
}
