"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiClient, API_BASE_URL, getAuthToken, getActiveOrganizationId, setActiveOrganizationId, setAuthToken } from "@/lib/api";
import { waitForApiReady } from "@/lib/api/readiness.mjs";

interface Organization { id: string; name: string; role: string; tier: string; }
interface Account { id: string; full_name: string; email: string; is_platform_admin: boolean; organizations: Organization[]; }
interface AccountContextValue {
  user: Account | null; organization: Organization | null; loading: boolean; error: string | null;
  chooseOrganization: (id: string) => void; logout: () => void;
}
const Context = createContext<AccountContextValue>({ user: null, organization: null, loading: true, error: null, chooseOrganization: () => {}, logout: () => {} });
export const useAccount = () => useContext(Context);

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const protectedPage = ["/dashboard", "/partner", "/platform-admin", "/audit"].some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const [user, setUser] = useState<Account | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const logout = useCallback(() => {
    setAuthToken(null); setActiveOrganizationId(null);
    localStorage.removeItem("launchcomply_user");
    localStorage.removeItem("launchcomply_token");
    setUser(null); setOrganization(null); setLoading(false);
    router.replace("/login");
  }, [router]);
  useEffect(() => {
    if (!protectedPage) { setLoading(false); return; }
    if (!getAuthToken()) { logout(); return; }
    let active = true;
    setLoading(true); setError(null); setUser(null); setOrganization(null);
    (async () => {
      try {
        await waitForApiReady(API_BASE_URL);
        const account = await apiClient<Account>("/auth/me");
        if (!active) return;
        const selected = account.organizations.find(item => item.id === getActiveOrganizationId()) || account.organizations[0] || null;
        setUser(account); setOrganization(selected); setActiveOrganizationId(selected?.id || null);
      } catch (failure) {
        if (active) setError(failure instanceof Error ? failure.message : "Unable to load your account.");
      } finally { if (active) setLoading(false); }
    })();
    const expired = () => logout();
    const storageChanged = (event: StorageEvent) => { if (event.key === "lc_access_token" && !event.newValue) logout(); };
    window.addEventListener("launchcomply:unauthorized", expired);
    window.addEventListener("storage", storageChanged);
    return () => { active = false; window.removeEventListener("launchcomply:unauthorized", expired); window.removeEventListener("storage", storageChanged); };
  }, [protectedPage, logout]);
  const chooseOrganization = (id: string) => {
    const selected = user?.organizations.find(item => item.id === id);
    if (selected) { setActiveOrganizationId(id); setOrganization(selected); }
  };
  return <Context.Provider value={{ user, organization, loading, error, chooseOrganization, logout }}>{children}</Context.Provider>;
}
