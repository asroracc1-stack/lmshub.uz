import { Link } from "react-router-dom";
import { Lock, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Props {
  title: string;
  description?: string;
}

/**
 * Premium locked overlay shown to users who haven't purchased
 * a pack that unlocks this section.
 */
export default function LockedSection({ title, description }: Props) {
  return (
    <div className="mx-auto max-w-2xl py-12">
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary/10 via-background to-accent/10 p-10 text-center shadow-xl">
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 backdrop-blur">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3 w-3" />
            Premium bo'lim
          </div>
          <h2 className="mb-2 text-2xl font-bold tracking-tight">{title}</h2>
          <p className="mx-auto mb-6 max-w-md text-sm text-muted-foreground">
            {description ??
              "Bu bo'limga kirish uchun mos paketni sotib olishingiz kerak. Pack manager bilan bog'lanib paketingizni faollashtiring."}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="shadow-lg shadow-primary/30">
              <Link to="/user/packs">Paketlarni ko'rish</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/user/chat">Pack manager bilan yozish</Link>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
