"use client";
import React from "react";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import Loading from "@/app/loading";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { isAuthorized } = useRoleGuard(['ADMIN']);

    if (!isAuthorized) return <Loading />;

    return (
        <div className="min-h-screen">
            {children}
        </div>
    );
}
