import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/axios";
import { useQuery } from "@tanstack/react-query";

export type SectionKey = "ielts" | "sat" | "milliy";

export type ActivePackType = "FREE" | "PRO" | "ELITE";

export interface PackAccess {
  ielts: boolean;
  sat: boolean;
  milliy: boolean;
  packCode: string | null;
  expiresAt: string | null;
  activePack: ActivePackType;  // "FREE" | "PRO" | "ELITE"
  loading: boolean;
  packageId?: string | null;
  remainingDays?: number | null;
  status?: string | null;
}

const FREE_ACCESS: PackAccess = {
  ielts: false,
  sat: false,
  milliy: false,
  packCode: null,
  expiresAt: null,
  activePack: "FREE",
  loading: false,
  packageId: null,
  remainingDays: null,
  status: "NONE",
};

const FULL_ACCESS: PackAccess = {
  ielts: true,
  sat: true,
  milliy: true,
  packCode: "ADMIN",
  expiresAt: null,
  activePack: "ELITE",
  loading: false,
  packageId: null,
  remainingDays: null,
  status: "ACTIVE",
};

/**
 * Fetches the current user's active subscription pack from the backend.
 * Uses React Query for automatic background refetching every 15 seconds
 * so the UI updates automatically after Telegram approval without page reload.
 * Admins always have full access.
 */
export function usePackAccess(): PackAccess {
  const { role, user } = useAuth();

  // Admins and managers always have full access — no need to fetch
  const isPrivileged =
    role === "super_admin" ||
    role === "payment_manager" ||
    role === "admin";

  const { data, isLoading } = useQuery<PackAccess>({
    queryKey: ["pack-access", user?.id],
    queryFn: async (): Promise<PackAccess> => {
      const { data } = await api.get("/profile/my-subscription");

      const packType: ActivePackType = (data.packType || "FREE") as ActivePackType;
      const hasActive: boolean =
        data.hasActive === true ||
        data.status === "ACTIVE";

      const hasAccess = hasActive && packType !== "FREE";

      return {
        ielts: hasAccess,
        sat: hasAccess,
        milliy: hasAccess,
        packCode: packType,
        expiresAt: data.expiresAt || null,
        activePack: packType,
        loading: false,
        packageId: data.packageId || data.packId || null,
        remainingDays: data.remainingDays ?? null,
        status: hasActive ? "ACTIVE" : "NONE",
      };
    },
    // Only fetch for non-privileged authenticated users
    enabled: !!user && !isPrivileged,
    // Never use cached data — always show current subscription state
    staleTime: 0,
    // Refetch every 10 seconds in background — catches Telegram approvals automatically
    refetchInterval: 10000,
    // Refetch when user switches back to this tab
    refetchOnWindowFocus: true,
    // Refetch when internet reconnects
    refetchOnReconnect: true,
    // On error, return FREE access (don't break the app)
    placeholderData: { ...FREE_ACCESS, loading: false },
  });

  // Privileged users always get full access immediately
  if (isPrivileged) {
    return FULL_ACCESS;
  }

  // Not logged in
  if (!user) {
    return { ...FREE_ACCESS, loading: false };
  }

  // Loading state
  if (isLoading && !data) {
    return { ...FREE_ACCESS, loading: true };
  }

  return data ?? { ...FREE_ACCESS, loading: false };
}

export function hasSection(access: PackAccess, key: SectionKey): boolean {
  return access[key];
}

/**
 * Check if user can access a test with a specific required pack type.
 * FREE tests are always accessible.
 * PRO tests need PRO or ELITE subscription.
 * ELITE tests need ELITE subscription.
 *
 * IMPORTANT: Returns true while loading to prevent false-negative locking.
 * The correct access state will be applied once the query resolves.
 */
export function canAccessPack(
  access: PackAccess,
  requiredPack: string,
  isPrivileged: boolean
): boolean {
  if (isPrivileged) return true;
  // While subscription data is loading, don't block access (prevents false locks)
  if (access.loading) return true;
  const req = (requiredPack || "free").toLowerCase();
  if (req === "free") return true;
  if (req === "pro") return access.activePack === "PRO" || access.activePack === "ELITE";
  if (req === "elite") return access.activePack === "ELITE";
  return true;
}
