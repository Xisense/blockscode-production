"use client";
import React from "react";
import Navbar from "@/app/components/Navbar";
import ExamResultsView from "@/app/components/Features/Exams/ExamResultsView";

export default function ExamResultsPage({ params }: { params: { id: string } }) {
    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            <Navbar />
            <ExamResultsView examId={params.id} userRole="teacher" />
        </div>
    );
}
