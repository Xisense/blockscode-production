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
                // CACHE: Check localStorage first
                const localCache = localStorage.getItem(`org_cache_${subdomain}`);
                if (localCache) {
                    try {
                        const { data, timestamp } = JSON.parse(localCache);
                        // Valid for 1 hour
                        if (Date.now() - timestamp < 3600 * 1000) {
                            setOrganization(data);
                            setLoading(false);
                            // Background refresh logic could go here if needed, but returning early for speed
                            injectBrandColors(data);
                            return;
                        }
                    } catch (e) {
                        localStorage.removeItem(`org_cache_${subdomain}`);
                    }
                }

                try {
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/organization/public?domain=${subdomain}`);
                    if (res.ok) {
                        const data = await res.json();
                        const orgData = {
                            name: data.name,
                            logo: data.logo,
                            primaryColor: data.primaryColor || '#fc751b',
                            domain: data.domain
                        };
                        setOrganization(orgData);
                        
                        // Save to cache
                        localStorage.setItem(`org_cache_${subdomain}`, JSON.stringify({
                            data: orgData,
                            timestamp: Date.now()
                        }));

                        injectBrandColors(orgData);
                    }
                } catch (error) {
                    console.error("Failed to load organization branding", error);
                }
            }
            setLoading(false);
        };

        fetchOrgBranding();
    }, []);

    const injectBrandColors = (data: OrganizationBranding) => {
        if (data.primaryColor) {
            const color = data.primaryColor;
            document.documentElement.style.setProperty('--brand', color);
            document.documentElement.style.setProperty('--brand-light', color + '20');
            document.documentElement.style.setProperty('--brand-lighter', color + '08');
            document.documentElement.style.setProperty('--brand-dark', color);
        }
    };

    return (
        <OrganizationContext.Provider value={{ organization, loading }}>
            {children}
        </OrganizationContext.Provider>
    );
}
