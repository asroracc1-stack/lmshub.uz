import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePackAccess, SectionKey } from "@/hooks/usePackAccess";
import LockedSection from "./LockedSection";
import { Loader2 } from "lucide-react";

interface Props {
  section: SectionKey;
  title: string;
  description?: string;
  children: ReactNode;
}

/**
 * Allows children to render only when the current user has the
 * given premium section unlocked. Bypassed for non-USER roles
 * (admins, pack managers, students, teachers, etc.).
 */
export default function SectionGuard({ section, title, description, children }: Props) {
  const { role } = useAuth();
  const access = usePackAccess();

  // Only enforce for USER role; other roles see content as before.
  if (role !== "user") return <>{children}</>;

  if (access.loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!access[section]) {
    return <LockedSection title={title} description={description} />;
  }
  return <>{children}</>;
}
