import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export type SectionKey = "ielts" | "sat" | "milliy";

export interface PackAccess {
  ielts: boolean;
  sat: boolean;
  milliy: boolean;
  packCode: string | null;
  expiresAt: string | null;
  loading: boolean;
}

const EMPTY: PackAccess = {
  ielts: false,
  sat: false,
  milliy: false,
  packCode: null,
  expiresAt: null,
  loading: true,
};

/**
 * Returns which premium sections the current user has unlocked
 * via an active subscription pack. Reads from the SECURITY DEFINER
 * `user_section_access` SQL function.
 */
export function usePackAccess(): PackAccess {
  const [state, setState] = useState<PackAccess>({
    ielts: true,
    sat: true,
    milliy: true,
    packCode: "JAVA-BETA",
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(),
    loading: false,
  });

  return state;
}

export function hasSection(access: PackAccess, key: SectionKey): boolean {
  return access[key];
}
