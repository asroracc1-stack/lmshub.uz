import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/axios";

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
}

const FREE_ACCESS: PackAccess = {
  ielts: false,
  sat: false,
  milliy: false,
  packCode: null,
  expiresAt: null,
  activePack: "FREE",
  loading: false,
};

const FULL_ACCESS: PackAccess = {
  ielts: true,
  sat: true,
  milliy: true,
  packCode: "ADMIN",
  expiresAt: null,
  activePack: "ELITE",
  loading: false,
};

/**
 * Fetches the current user's active subscription pack from the backend.
 * Admins always have full access.
 */
export function usePackAccess(): PackAccess {
  const { role, user } = useAuth();
  const [state, setState] = useState<PackAccess>({ ...FREE_ACCESS, loading: true });

  // Admins and managers always have full access
  const isPrivileged = role === "super_admin" || role === "payment_manager" || role === "admin";

  useEffect(() => {
    if (!user) {
      setState({ ...FREE_ACCESS, loading: false });
      return;
    }
    if (isPrivileged) {
      setState({ ...FULL_ACCESS, loading: false });
      return;
    }

    // Fetch from backend
    api.get("/profile/my-subscription")
      .then(({ data }) => {
        const packType: ActivePackType = data.packType || "FREE";
        const hasActive: boolean = data.hasActive === true;

        // Determine which sections are unlocked based on pack type
        // PRO and ELITE unlock all sections
        const hasAccess = hasActive && packType !== "FREE";

        setState({
          ielts: hasAccess,
          sat: hasAccess,
          milliy: hasAccess,
          packCode: packType,
          expiresAt: data.expiresAt || null,
          activePack: packType,
          loading: false,
        });
      })
      .catch(() => {
        setState({ ...FREE_ACCESS, loading: false });
      });
  }, [user?.id, role]);

  return state;
}

export function hasSection(access: PackAccess, key: SectionKey): boolean {
  return access[key];
}

/**
 * Check if user can access a test with a specific required pack type.
 * FREE tests are always accessible.
 * PRO tests need PRO or ELITE subscription.
 * ELITE tests need ELITE subscription.
 */
export function canAccessPack(
  access: PackAccess,
  requiredPack: string,
  isPrivileged: boolean
): boolean {
  if (isPrivileged) return true;
  const req = (requiredPack || "free").toLowerCase();
  if (req === "free") return true;
  if (req === "pro") return access.activePack === "PRO" || access.activePack === "ELITE";
  if (req === "elite") return access.activePack === "ELITE";
  return true;
}
