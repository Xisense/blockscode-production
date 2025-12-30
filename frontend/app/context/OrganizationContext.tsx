"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { BRAND } from "../constants/brand";

interface OrganizationBranding {
    name: string;
    logo: string | null;
    primaryColor: string;
    domain: string;
}

interface OrganizationContextType {
    organization: OrganizationBranding | null;
    loading: boolean;
}

const OrganizationContext = createContext<OrganizationContextType>({
    organization: null,
    loading: true
});

export const useOrganization = () => useContext(OrganizationContext);

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
    const [organization, setOrganization] = useState<OrganizationBranding | null>(null);
    const [loading, setLoading] = useState(true);
    const pathname = usePathname();

    useEffect(() => {
        const fetchOrgBranding = async () => {
            let hostname = window.location.hostname;
            let subdomain = '';

            // 1. Check for explicit simulation via query param (e.g. ?org=acme)
            const params = new URLSearchParams(window.location.search);
            const orgParam = params.get('org');

            if (orgParam) {
                subdomain = orgParam;
                if (hostname.includes('localhost')) {
                    localStorage.setItem('local_org_simulation', orgParam);
                }
            } else {
                // 2. Subdomain logic (for production)
                const parts = hostname.split('.');
                if (parts.length > 2) {
                    if (hostname.endsWith('blockscode.me')) {
                        subdomain = parts[0];
                    } else if (!hostname.includes('localhost')) {
                        subdomain = parts[0];
                    }
                }

                // 3. Simulation fallback for localhost
                if (!subdomain && hostname.includes('localhost')) {
                    subdomain = localStorage.getItem('local_org_simulation') || '';
                }
            }

            if (subdomain && !['www', 'app', 'api', 'admin'].includes(subdomain)) {
                try {
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/organization/public?domain=${subdomain}`);
                    if (res.ok) {
                        const data = await res.json();
                        setOrganization({
                            name: data.name,
                            logo: data.logo,
                            primaryColor: data.primaryColor || '#fc751b',
                            domain: data.domain
                        });

                        // Inject dynamic CSS variables
                        if (data.primaryColor) {
                            const color = data.primaryColor;
                            document.documentElement.style.setProperty('--brand', color);
                            // Generate variants (simplified version)
                            document.documentElement.style.setProperty('--brand-light', color + '20'); // 12% opacity hex
                            document.documentElement.style.setProperty('--brand-lighter', color + '08'); // 5% opacity hex
                            // For dark, we just use the same for now or simple darken logic if available
                            document.documentElement.style.setProperty('--brand-dark', color);
                        }
                    }
                } catch (error) {
                    console.error("Failed to load organization branding", error);
                }
            }
            setLoading(false);
        };

        fetchOrgBranding();
    }, []);

    return (
        <OrganizationContext.Provider value={{ organization, loading }}>
            {children}
        </OrganizationContext.Provider>
    );
}
