import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Loader2, Crown } from "lucide-react";

export default function PMSubscriptions() {
  const { data: items = [], isLoading: loading } = useQuery({
    queryKey: ["pm-subscriptions-list"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("user_subscriptions")
        .select("*, subscription_packs(name,code,price_uzs), profiles!user_subscriptions_user_id_profiles_fkey(full_name,username,phone)")
        .order("created_at", { ascending: false }).limit(500);
      if (error) {
        toast.error(error.message);
        throw error;
      }
      return data || [];
    },
    placeholderData: (previousData) => previousData,
  });

  const now = Date.now();

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2">
        <Crown className="h-6 w-6 text-emerald-500" /> Obunalar
      </h1>
      <Card className="overflow-hidden">
        {loading ? <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div> :
         items.length === 0 ? <p className="p-12 text-center text-muted-foreground text-sm">Obunalar yo'q</p> : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Foydalanuvchi</TableHead><TableHead>Pack</TableHead>
                <TableHead>Boshlandi</TableHead><TableHead>Tugaydi</TableHead><TableHead>Holat</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {items.map((s: any) => {
                  const live = s.is_active && new Date(s.expires_at).getTime() > now;
                  return (
                    <TableRow key={s.id}>
                      <TableCell><p className="font-medium text-sm">{s.profiles?.full_name || s.profiles?.username || "—"}</p></TableCell>
                      <TableCell><Badge variant="outline">{s.subscription_packs?.name || s.subscription_packs?.code}</Badge></TableCell>
                      <TableCell className="text-xs">{format(new Date(s.starts_at), "dd.MM.yyyy")}</TableCell>
                      <TableCell className="text-xs">{format(new Date(s.expires_at), "dd.MM.yyyy")}</TableCell>
                      <TableCell>{live ? <Badge className="bg-emerald-500 text-white">Active</Badge> : <Badge variant="destructive">Expired</Badge>}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
