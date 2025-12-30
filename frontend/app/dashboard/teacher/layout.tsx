"use client";
import React from "react";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import Loading from "@/app/loading";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
    const { isAuthorized } = useRoleGuard(['TEACHER']);

    if (!isAuthorized) return <Loading />;

    return (
        <div className="min-h-screen">
            {children}
        </div>
    );
}
