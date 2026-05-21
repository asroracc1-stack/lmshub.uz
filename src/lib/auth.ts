// Username -> synthetic email helper.
// Supabase Auth requires email; we let users sign in with username only.
export const SYNTHETIC_EMAIL_DOMAIN = "asror.local";

export const usernameToEmail = (username: string) => {
  const trimmed = username.trim().toLowerCase();
  if (trimmed.includes("@")) return trimmed;
  return `${trimmed}@${SYNTHETIC_EMAIL_DOMAIN}`;
};

export type AppRole =
  | "super_admin"
  | "admin"
  | "administrator"
  | "teacher"
  | "student"
  | "user"
  | "parent"
  | "payment_manager";

export const roleHomePath: Record<AppRole, string> = {
  super_admin: "/super-admin/dashboard",
  admin: "/admin/dashboard",
  administrator: "/administrator/dashboard",
  teacher: "/teacher/dashboard",
  student: "/student/dashboard",
  user: "/user/dashboard",
  parent: "/parent/dashboard",
  payment_manager: "/pack-manager/dashboard",
};

export const roleLabel: Record<AppRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  administrator: "Administrator",
  teacher: "O'qituvchi",
  student: "Talaba",
  user: "User",
  parent: "Ota-ona",
  payment_manager: "Pack Manager",
};
