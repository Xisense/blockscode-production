"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { BRAND } from "../constants/brand";
import { Mail, ArrowLeft, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useOrganization } from "../context/OrganizationContext";

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const { organization: orgContext } = useOrganization();

    const displayName = orgContext?.name || BRAND.name;
    const displayLogo = orgContext?.logo || BRAND.logoImage;
    const showSuffix = !orgContext; // Hide suffix if custom branding

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        // Simulate API delay
        setTimeout(() => {
            setIsLoading(false);
            setIsSubmitted(true);
        }, 1500);
    };

    return (
        <div className="min-h-screen w-full bg-[#f8fafc] flex items-center justify-center p-6 relative overflow-hidden font-sans">
            {/* Mesh Gradient Background Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--brand)]/5 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[120px]" />

            <div className="w-full max-w-[440px] z-10 animate-fade-in">
                <div className="bg-white/70 backdrop-blur-xl border border-white rounded-[32px] shadow-2xl shadow-slate-200/50 p-8 md:p-10 relative overflow-hidden">

                    {/* Brand Header */}
                    <div className="flex flex-col items-center mb-10">
                        <Link href="/login" className={`w-16 h-16 rounded-[20px] flex items-center justify-center overflow-hidden mb-4 transition-transform hover:scale-105 duration-300 ${!displayLogo ? 'bg-[var(--brand)] shadow-lg shadow-[var(--brand)]/20' : ''}`}>
                            {displayLogo ? (
                                <img src={displayLogo} alt="Logo" className="w-full h-full object-contain p-1" />
                            ) : (
                                <span className="text-white font-black text-xl tracking-wider">{BRAND.logoText}</span>
                            )}
                        </Link>
                        <div className="flex items-center gap-1">
                            <h1 className="text-3xl font-black text-slate-900 tracking-tighter">
                                {displayName}{showSuffix && <span className="text-[var(--brand)]">{BRAND.suffix}</span>}
                            </h1>
                        </div>
                        <p className="text-slate-500 font-bold text-sm mt-3 uppercase tracking-[0.15em] opacity-60">
                            Reset your password
                        </p>
                    </div>

                    {!isSubmitted ? (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <p className="text-slate-500 text-sm font-medium text-center px-2">
                                Enter your email address below and we'll send you instructions to reset your password.
                            </p>

                            {/* Email Field */}
                            <div className="space-y-2">
                                <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                    Email Address
                                </label>
                                <div className="group relative transition-all">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[var(--brand)] transition-colors">
                                        <Mail size={18} strokeWidth={2.5} />
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="name@company.com"
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold text-slate-700 placeholder:text-slate-300 outline-none transition-all focus:bg-white focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-light)]/50"
                                    />
                                </div>
                            </div>

                            {/* Reset Button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-[var(--brand)] text-white rounded-2xl py-4 font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-[var(--brand)]/20 hover:bg-[var(--brand-dark)] hover:-translate-y-0.5 transition-all active:translate-y-0 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 group mt-4"
                            >
                                {isLoading ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : (
                                    <>
                                        Send Instructions
                                        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>
                    ) : (
                        <div className="text-center py-4 animate-in fade-in zoom-in duration-500">
                            <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 size={32} strokeWidth={2.5} />
                            </div>
                            <h2 className="text-xl font-black text-slate-900 mb-3 tracking-tight">Check your email</h2>
                            <p className="text-slate-500 text-sm font-bold leading-relaxed mb-8">
                                We've sent password reset instructions to <span className="text-slate-900 underline decoration-[var(--brand)]/30 underline-offset-4">{email}</span>
                            </p>
                            <button
                                onClick={() => setIsSubmitted(false)}
                                className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[var(--brand)] transition-colors"
                            >
                                Didn't receive the email? Try again
                            </button>
                        </div>
                    )}

                    {/* Footer Link */}
                    <div className="mt-10 pt-8 border-t border-slate-50 text-center">
                        <Link href="/login" className="flex items-center justify-center gap-2 text-slate-400 font-bold text-xs tracking-tight hover:text-[var(--brand)] transition-colors group">
                            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                            Back to Sign In
                        </Link>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
        </div>
    );
}
