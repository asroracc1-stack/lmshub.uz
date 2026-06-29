import { useTranslation } from "react-i18next";
import { Suspense, ReactNode } from "react";
import { Loader2 } from "lucide-react";

function FullscreenLoader() {
  const { t } = useTranslation();
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
      <Loader2 className="h-7 w-7 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{t("dynamic.mylessons.yuklanmoqda")}</p>
    </div>
  );
}

export default function RouteSuspense({ children }: { children: ReactNode }) {
  return <Suspense fallback={<FullscreenLoader />}>{children}</Suspense>;
}
