"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthService } from "../../services/api/AuthService";
import Loading from "../loading";

export default function LogoutPage() {
  const router = useRouter();
  useEffect(() => {
    AuthService.logout();
    // fallback in case window.location.href doesn't work
    router.replace("/login");
  }, [router]);
  return <Loading />;
}
