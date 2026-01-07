"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthService } from "@/services/api/AuthService";

export function useRoleGuard(allowedRoles: string[]) {
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        // Soft check only - strict check matches happen via API cookies
        const user = AuthService.getUser();
        const role = user?.role;

        if (!user) {
            router.push("/login");
            return;
        }

        if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
            // Redirect to their own dashboard if they try to access another one
            if (role === 'STUDENT') router.push("/dashboard/student");
            else if (role === 'TEACHER') router.push("/dashboard/teacher");
            else if (role === 'ADMIN') router.push("/dashboard/admin");
            else if (role === 'SUPER_ADMIN') router.push("/dashboard/super-admin");
            else router.push("/login"); // Fallback
            return;
        }

        setIsAuthorized(true);
    }, [allowedRoles, router]);

    return { isAuthorized };
}
