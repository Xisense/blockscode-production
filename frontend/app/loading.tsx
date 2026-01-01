"use client";
import React from "react";
import Image from "next/image";
import { BRAND } from "./constants/brand";
import { useOrganization } from "./context/OrganizationContext";

export default function Loading() {
    const { organization } = useOrganization();

    // Use organization logo if available, otherwise fallback to brand logo
    const displayLogo = organization?.logo || BRAND.logoImage;
    // Use first letter of organization name as fallback text if no logo
    const displayText = organization?.name ? organization.name[0] : BRAND.logoText;

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white">
            {/* Premium Loader Container */}
            <div className="relative flex items-center justify-center">
                {/* Outer Ring */}
                <div className="w-20 h-20 border-4 border-slate-100 rounded-full"></div>

                {/* Animated Spin Ring */}
                <div className="absolute w-20 h-20 border-4 border-t-[var(--brand)] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>

                {/* Inner Pulsing Logo/Brand */}
                <div className="absolute flex items-center justify-center">
                    <div className={`w-12 h-12 flex items-center justify-center overflow-hidden transition-all duration-500 ${!displayLogo ? 'bg-[var(--brand)] rounded-xl shadow-lg shadow-[var(--brand)]/30 p-1.5' : ''} animate-pulse`}>
                        {displayLogo ? (
                            <img src={displayLogo} alt="Logo" className="w-full h-full object-contain" />
                        ) : (
                            <span className="text-white font-black text-xs">{displayText}</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Loading Text */}
            <div className="mt-8 text-center">
                <h2 className="text-lg font-black text-slate-800 tracking-tight">Syncing your journey</h2>
                <div className="flex items-center justify-center gap-1 mt-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--brand)] animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--brand)] animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--brand)] animate-bounce"></div>
                </div>
            </div>

            {/* Glassy Background Overlay */}
            <div className="absolute top-0 left-0 w-full h-1 bg-slate-50 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-transparent via-[var(--brand)] to-transparent w-full animate-[loading-bar_1.5s_infinite]"></div>
            </div>

            <style jsx>{`
                @keyframes loading-bar {
                  0% { transform: translateX(-100%); }
                  100% { transform: translateX(100%); }
                }
            `}</style>
        </div>
    );
}
