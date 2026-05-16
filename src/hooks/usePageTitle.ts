import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

const APP_NAME = "LMSHub";

const SEGMENT_KEYS: Record<string, string> = {
  dashboard: "nav.dashboard",
  organizations: "nav.organizations",
  users: "nav.allUsers",
  teachers: "nav.teachers",
  students: "nav.students",
  administrators: "nav.administrators",
  admins: "nav.administrators",
  finance: "nav.finance",
  payments: "nav.payments",
  payment: "nav.payment",
  calendar: "nav.calendar",
  messages: "nav.messages",
  leaderboard: "nav.leaderboard",
  mocks: "nav.mocks",
  speaking: "nav.speaking",
  packs: "nav.packs",
  subscriptions: "nav.subscriptions",
  settings: "nav.settings",
  profile: "nav.profile",
  notifications: "nav.notifications",
  subjects: "nav.subjects",
  groups: "nav.groups",
  lessons: "nav.lessons",
  grades: "nav.grades",
  rewards: "nav.rewards",
  coins: "nav.coins",
  children: "nav.myChildren",
  audit: "nav.securityCenter",
};

const ROLE_KEYS: Record<string, string> = {
  "super-admin": "roles.super_admin",
  admin: "roles.admin",
  administrator: "roles.administrator",
  teacher: "roles.teacher",
  student: "roles.student",
  parent: "roles.parent",
};

export function usePageTitle() {
  const { pathname } = useLocation();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const parts = pathname.split("/").filter(Boolean);
    const role = parts[0] ? ROLE_KEYS[parts[0]] : undefined;
    const seg = parts[1] ? SEGMENT_KEYS[parts[1]] : undefined;
    const page = seg ? t(seg) : role ? t(role) : APP_NAME;
    const suffix = role && seg ? ` · ${t(role)}` : "";
    document.title = `${page}${suffix} | ${APP_NAME}`;
  }, [pathname, t, i18n.language]);
}
