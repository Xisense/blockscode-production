"use client";
import React from "react";
import Navbar from "@/app/components/Navbar";
import ExamResultsView from "@/app/components/Features/Exams/ExamResultsView";

export default function AdminExamResultsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = React.use(params);
    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            {/* Admin Navbar or Sidebar would typically go here, but using generic Navbar for now or we might need an AdminNavbar */}
            <Navbar />
            <ExamResultsView examId={id} userRole="admin" />
        </div>
    );
}
