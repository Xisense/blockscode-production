"use client";
import React, { useEffect, useState } from "react";
import AdminDashboardView from "@/app/components/Features/Admin/AdminDashboardView";
import { requireAuthClient } from "@/hooks/requireAuthClient";
import Loading from "@/app/loading";

export default function AdminDashboardPage() {
    const [authChecked, setAuthChecked] = useState(false);
    useEffect(() => {
        if (!requireAuthClient("/login")) return;
        setAuthChecked(true);
    }, []);
    if (!authChecked) return <Loading />;
    return <AdminDashboardView />;
}
